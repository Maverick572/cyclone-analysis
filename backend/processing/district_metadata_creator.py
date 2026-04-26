import pandas as pd
import os

# -------------------------
# FILE PATHS
# -------------------------

INPUT_FILE = r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\district_flood_risk.csv"

OUTPUT_FILE = r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\datasets\district_metadata.csv"


# -------------------------
# LOAD DATA
# -------------------------

df = pd.read_csv(INPUT_FILE)


# -------------------------
# NORMALIZE DISTRICT NAMES
# -------------------------

def normalize(name):
    return (
        str(name)
        .lower()
        .replace(" ", "")
        .replace("-", "")
    )

df["district"] = df["district"].apply(normalize)


# -------------------------
# REMOVE DUPLICATES (keep most important row)
# -------------------------

# Keep row with highest corrected flood area (most significant)
df = df.sort_values(
    by="corrected_percent_flooded_area",
    ascending=False
).drop_duplicates(
    subset=["district"],
    keep="first"
)


# -------------------------
# SAVE FILE
# -------------------------

os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

df.to_csv(OUTPUT_FILE, index=False)


# -------------------------
# DEBUG OUTPUT
# -------------------------

print("✅ district_metadata.csv created")
print("Total districts:", len(df))

print("\nSample:")
print(df.head())