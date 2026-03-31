import pandas as pd
import json
import os


# -----------------------------
# FILE PATHS
# -----------------------------

FLOOD_DATA = r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\flood_labels\amphan_flood_intensity.csv"

ADJ_FILE = r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\regions\amphan_adjacency.json"

OUTPUT_JSON = r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\graphs\amphan_paths_by_origin.json"



# -----------------------------
# PARAMETERS
# -----------------------------

MIN_INTENSITY = 0.15
MAX_LAG_DAYS = 2
MAX_PATH_LENGTH = 6   # prevents infinite branching



# -----------------------------
# LOAD DATA
# -----------------------------

df = pd.read_csv(FLOOD_DATA)
df["date"] = pd.to_datetime(df["date"])

with open(ADJ_FILE) as f:
    adjacency = json.load(f)



# keep only meaningful flood signals
df = df[df.flood_intensity > MIN_INTENSITY]



# lookup structure:
# district -> list of (date, intensity)

district_events = {}

for _, r in df.iterrows():

    district_events.setdefault(r["district"], []).append(

        (r["date"], float(r["flood_intensity"]))

    )



# sort events per district
for d in district_events:
    district_events[d].sort()



# -----------------------------
# DFS path builder
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
# BUILD PATHS FROM ALL START NODES
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

os.makedirs(

    r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\graphs",

    exist_ok=True

)


with open(OUTPUT_JSON, "w") as f:

    json.dump(result, f, indent=2)



print("district start nodes:", len(result))
print("saved to:", OUTPUT_JSON)