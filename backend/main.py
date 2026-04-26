from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import json
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE = os.path.join(os.path.dirname(__file__), "datasets")
ML_OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "ML", "outputs")

# -------------------------
# CACHE
# -------------------------

_cache = {}


def load_cyclone_data(cyclone: str):
    cyclone = cyclone.lower()

    if cyclone in _cache:
        return _cache[cyclone]

    try:
        data = {
            "flood_df": pd.read_csv(os.path.join(BASE, "flood_labels", f"{cyclone}_flood_intensity.csv")),
            "rainfall_df": pd.read_csv(os.path.join(BASE, "rainfall_processed", f"{cyclone}_rainfall.csv")),
            "graph": json.load(open(os.path.join(BASE, "graphs", f"{cyclone}_paths_by_origin.json"))),
            "districts": json.load(open(os.path.join(BASE, "regions", f"{cyclone}_districts.json"))),
            "track": json.load(open(os.path.join(BASE, "cyclone_tracks", f"{cyclone}_track.json"))),
            "flood_risk": json.load(open(os.path.join(BASE, "flood_risk_processed", f"{cyclone}_flood_risk.json")))
        }

        _cache[cyclone] = data
        return data

    except FileNotFoundError:
        return None


# -------------------------
# ROOT
# -------------------------

@app.get("/")
def root():
    return {"message": "Cyclone Flood API running"}


# -------------------------
# MAIN DATA
# -------------------------

@app.get("/flood-intensity/{cyclone}")
def get_flood_intensity(cyclone: str):
    data = load_cyclone_data(cyclone)
    if not data:
        return {"error": f"No data for cyclone '{cyclone}'"}
    return data["flood_df"].to_dict(orient="records")


@app.get("/rainfall/{cyclone}")
def get_rainfall(cyclone: str):
    data = load_cyclone_data(cyclone)
    if not data:
        return {"error": f"No data for cyclone '{cyclone}'"}
    return data["rainfall_df"].to_dict(orient="records")


@app.get("/graph/{cyclone}")
def get_graph(cyclone: str):
    data = load_cyclone_data(cyclone)
    if not data:
        return {"error": f"No data for cyclone '{cyclone}'"}
    return data["graph"]


@app.get("/districts/{cyclone}")
def get_districts(cyclone: str):
    data = load_cyclone_data(cyclone)
    if not data:
        return {"error": f"No data for cyclone '{cyclone}'"}
    return data["districts"]


@app.get("/cyclone-track/{cyclone}")
def get_track(cyclone: str):
    data = load_cyclone_data(cyclone)
    if not data:
        return {"error": f"No data for cyclone '{cyclone}'"}
    return data["track"]


@app.get("/flood-risk/{cyclone}")
def get_flood_risk(cyclone: str):
    data = load_cyclone_data(cyclone)
    if not data:
        return {"error": f"No data for cyclone '{cyclone}'"}
    return data["flood_risk"]


# -------------------------
# FILTERED ROUTES
# -------------------------

@app.get("/flood-intensity/{cyclone}/{district}")
def flood_by_district(cyclone: str, district: str):
    data = load_cyclone_data(cyclone)
    if not data:
        return {"error": f"No data for cyclone '{cyclone}'"}

    df = data["flood_df"]
    df = df[df["district"] == district.lower()]
    return df.to_dict(orient="records")


@app.get("/rainfall/{cyclone}/{district}")
def rainfall_by_district(cyclone: str, district: str):
    data = load_cyclone_data(cyclone)
    if not data:
        return {"error": f"No data for cyclone '{cyclone}'"}

    df = data["rainfall_df"]
    df = df[df["district"] == district.lower()]
    return df.to_dict(orient="records")


@app.get("/graph/{cyclone}/{district}")
def graph_from_district(cyclone: str, district: str):
    data = load_cyclone_data(cyclone)
    if not data:
        return {"error": f"No data for cyclone '{cyclone}'"}

    return data["graph"].get(district.lower(), [])


@app.get("/flood-risk/{cyclone}/{district}")
def flood_risk_by_district(cyclone: str, district: str):
    data = load_cyclone_data(cyclone)
    if not data:
        return {"error": f"No data for cyclone '{cyclone}'"}

    return [
        r for r in data["flood_risk"]
        if r["district"] == district.lower()
    ]


# -------------------------
# ML INSIGHTS
# -------------------------

_insights_cache = {}


@app.get("/insights/{cyclone}")
def get_insights(cyclone: str):
    cyclone = cyclone.lower()

    if cyclone not in _insights_cache:
        filepath = os.path.join(
            ML_OUTPUT_DIR,
            f"hybrid_insights_{cyclone}.json"
        )

        if not os.path.exists(filepath):
            return {"error": f"No insights found for '{cyclone}'"}

        with open(filepath) as f:
            _insights_cache[cyclone] = json.load(f)

    return _insights_cache[cyclone]


@app.get("/insights/{cyclone}/{district}")
def get_district_insights(cyclone: str, district: str):
    data = get_insights(cyclone)

    if "error" in data:
        return data

    district = district.lower().replace(" ", "").replace("-", "")

    return data.get(
        district,
        {"error": f"District '{district}' not found"}
    )

# -------------------------
# DISTRICT METADATA
# -------------------------

DISTRICT_METADATA_FILE = os.path.join(
    BASE,
    "district_metadata.csv"
)

_district_metadata_cache = None


@app.get("/district-metadata")
def get_district_metadata():

    global _district_metadata_cache

    try:
        if _district_metadata_cache is None:
            df = pd.read_csv(DISTRICT_METADATA_FILE)

            # ensure district is normalized (just in case)
            df["district"] = (
                df["district"]
                .astype(str)
                .str.lower()
                .str.replace(" ", "", regex=False)
                .str.replace("-", "", regex=False)
            )

            _district_metadata_cache = df.to_dict(orient="records")

        return _district_metadata_cache

    except FileNotFoundError:
        return {"error": "district_metadata.csv not found"}