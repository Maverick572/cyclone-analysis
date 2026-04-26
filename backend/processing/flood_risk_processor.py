import csv
import json
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

REGION_FILE = os.path.join(BASE_DIR, "regions", f"{CYCLONE_NAME}_districts.json")
ADJ_FILE = os.path.join(BASE_DIR, "regions", f"{CYCLONE_NAME}_adjacency.json")

FLOOD_RISK_INPUT = os.path.join(BASE_DIR, "district_flood_risk.csv")

OUTPUT_FILE = os.path.join(
    BASE_DIR,
    "flood_risk_processed",   # ⚠️ fixed folder name
    f"{CYCLONE_NAME}_flood_risk.json"
)


# -------------------------
# LOAD DATA
# -------------------------

with open(REGION_FILE) as f:
    allowed = json.load(f)

with open(ADJ_FILE) as f:
    adjacency = json.load(f)


allowed_names = {
    d["district"].lower().replace(" ", "").replace("-", "")
    for d in allowed
}


# -------------------------
# LOAD FLOOD RISK CSV
# -------------------------

with open(FLOOD_RISK_INPUT, 'r') as f:
    reader = csv.DictReader(f)
    data = []

    for row in reader:

        normalized = row["district"].lower().replace(" ", "").replace("-", "")

        if normalized not in allowed_names:
            continue

        for key, val in row.items():
            try:
                row[key] = float(val) if '.' in val else int(val)
            except (ValueError, TypeError):
                pass

        row["district"] = normalized
        data.append(row)


# -------------------------
# DEDUPLICATE (KEEP MAX FLOOD AREA)
# -------------------------

seen = {}

for row in data:
    key = row["district"]

    if (
        key not in seen
        or row["corrected_percent_flooded_area"] > seen[key]["corrected_percent_flooded_area"]
    ):
        seen[key] = row


# -------------------------
# HELPERS
# -------------------------

def avg(field, neighbor_vals):
    return sum(r[field] for r in neighbor_vals) / len(neighbor_vals)


def try_impute(district):

    neighbors = adjacency.get(district, [])

    neighbor_vals = [seen[n] for n in neighbors if n in seen]

    if not neighbor_vals:
        return False

    seen[district] = {
        "district": district,
        "percent_flooded_area": avg("percent_flooded_area", neighbor_vals),
        "parmanent_water": avg("parmanent_water", neighbor_vals),
        "corrected_percent_flooded_area": avg("corrected_percent_flooded_area", neighbor_vals),
        "human_fatality": avg("human_fatality", neighbor_vals),
        "human_injured": avg("human_injured", neighbor_vals),
        "population": avg("population", neighbor_vals),
        "mean_flood_duration": avg("mean_flood_duration", neighbor_vals),
    }

    return True


# -------------------------
# ITERATIVE IMPUTATION
# -------------------------

pending = [d for d in allowed_names if d not in seen]

max_passes = 10

for pass_num in range(max_passes):

    if not pending:
        break

    still_pending = []

    for district in pending:

        if try_impute(district):
            print(f"imputed {district} (pass {pass_num + 1})")
        else:
            still_pending.append(district)

    if len(still_pending) == len(pending):
        print(f"could not resolve: {still_pending}")
        break

    pending = still_pending


data = list(seen.values())


# -------------------------
# SAVE OUTPUT
# -------------------------

os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

with open(OUTPUT_FILE, 'w') as f:
    json.dump(data, f, indent=2)


# -------------------------
# SUMMARY
# -------------------------

print(f"\nCYCLONE: {CYCLONE_NAME}")
print(f"Done. {len(data)} records written to {OUTPUT_FILE}")