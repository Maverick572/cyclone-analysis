import pandas as pd
import json
import os
import sys


# -----------------------------
# CYCLONE INPUT
# -----------------------------

CYCLONE_NAME = sys.argv[1] if len(sys.argv) > 1 else "amphan"


# -----------------------------
# FILE PATHS
# -----------------------------

BASE_DIR = r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets"

FLOOD_DATA = os.path.join(
    BASE_DIR,
    "flood_labels",
    f"{CYCLONE_NAME}_flood_intensity.csv"
)

ADJ_FILE = os.path.join(
    BASE_DIR,
    "regions",
    f"{CYCLONE_NAME}_adjacency.json"
)

OUTPUT_JSON = os.path.join(
    BASE_DIR,
    "graphs",
    f"{CYCLONE_NAME}_paths_by_origin.json"
)


# -----------------------------
# PARAMETERS
# -----------------------------

MIN_INTENSITY = 0.15
MAX_LAG_DAYS = 2
MAX_PATH_LENGTH = 6


# -----------------------------
# LOAD DATA
# -----------------------------

print(f"\nCYCLONE: {CYCLONE_NAME}")

df = pd.read_csv(FLOOD_DATA)
df["date"] = pd.to_datetime(df["date"])

with open(ADJ_FILE) as f:
    adjacency = json.load(f)


# keep only meaningful flood signals
df = df[df.flood_intensity > MIN_INTENSITY]


# -----------------------------
# BUILD EVENT LOOKUP
# -----------------------------

district_events = {}

for _, r in df.iterrows():
    district_events.setdefault(r["district"], []).append(
        (r["date"], float(r["flood_intensity"]))
    )

for d in district_events:
    district_events[d].sort()


# -----------------------------
# DFS PATH BUILDER
# -----------------------------

def build_paths(start_district, start_date, start_intensity):

    paths = []

    stack = [
        (
            [(start_district, start_date, start_intensity)],
            {start_district}
        )
    ]

    while stack:

        current_path, visited = stack.pop()

        last_district, last_date, _ = current_path[-1]

        extended = False

        for neighbor in adjacency.get(last_district, []):

            if neighbor not in district_events:
                continue

            for n_date, n_intensity in district_events[neighbor]:

                lag = (n_date - last_date).days

                if 0 < lag <= MAX_LAG_DAYS:

                    if neighbor in visited:
                        continue

                    new_path = current_path + [
                        (neighbor, n_date, n_intensity)
                    ]

                    if len(new_path) <= MAX_PATH_LENGTH:

                        stack.append(
                            (new_path, visited | {neighbor})
                        )

                        extended = True

        if not extended:
            paths.append(current_path)

    return paths


# -----------------------------
# BUILD PATHS
# -----------------------------

result = {}

for district, events in district_events.items():

    district_paths = []

    for date, intensity in events:

        paths = build_paths(district, date, intensity)

        for p in paths:
            district_paths.append([
                {
                    "district": x[0],
                    "date": x[1].strftime("%Y-%m-%d"),
                    "intensity": x[2]
                }
                for x in p
            ])

    if district_paths:
        result[district] = district_paths


# -----------------------------
# SAVE JSON
# -----------------------------

os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)

with open(OUTPUT_JSON, "w") as f:
    json.dump(result, f, indent=2)


# -----------------------------
# SUMMARY
# -----------------------------

print("district start nodes:", len(result))
print("saved to:", OUTPUT_JSON)