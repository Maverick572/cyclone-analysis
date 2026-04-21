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

THRESHOLD_FILE = r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\district_rainfall_thresholds.csv"

REGION_FILE = r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\regions\amphan_districts.json"

OUTPUT_FILE = rf"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\flood_labels\{CYCLONE_NAME}_flood_intensity.csv"


# distance tolerance between expected centroid and shapefile centroid
MAX_MATCH_DISTANCE_KM = 80


# -----------------------------
# LOAD REGION DATA (WITH LAT LON)
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

print("districts in region file:", len(region_districts))


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

districts["centroid"] = districts.geometry.centroid

districts["lon"] = districts.centroid.x

districts["lat"] = districts.centroid.y


# -----------------------------
# DISTANCE FUNCTION
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
# FILTER DISTRICTS USING NAME + GEO MATCH
# -----------------------------

valid_rows = []

distances = []

for _, row in districts.iterrows():

    name = row["district"]

    if name not in region_lookup:

        valid_rows.append(False)

        distances.append(None)

        continue


    ref = region_lookup[name]


    dist = haversine_km(

        row["lon"],

        row["lat"],

        ref["lon"],

        ref["lat"]

    )


    if dist < MAX_MATCH_DISTANCE_KM:

        valid_rows.append(True)

        distances.append(dist)

    else:

        valid_rows.append(False)

        distances.append(dist)


districts["match_distance_km"] = distances

districts = districts[valid_rows]


print("districts after geo validation:", len(districts))


# -----------------------------
# LOAD THRESHOLDS
# -----------------------------

thresholds = pd.read_csv(THRESHOLD_FILE)

thresholds = thresholds[

    thresholds["district"].isin(region_districts)

]


# -----------------------------
# PROCESS RAINFALL FILES
# -----------------------------

records = []

files = sorted(os.listdir(RAINFALL_DIR))


for file in files:

    if not file.endswith(".nc4"):

        continue


    print("processing", file)


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

        records.append({

            "date": date,

            "district": districts.iloc[i]["district"],

            "rainfall_mm": stat["mean"]

        })


# -----------------------------
# CREATE DATAFRAME
# -----------------------------

df = pd.DataFrame(records)

df = df.sort_values(["district", "date"])


# CLEAN rainfall values early
df["rainfall_mm"] = df["rainfall_mm"].replace([np.inf, -np.inf], np.nan)
df["rainfall_mm"] = df["rainfall_mm"].fillna(0)


# -----------------------------
# 3 DAY ROLLING RAINFALL
# -----------------------------

df["rain_3day_mm"] = (

    df.groupby("district")["rainfall_mm"]

      .rolling(3)

      .sum()

      .reset_index(level=0, drop=True)

)


# -----------------------------
# MERGE THRESHOLDS
# -----------------------------

df = df.merge(

    thresholds,

    on="district"

)


# -----------------------------
# FLOOD INTENSITY
# -----------------------------

df["excess_1day"] = (
    df["rainfall_mm"]
    - df["threshold_1day_mm"]
).clip(lower=0)


df["excess_3day"] = (
    df["rain_3day_mm"]
    - df["threshold_3day_mm"]
).clip(lower=0)


# prevent division by zero
df["intensity_1day"] = np.where(
    df["threshold_1day_mm"] > 0,
    df["excess_1day"] / df["threshold_1day_mm"],
    0
)


df["intensity_3day"] = np.where(
    df["threshold_3day_mm"] > 0,
    df["excess_3day"] / df["threshold_3day_mm"],
    0
)


df["flood_intensity"] = df[
    ["intensity_1day", "intensity_3day"]
].max(axis=1)


# final safety cleanup
df["flood_intensity"] = (
    df["flood_intensity"]
    .replace([np.inf, -np.inf], 0)
    .fillna(0)
)


# -----------------------------
# FINAL DATASET
# -----------------------------

df = df[[

    "date",

    "district",

    "rainfall_mm",

    "rain_3day_mm",

    "threshold_1day_mm",

    "threshold_3day_mm",

    "flood_intensity"

]]


# -----------------------------
# SAVE OUTPUT
# -----------------------------

os.makedirs(

    r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\flood_labels",

    exist_ok=True

)


# FINAL SAFETY CLEAN
df = df.replace([np.inf, -np.inf], 0)
df = df.fillna(0)

df.to_csv(
    OUTPUT_FILE,
    index=False
)

# -----------------------------
# SUMMARY
# -----------------------------

print("\ncreated dataset:")

print(OUTPUT_FILE)

print("\nrows:", len(df))

print("\nflood intensity stats:")

print(df["flood_intensity"].describe())

print("\nnon-zero intensity count:")

print((df["flood_intensity"] > 0).sum())