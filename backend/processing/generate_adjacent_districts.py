import json
import geopandas as gpd
import numpy as np
import os
import sys


# -------------------------
# CYCLONE INPUT
# -------------------------

CYCLONE_NAME = sys.argv[1] if len(sys.argv) > 1 else "amphan"


# -------------------------
# PATHS
# -------------------------

BASE_DIR = r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets"

GEOJSON_FILE = os.path.join(BASE_DIR, "district_shapes.json")

REGION_FILE = os.path.join(
    BASE_DIR,
    "regions",
    f"{CYCLONE_NAME}_districts.json"
)

OUTPUT_FILE = os.path.join(
    BASE_DIR,
    "regions",
    f"{CYCLONE_NAME}_adjacency.json"
)


# -------------------------
# CONFIG
# -------------------------

BUFFER_METERS = 5000
MAX_MATCH_DISTANCE_KM = 80


# -------------------------
# LOAD REGION DATA
# -------------------------

with open(REGION_FILE) as f:
    region_data = json.load(f)


region_lookup = {
    r["district"]: {
        "lat": r["lat"],
        "lon": r["lon"]
    }
    for r in region_data
}

region_districts = set(region_lookup.keys())

print(f"\nCYCLONE: {CYCLONE_NAME}")
print("region districts:", len(region_districts))


# -------------------------
# LOAD SHAPES
# -------------------------

districts = gpd.read_file(GEOJSON_FILE)

districts_metric = districts.to_crs("EPSG:3857")
districts_latlon = districts.to_crs("EPSG:4326")  # (not used, but kept if needed)


districts_metric["district"] = (
    districts_metric["NAME_2"]
    .str.replace(" ", "", regex=False)
    .str.replace("-", "", regex=False)
    .str.lower()
)


# -------------------------
# CENTROIDS (ACCURATE)
# -------------------------

centroids = districts_metric.geometry.centroid

centroids_latlon = centroids.to_crs("EPSG:4326")

districts_metric["lon"] = centroids_latlon.x
districts_metric["lat"] = centroids_latlon.y


# -------------------------
# HAVERSINE
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
# FILTER VALID DISTRICTS
# -------------------------

valid_rows = []

for _, row in districts_metric.iterrows():

    name = row["district"]

    if name not in region_lookup:
        valid_rows.append(False)
        continue

    ref = region_lookup[name]

    dist = haversine_km(
        row["lon"],
        row["lat"],
        ref["lon"],
        ref["lat"]
    )

    valid_rows.append(dist < MAX_MATCH_DISTANCE_KM)


districts_metric = districts_metric[valid_rows]

print("districts used:", len(districts_metric))


# -------------------------
# BUILD SPATIAL INDEX
# -------------------------

districts_metric["geometry_buffered"] = (
    districts_metric.geometry.buffer(BUFFER_METERS)
)

spatial_index = districts_metric.sindex


# -------------------------
# BUILD ADJACENCY
# -------------------------

adjacency = {}

for idx, row in districts_metric.iterrows():

    district_name = row["district"]
    geom = row["geometry_buffered"]

    possible_matches_index = list(
        spatial_index.intersection(geom.bounds)
    )

    possible_matches = districts_metric.iloc[possible_matches_index]

    neighbors = []

    for _, candidate in possible_matches.iterrows():

        if candidate["district"] == district_name:
            continue

        if geom.intersects(candidate.geometry):
            neighbors.append(candidate["district"])

    adjacency[district_name] = sorted(set(neighbors))


# -------------------------
# SAVE
# -------------------------

os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

with open(OUTPUT_FILE, "w") as f:
    json.dump(adjacency, f, indent=2)


# -------------------------
# SUMMARY
# -------------------------

print("\nadjacency generated")
print("districts:", len(adjacency))

print("\nsample:")
print(list(adjacency.items())[:5])