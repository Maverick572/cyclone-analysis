import geopandas as gpd
import json
import numpy as np
import os


# -------------------------
# FILE PATHS
# -------------------------

GEOJSON_FILE = r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\district_shapes.json"

OUTPUT_FILE = r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\regions\amphan_districts.json"


# -------------------------
# CIRCULAR REGION
# -------------------------

CENTER_LON = 88.5
CENTER_LAT = 23.5

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


# sort by distance (closest to cyclone center first)

region_data = sorted(
    region_data,
    key=lambda x: x["distance_km"]
)


# -------------------------
# SAVE FILE
# -------------------------

os.makedirs(
    r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\regions",
    exist_ok=True
)

with open(OUTPUT_FILE, "w") as f:

    json.dump(

        region_data,

        f,

        indent=2

    )


# -------------------------
# DEBUG OUTPUT
# -------------------------

print("\nDISTRICT COUNT:")
print(len(region_data))

print("\nSAVED TO:")
print(OUTPUT_FILE)

print("\nSAMPLE:")
print(region_data[:10])


print("\nFARTHEST INCLUDED:")
print(region_data[-10:])