import pandas as pd

df = pd.read_csv(r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\district_flood_risk.csv")

def normalize(col):
    return (col - col.min()) / (col.max() - col.min())

df["district"] = (
    df["district"]
    .str.replace(" ", "", regex=False)
    .str.replace("-", "", regex=False)
    .str.lower()
)

df["extent_norm"] = normalize(df["corrected_percent_flooded_area"])
df["duration_norm"] = normalize(df["mean_flood_duration"])

df["combined_risk"] = (
    0.7 * df["extent_norm"] +
    0.3 * df["duration_norm"]
)

BASE_1DAY = 45
BASE_3DAY = 110

df["threshold_1day_mm"] = BASE_1DAY * (1 - 0.5 * df["combined_risk"])
df["threshold_3day_mm"] = BASE_3DAY * (1 - 0.5 * df["combined_risk"])

output = df[[
    "district",
    "threshold_1day_mm",
    "threshold_3day_mm"
]]

output.to_csv(r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\district_rainfall_thresholds.csv", index=False)

print("created district_rainfall_thresholds.csv")