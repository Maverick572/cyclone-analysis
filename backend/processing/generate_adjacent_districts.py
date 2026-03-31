import json
import geopandas as gpd
import numpy as np
import os


GEOJSON_FILE = r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\district_shapes.json"

REGION_FILE = r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\regions\amphan_districts.json"

OUTPUT_FILE = r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\regions\amphan_adjacency.json"


# buffer distance for adjacency (meters)
BUFFER_METERS = 5000

# distance tolerance for matching region districts
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


# -------------------------
# LOAD SHAPES
# -------------------------

districts = gpd.read_file(GEOJSON_FILE)


# convert to metric CRS for geometry ops
districts_metric = districts.to_crs("EPSG:3857")

districts_latlon = districts.to_crs("EPSG:4326")


districts_metric["district"] = (
    districts_metric["NAME_2"]
    .str.replace(" ", "", regex=False)
    .str.replace("-", "", regex=False)
    .str.lower()
)


# centroid using metric CRS (accurate)
centroids = districts_metric.geometry.centroid

districts_metric["lon"] = centroids.to_crs("EPSG:4326").x

districts_metric["lat"] = centroids.to_crs("EPSG:4326").y


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
# FILTER REGION DISTRICTS
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


    possible_matches = districts_metric.iloc[
        possible_matches_index
    ]


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

os.makedirs(
    r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\regions",
    exist_ok=True
)


with open(OUTPUT_FILE, "w") as f:
    json.dump(adjacency, f, indent=2)


# -------------------------
# SUMMARY
# -------------------------

print("\nadjacency generated")

print("districts:", len(adjacency))

print("\nsample:")

print(list(adjacency.items())[:5])