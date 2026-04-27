"""
Hybrid ML & Analytics Engine
=============================
Computes three analytical layers on top of existing pipeline outputs:
    1. Consecutive Rainy Days  — rolling count of days with rainfall > 5mm
    2. Spatial SPI (Z-Score)   — cross-district standardized precipitation per day
    3. Isolation Forest        — unsupervised multivariate anomaly detection

Outputs a nested JSON for O(1) frontend lookup:
    { district: { date: { metrics... } } }

This module is fully isolated — it reads from the existing datasets
and writes to backend/ML/outputs/ without modifying any prior pipeline.
"""

import os
import json
import numpy as np
import pandas as pd
from scipy.stats import zscore
from sklearn.ensemble import IsolationForest


# ─────────────────────────────────────────────
# PATH CONFIGURATION
# ─────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.dirname(__file__))          # backend/
DATASETS_DIR = os.path.join(BASE_DIR, "datasets")
OUTPUT_DIR = os.path.join(BASE_DIR, "ML", "outputs")


def _normalize_name(name: str) -> str:
    """Standardize district names: lowercase, strip spaces & hyphens."""
    return (
        name.lower()
        .replace(" ", "")
        .replace("-", "")
    )


# ─────────────────────────────────────────────
# DATA LOADING
# ─────────────────────────────────────────────

def _load_rainfall(cyclone: str) -> pd.DataFrame:
    """Load the processed rainfall CSV for a given cyclone."""

    path = os.path.join(
        DATASETS_DIR,
        "rainfall_processed",
        f"{cyclone}_rainfall.csv"
    )

    df = pd.read_csv(path)
    df["date"] = pd.to_datetime(df["date"])
    df["district"] = df["district"].apply(_normalize_name)

    return df.sort_values(["district", "date"]).reset_index(drop=True)


def _load_flood_risk() -> pd.DataFrame:
    """Load the historical district flood risk dataset."""

    path = os.path.join(DATASETS_DIR, "district_flood_risk.csv")

    df = pd.read_csv(path)
    df["district"] = df["district"].apply(_normalize_name)

    return df


# ─────────────────────────────────────────────
# ANALYTICS 1: CONSECUTIVE RAINY DAYS
# ─────────────────────────────────────────────

RAIN_THRESHOLD_MM = 5.0


def _compute_consecutive_rainy_days(df: pd.DataFrame) -> pd.DataFrame:
    """
    For each district's sorted timeline, count consecutive days
    where rainfall_mm > 5.0 mm. The counter resets to 0 on any
    dry day.

    Returns the original dataframe with a new column:
        'consecutive_rainy_days' (int)
    """

    results = []

    for district, group in df.groupby("district"):

        group = group.sort_values("date").copy()

        streak = 0
        streaks = []

        for rain in group["rainfall_mm"]:

            if rain > RAIN_THRESHOLD_MM:
                streak += 1
            else:
                streak = 0

            streaks.append(streak)

        group["consecutive_rainy_days"] = streaks
        results.append(group)

    return pd.concat(results, ignore_index=True)


# ─────────────────────────────────────────────
# ANALYTICS 2: SPATIAL SPI (Z-SCORE)
# ─────────────────────────────────────────────

