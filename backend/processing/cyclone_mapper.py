import os
import json
import numpy as np
import pandas as pd
import xarray as xr


# -----------------------------
# CONFIG
# -----------------------------

CYCLONE_NAME = "amphan"

RAINFALL_DIR = rf"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\rainfall\{CYCLONE_NAME}"

OUTPUT_FILE = rf"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\cyclone_tracks\{CYCLONE_NAME}_track.json"


# expanded bbox to include NE India
MIN_LAT = 5
MAX_LAT = 30

MIN_LON = 80
MAX_LON = 98


# rainfall cluster detection
PRIMARY_PERCENTILE = 93
SECONDARY_PERCENTILE = 88

MIN_VALID_RAIN = 6


# motion smoothing
MAX_DAILY_SHIFT = 2.5   # degrees (~275 km)
SMOOTHING_WINDOW = 2


# -----------------------------
# PROCESS FILES
# -----------------------------

track = {}

files = sorted(os.listdir(RAINFALL_DIR))

previous_point = None


for file in files:

    if not file.endswith(".nc4"):
        continue


    print("\n========================")
    print("processing", file)


    date_str = file.split(".")[4][:8]

    date = pd.to_datetime(
        date_str,
        format="%Y%m%d"
    )


    ds = xr.open_dataset(
        os.path.join(RAINFALL_DIR,file)
    )


    rain = ds["precipitation"].isel(time=0)


    # -----------------------------
    # APPLY BOUNDING BOX
    # -----------------------------

    rain = rain.where(

        (rain.lat >= MIN_LAT) &
        (rain.lat <= MAX_LAT) &
        (rain.lon >= MIN_LON) &
        (rain.lon <= MAX_LON),

        drop=True

    )


    values = rain.values

    if values.size == 0:

        print("no rainfall data")
        continue


    valid_values = values[~np.isnan(values)]

    if len(valid_values) == 0:

        print("all values NaN")
        continue


    # -----------------------------
    # PRIMARY CLUSTER
    # -----------------------------

    threshold = np.percentile(
        valid_values,
        PRIMARY_PERCENTILE
    )


    mask = values >= threshold

    pixel_count = int(np.sum(mask))


    # -----------------------------
    # SECONDARY CLUSTER (for landfall phase)
    # -----------------------------

    if pixel_count < 150:

        print("cluster fragmented → using wider percentile")

        threshold = np.percentile(
            valid_values,
            SECONDARY_PERCENTILE
        )

        mask = values >= threshold

        pixel_count = int(np.sum(mask))


    # -----------------------------
    # MIN RAIN FILTER
    # -----------------------------

    mask = mask & (values >= MIN_VALID_RAIN)

    pixel_count = int(np.sum(mask))


    lat2d = rain.lat.broadcast_like(rain).values
    lon2d = rain.lon.broadcast_like(rain).values


    # -----------------------------
    # COMPUTE CENTROID
    # -----------------------------

    if pixel_count > 20:

        weights = values[mask]**2

        lat_center = np.sum(
            lat2d[mask] * weights
        ) / np.sum(weights)

        lon_center = np.sum(
            lon2d[mask] * weights
        ) / np.sum(weights)

    else:

        print("cluster too weak → fallback to max rainfall pixel")

        max_index = np.unravel_index(
            np.nanargmax(values),
            values.shape
        )

        lat_center = float(lat2d[max_index])
        lon_center = float(lon2d[max_index])

        pixel_count = 1


    # -----------------------------
    # MOTION CONSTRAINT
    # -----------------------------

    if previous_point:

        prev_lat, prev_lon = previous_point

        shift = abs(lat_center-prev_lat) + abs(lon_center-prev_lon)

        if shift > MAX_DAILY_SHIFT:

            print("unrealistic jump → smoothing")

            lat_center = 0.65*prev_lat + 0.35*lat_center
            lon_center = 0.65*prev_lon + 0.35*lon_center


    previous_point = (lat_center, lon_center)


    # -----------------------------
    # SAVE POINT
    # -----------------------------

    track[str(date.date())] = {

        "lat": float(lat_center),

        "lon": float(lon_center),

        "threshold": float(threshold),

        "pixels_used": int(pixel_count)

    }


# -----------------------------
# TEMPORAL SMOOTHING
# -----------------------------

if SMOOTHING_WINDOW > 1 and len(track) > 2:

    print("\napplying smoothing...")

    dates_sorted = sorted(track.keys())

    smoothed = {}

    for i in range(len(dates_sorted)):

        start = max(
            0,
            i - SMOOTHING_WINDOW + 1
        )

        subset = dates_sorted[start:i+1]


        lat_mean = np.mean([
            track[d]["lat"]
            for d in subset
        ])

        lon_mean = np.mean([
            track[d]["lon"]
            for d in subset
        ])


        smoothed[dates_sorted[i]] = {

            **track[dates_sorted[i]],

            "lat": float(lat_mean),

            "lon": float(lon_mean)

        }


    track = smoothed


# -----------------------------
# SAVE OUTPUT
# -----------------------------

os.makedirs(
    os.path.dirname(OUTPUT_FILE),
    exist_ok=True
)


with open(OUTPUT_FILE,"w") as f:

    json.dump(
        track,
        f,
        indent=2
    )


# -----------------------------
# SUMMARY
# -----------------------------

print("\n========================")

print("track saved:")

print(OUTPUT_FILE)


print(
    "points detected:",
    len(track)
)


if len(track) > 0:

    lats = [
        p["lat"]
        for p in track.values()
    ]

    lons = [
        p["lon"]
        for p in track.values()
    ]


    print(
        "latitude range:",
        min(lats),
        "→",
        max(lats)
    )

    print(
        "longitude range:",
        min(lons),
        "→",
        max(lons)
    )