from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import json
import os


app = FastAPI()


# allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------
# FILE PATHS
# -------------------------

BASE = os.path.join(os.path.dirname(__file__), "datasets")


FLOOD_INTENSITY = os.path.join(
    BASE,
    "flood_labels",
    "amphan_flood_intensity.csv"
)

RAINFALL_DATA = os.path.join(
    BASE,
    "rainfall_processed",
    "amphan_rainfall.csv"
)

GRAPH_DATA = os.path.join(
    BASE,
    "graphs",
    "amphan_paths_by_origin.json"
)

DISTRICTS_DATA = os.path.join(
    BASE,
    "regions",
    "amphan_districts.json"
)

CYCLONE_TRACK = os.path.join(
    BASE,
    "cyclone_tracks",
    "amphan_track.json"
)

FLOOD_RISK = os.path.join(
    BASE,
    "flood_risk_processed",
    "amphan_flood_risk.json"
)

# -------------------------
# LOAD DATA INTO MEMORY
# -------------------------

flood_df = pd.read_csv(FLOOD_INTENSITY)

rainfall_df = pd.read_csv(RAINFALL_DATA)

with open(GRAPH_DATA) as f:
    graph_data = json.load(f)

with open(DISTRICTS_DATA) as f:
    districts_data = json.load(f)

with open(CYCLONE_TRACK) as f:
    cyclone_track = json.load(f)

with open(FLOOD_RISK) as f:
    flood_risk_data = json.load(f)

# -------------------------
# ROOT
# -------------------------

@app.get("/")
def root():
    return {
        "message": "Cyclone Flood API running"
    }



# -------------------------
# MAIN DATASETS
# -------------------------

@app.get("/flood-intensity/amphan")
def get_flood_intensity():
    return flood_df.to_dict(orient="records")



@app.get("/rainfall/amphan")
def get_rainfall():
    return rainfall_df.to_dict(orient="records")



@app.get("/graph/amphan")
def get_graph():
    return graph_data



@app.get("/districts/amphan")
def get_districts():
    return districts_data


@app.get("/cyclone-track/amphan")
def get_cyclone_track():
    return cyclone_track

# -------------------------
# FILTERED ROUTES
# -------------------------

@app.get("/flood-intensity/amphan/{district}")
def flood_by_district(district: str):

    df = flood_df[
        flood_df["district"] == district.lower()
    ]

    return df.to_dict(orient="records")



@app.get("/rainfall/amphan/{district}")
def rainfall_by_district(district: str):

    df = rainfall_df[
        rainfall_df["district"] == district.lower()
    ]

    return df.to_dict(orient="records")



@app.get("/graph/amphan/{district}")
def graph_from_district(district: str):

    return graph_data.get(
        district.lower(),
        []
    )


@app.get("/flood-risk/amphan")
def get_flood_risk():
    return flood_risk_data

@app.get("/flood-risk/amphan/{district}")
def flood_risk_by_district(district: str):
    return [
        r for r in flood_risk_data
        if r["district"].lower() == district.lower()
    ]


# -------------------------
# ML INSIGHTS ENGINE
# -------------------------

ML_OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "ML", "outputs")

# in-memory cache for loaded insights
_insights_cache = {}


@app.get("/insights/{cyclone}")
def get_insights(cyclone: str):
    """
    Serve the hybrid ML + analytics insights for a given cyclone.
    Returns nested JSON: { district: { date: { metrics } } }
    """
    cyclone = cyclone.lower()

    if cyclone not in _insights_cache:
        filepath = os.path.join(
            ML_OUTPUT_DIR,
            f"hybrid_insights_{cyclone}.json"
        )
        if not os.path.exists(filepath):
            return {"error": f"No insights found for '{cyclone}'. Run the ML engine first."}
        with open(filepath) as f:
            _insights_cache[cyclone] = json.load(f)

    return _insights_cache[cyclone]


@app.get("/insights/{cyclone}/{district}")
def get_district_insights(cyclone: str, district: str):
    """
    Serve insights for a single district within a cyclone.
    """
    all_data = get_insights(cyclone)

    if "error" in all_data:
        return all_data

    district = district.lower().replace(" ", "").replace("-", "")

    if district not in all_data:
        return {"error": f"District '{district}' not found in {cyclone} insights."}

    return all_data[district]