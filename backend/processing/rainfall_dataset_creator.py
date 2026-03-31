import os
import json
import numpy as np
import pandas as pd
import xarray as xr
import geopandas as gpd
from rasterstats import zonal_stats
import rioxarray


# -----------------------------
# CONFIG
# -----------------------------

CYCLONE_NAME = "amphan"

RAINFALL_DIR = rf"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\rainfall\{CYCLONE_NAME}"

GEOJSON_FILE = r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\district_shapes.json"

REGION_FILE = r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\regions\amphan_districts.json"

OUTPUT_FILE = rf"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\rainfall_processed\{CYCLONE_NAME}_rainfall.csv"


MAX_MATCH_DISTANCE_KM = 80


# -----------------------------
# LOAD REGION JSON
# -----------------------------

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

print("districts in region json:", len(region_districts))


# -----------------------------
# LOAD DISTRICT SHAPES
# -----------------------------

districts = gpd.read_file(GEOJSON_FILE)

districts = districts.to_crs("EPSG:4326")

districts["district"] = (
    districts["NAME_2"]
    .str.replace(" ", "", regex=False)
    .str.replace("-", "", regex=False)
    .str.lower()
)


# compute centroids (used only for geo validation)
districts["centroid"] = districts.geometry.centroid

districts["lon"] = districts.centroid.x

districts["lat"] = districts.centroid.y


# -----------------------------
# HAVERSINE DISTANCE
# -----------------------------

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


# -----------------------------
# FILTER DISTRICTS USING NAME + LOCATION
# -----------------------------

valid_rows = []

for _, row in districts.iterrows():

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


districts = districts[valid_rows]

print("district polygons used:", len(districts))


# -----------------------------
# PROCESS RAINFALL FILES
# -----------------------------

records = []

files = sorted(os.listdir(RAINFALL_DIR))


for file in files:

    if not file.endswith(".nc4"):
        continue


    print("processing", file)


    # extract date from filename
    date_str = file.split(".")[4][:8]

    date = pd.to_datetime(
        date_str,
        format="%Y%m%d"
    )


    ds = xr.open_dataset(
        os.path.join(RAINFALL_DIR, file)
    )


    rainfall = ds["precipitation"]

    rainfall = rainfall.isel(time=0)

    rainfall = rainfall.transpose("lat", "lon")

    rainfall = rainfall.sortby("lat", ascending=False)


    rainfall = rainfall.rio.set_spatial_dims(
        x_dim="lon",
        y_dim="lat"
    )


    rainfall = rainfall.rio.write_crs("EPSG:4326")


    stats = zonal_stats(

        districts,

        rainfall.values,

        affine=rainfall.rio.transform(),

        stats="mean",

        nodata=float("nan")

    )


    for i, stat in enumerate(stats):

        value = stat["mean"]

        if value is None or np.isnan(value) or np.isinf(value):
            value = 0


        records.append({

            "date": date,

            "district": districts.iloc[i]["district"],

            "rainfall_mm": float(value)

        })


# -----------------------------
# CREATE DATAFRAME
# -----------------------------

df = pd.DataFrame(records)

df = df.sort_values(["district", "date"])


# -----------------------------
# FINAL SANITIZATION
# -----------------------------

df["rainfall_mm"] = df["rainfall_mm"].replace(

    [np.inf, -np.inf],

    0

)

df["rainfall_mm"] = df["rainfall_mm"].fillna(0)


# -----------------------------
# SAVE CSV
# -----------------------------

os.makedirs(

    r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\rainfall_processed",

    exist_ok=True

)


df.to_csv(

    OUTPUT_FILE,

    index=False

)


# -----------------------------
# SUMMARY
# -----------------------------

print("\ncreated rainfall dataset:")

print(OUTPUT_FILE)

print("\nrows:", len(df))

print("\nunique districts:", df["district"].nunique())

print("\nmin rainfall:", df["rainfall_mm"].min())

print("max rainfall:", df["rainfall_mm"].max())

print("zero values:", (df["rainfall_mm"] == 0).sum())