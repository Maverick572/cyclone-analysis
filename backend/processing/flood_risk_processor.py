import csv
import json

with open(r'C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\regions\amphan_districts.json') as f:
    allowed = json.load(f)

with open(r'C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\regions\amphan_adjacency.json') as f:
    adjacency = json.load(f)

allowed_names = {
    d["district"].lower().replace(" ", "").replace("-", "")
    for d in allowed
}

with open(r'C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\district_flood_risk.csv', 'r') as f:
    reader = csv.DictReader(f)
    data = []
    for row in reader:
        normalized = row["district"].lower().replace(" ", "").replace("-", "")
        if normalized not in allowed_names:
            continue
        for key, val in row.items():
            try:
                row[key] = float(val) if '.' in val else int(val)
            except ValueError:
                pass
        row["district"] = normalized
        data.append(row)

seen = {}
for row in data:
    key = row["district"]
    if key not in seen or row["corrected_percent_flooded_area"] > seen[key]["corrected_percent_flooded_area"]:
        seen[key] = row

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

# retry loop
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

with open(r'C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\flood_risk _processed\amphan_flood_risk.json', 'w') as f:
    json.dump(data, f, indent=2)

print(f"Done. {len(data)} records written to amphan_flood_risk.json")