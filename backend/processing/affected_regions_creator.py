import geopandas as gpd
import json
import numpy as np
import os
import sys


# -------------------------
# CYCLONE INPUT
# -------------------------

CYCLONE_NAME = sys.argv[1] if len(sys.argv) > 1 else "amphan"


# -------------------------
# FILE PATHS
# -------------------------

BASE_DIR = r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets"

GEOJSON_FILE = os.path.join(BASE_DIR, "district_shapes.json")

OUTPUT_FILE = os.path.join(
    BASE_DIR,
    "regions",
    f"{CYCLONE_NAME}_districts.json"
)


# -------------------------
# CIRCULAR REGION CONFIG
# -------------------------

# 👇 Define per cyclone (you can expand this later)
CYCLONE_CENTERS = {
    "amphan":  (88.5, 23.5),
    "tauktae": (72.5, 16.5),
    "fani":    (86.0, 19.8),
}

if CYCLONE_NAME not in CYCLONE_CENTERS:
    raise ValueError(f"Center not defined for cyclone: {CYCLONE_NAME}")

CENTER_LON, CENTER_LAT = CYCLONE_CENTERS[CYCLONE_NAME]

RADIUS_KM = 1000


# -------------------------
# LOAD DISTRICTS
# -------------------------

districts = gpd.read_file(GEOJSON_FILE)
districts = districts.to_crs("EPSG:4326")


# -------------------------
# STANDARDIZE NAMES
# -------------------------

districts["district"] = (
    districts["NAME_2"]
    .str.replace(" ", "", regex=False)
    .str.replace("-", "", regex=False)
    .str.lower()
)

districts["state"] = (
    districts["NAME_1"]
    .str.replace(" ", "", regex=False)
    .str.replace("-", "", regex=False)
    .str.lower()
)

districts["district_key"] = (
    districts["state"] + "_" + districts["district"]
)


# -------------------------
# COMPUTE CENTROIDS
# -------------------------

districts["centroid"] = districts.geometry.centroid
districts["lon"] = districts.centroid.x
districts["lat"] = districts.centroid.y


# -------------------------
# HAVERSINE DISTANCE
# -------------------------

def haversine_km(lon1, lat1, lon2, lat2):

    R = 6371

    lon1, lat1, lon2, lat2 = map(
        np.radians,
        [lon1, lat1, lon2, lat2]
    )

    dlon = lon2 - lon1
    dlat = lat2 - lat1

    a = (
        np.sin(dlat/2)**2
        + np.cos(lat1)
        * np.cos(lat2)
        * np.sin(dlon/2)**2
    )

    c = 2 * np.arcsin(np.sqrt(a))

    return R * c


# -------------------------
# FILTER REGION
# -------------------------

districts["distance_km"] = haversine_km(
    CENTER_LON,
    CENTER_LAT,
    districts["lon"],
    districts["lat"]
)

affected = districts[
    districts["distance_km"] <= RADIUS_KM
]


# -------------------------
# FORMAT OUTPUT
# -------------------------

region_data = []

for _, row in affected.iterrows():

    region_data.append({
        "district": row["district"],
        "state": row["state"],
        "district_key": row["district_key"],
        "lat": round(row["lat"], 5),
        "lon": round(row["lon"], 5),
        "distance_km": round(row["distance_km"], 2)
    })


# sort by distance
region_data = sorted(region_data, key=lambda x: x["distance_km"])


# -------------------------
# SAVE FILE
# -------------------------

os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

with open(OUTPUT_FILE, "w") as f:
    json.dump(region_data, f, indent=2)


# -------------------------
# DEBUG OUTPUT
# -------------------------

print(f"\nCYCLONE: {CYCLONE_NAME}")

print("\nDISTRICT COUNT:")
print(len(region_data))

print("\nSAVED TO:")
print(OUTPUT_FILE)

print("\nSAMPLE:")
print(region_data[:10])

print("\nFARTHEST INCLUDED:")
print(region_data[-10:])