def _compute_spatial_spi(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute Spatial SPI as a within-day Z-score across all districts.

    For each date, the rainfall_mm distribution across ~100 districts
    is standardized. A score of +2.0 means the district received
    rainfall 2 standard deviations above the national mean for that day.

    If a day has zero variance (every district identical), SPI = 0.

    Returns the dataframe with a new column:
        'spatial_spi' (float)
    """

    def safe_zscore(series):
        """Z-score that handles zero-variance gracefully."""
        if series.std() == 0:
            return pd.Series(0.0, index=series.index)
        return pd.Series(
            zscore(series, nan_policy="omit"),
            index=series.index
        )

    df["spatial_spi"] = (
        df.groupby("date")["rainfall_mm"]
          .transform(safe_zscore)
    )

    # safety net for any residual NaN from edge cases
    df["spatial_spi"] = df["spatial_spi"].fillna(0.0)

    return df


# ─────────────────────────────────────────────
# ML: ISOLATION FOREST ANOMALY DETECTION
# ─────────────────────────────────────────────

CONTAMINATION = 0.05    # expect ~5% of district-day pairs to be anomalous
RANDOM_STATE = 42


def _run_isolation_forest(
    df: pd.DataFrame,
    risk_df: pd.DataFrame
) -> pd.DataFrame:
    """
    Train an Isolation Forest on the merged feature matrix:
        [rainfall_mm, spatial_spi, consecutive_rainy_days,
         percent_flooded_area, population]

    Missing risk values are median-imputed to avoid data loss.

    Returns the dataframe with two new columns:
        'is_ml_anomaly'      (bool)   — True if flagged as anomaly
        'ml_severity_score'  (float)  — raw anomaly score (lower = more anomalous)
    """

    # select only the columns we need from risk data
    risk_cols = ["district", "percent_flooded_area", "population"]

    risk_subset = risk_df[risk_cols].copy()

    # deduplicate — keep first occurrence of each normalized district
    risk_subset = risk_subset.drop_duplicates(subset="district", keep="first")

    # merge rainfall analytics with static risk features
    merged = df.merge(risk_subset, on="district", how="left")

    # ── MEDIAN IMPUTATION ──
    # districts present in rainfall but absent in flood_risk get NaN
    for col in ["percent_flooded_area", "population"]:
        median_val = merged[col].median()
        merged[col] = merged[col].fillna(median_val)

    # ── FEATURE MATRIX ──
    feature_columns = [
        "rainfall_mm",
        "spatial_spi",
        "consecutive_rainy_days",
        "percent_flooded_area",
        "population"
    ]

    X = merged[feature_columns].values

    # ── ISOLATION FOREST ──
    model = IsolationForest(
        contamination=CONTAMINATION,
        random_state=RANDOM_STATE,
        n_estimators=100
    )

    model.fit(X)

    # predictions: 1 = inlier, -1 = anomaly
    predictions = model.predict(X)

    # raw anomaly scores: more negative = more anomalous
    scores = model.decision_function(X)

    merged["is_ml_anomaly"] = predictions == -1

    # normalize score to [0, 1] where 1 = most anomalous
    score_min = scores.min()
    score_max = scores.max()

    if score_max - score_min > 0:
        merged["ml_severity_score"] = 1.0 - (
            (scores - score_min) / (score_max - score_min)
        )
    else:
        merged["ml_severity_score"] = 0.0

    # round for clean JSON output
    merged["ml_severity_score"] = merged["ml_severity_score"].round(4)

    return merged


# ─────────────────────────────────────────────
# OUTPUT: NESTED JSON ASSEMBLY
# ─────────────────────────────────────────────

def _build_output_payload(df: pd.DataFrame) -> dict:
    """
    Assemble the final nested dictionary for O(1) lookup:
        { district: { date: { metrics } } }
    """

    payload = {}

    for _, row in df.iterrows():

        district = row["district"]
        date_str = row["date"].strftime("%Y-%m-%d")

        if district not in payload:
            payload[district] = {}

        payload[district][date_str] = {
            "rainfall_mm":            round(float(row["rainfall_mm"]), 4),
            "spatial_spi":            round(float(row["spatial_spi"]), 4),
            "consecutive_rainy_days": int(row["consecutive_rainy_days"]),
            "is_ml_anomaly":          bool(row["is_ml_anomaly"]),
            "ml_severity_score":      float(row["ml_severity_score"])
        }

    return payload


# ─────────────────────────────────────────────
# MASTER EXECUTION
# ─────────────────────────────────────────────

def run_engine(cyclone: str) -> dict:
    """
    Execute the full Hybrid Analytics pipeline for a given cyclone.

    Steps:
        1. Load rainfall + flood risk data
        2. Compute consecutive rainy days
        3. Compute spatial SPI (Z-scores)
        4. Run Isolation Forest anomaly detection
        5. Assemble and save output JSON

    Returns:
        The nested insights dictionary.
    """

    print(f"\n{'='*60}")
    print(f"  HYBRID ML ENGINE — {cyclone.upper()}")
    print(f"{'='*60}\n")

    # ── STEP 1: LOAD ──
    print("[1/5] Loading datasets...")
    rainfall_df = _load_rainfall(cyclone)
    risk_df = _load_flood_risk()

    print(f"      Rainfall rows: {len(rainfall_df)}")
    print(f"      Risk districts: {len(risk_df)}")

    # ── STEP 2: CONSECUTIVE RAINY DAYS ──
    print("[2/5] Computing consecutive rainy days...")
    rainfall_df = _compute_consecutive_rainy_days(rainfall_df)

    max_streak = rainfall_df["consecutive_rainy_days"].max()
    print(f"      Max streak: {max_streak} days")

    # ── STEP 3: SPATIAL SPI ──
    print("[3/5] Computing Spatial SPI (Z-scores)...")
    rainfall_df = _compute_spatial_spi(rainfall_df)

    spi_min = rainfall_df["spatial_spi"].min()
    spi_max = rainfall_df["spatial_spi"].max()
    print(f"      SPI range: [{spi_min:.2f}, {spi_max:.2f}]")

    # ── STEP 4: ISOLATION FOREST ──
    print("[4/5] Training Isolation Forest...")
    result_df = _run_isolation_forest(rainfall_df, risk_df)

    n_anomalies = result_df["is_ml_anomaly"].sum()
    total_rows = len(result_df)
    print(f"      Anomalies detected: {n_anomalies}/{total_rows}")

    # ── STEP 5: SAVE OUTPUT ──
    print("[5/5] Assembling output JSON...")
    payload = _build_output_payload(result_df)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    output_path = os.path.join(
        OUTPUT_DIR,
        f"hybrid_insights_{cyclone}.json"
    )

    with open(output_path, "w") as f:
        json.dump(payload, f, indent=2)

    n_districts = len(payload)
    print(f"      Districts in output: {n_districts}")
    print(f"      Saved to: {output_path}")

    print(f"\n{'='*60}")
    print(f"  ENGINE COMPLETE")
    print(f"{'='*60}\n")

    return payload


# ─────────────────────────────────────────────
# CLI ENTRY POINT
# ─────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("\nUsage: python filename.py <cyclone_name>")
        print("Example: python filename.py amphan\n")
        sys.exit(1)

    cyclone_name = sys.argv[1].lower().strip()

    # expected rainfall file path
    rainfall_path = os.path.join(
        DATASETS_DIR,
        "rainfall_processed",
        f"{cyclone_name}_rainfall.csv"
    )

    # check if file exists BEFORE running
    if not os.path.exists(rainfall_path):
        print(f"\n❌ ERROR: File not found:")
        print(f"   {rainfall_path}")
        print("\nMake sure your file is named like:")
        print(f"   {cyclone_name}_rainfall.csv\n")
        sys.exit(1)

    # run pipeline
    result = run_engine(cyclone_name)

    # sample preview
    sample_district = list(result.keys())[0]
    sample_date = list(result[sample_district].keys())[0]

    print(f"\nSample output for '{sample_district}' on {sample_date}:")
    print(json.dumps(result[sample_district][sample_date], indent=2))
