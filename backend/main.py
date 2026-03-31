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

BASE = r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets"


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



# -------------------------
# LOAD DATA INTO MEMORY
# -------------------------

flood_df = pd.read_csv(FLOOD_INTENSITY)

rainfall_df = pd.read_csv(RAINFALL_DATA)

with open(GRAPH_DATA) as f:
    graph_data = json.load(f)

with open(DISTRICTS_DATA) as f:
    districts_data = json.load(f)



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