import subprocess
import time
import sys

# -------------------------
# CONFIG
# -------------------------

CYCLONE_NAME = "fani"


STEPS = [

    {
        "name": "Create affected districts region",
        "script": r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\processing\affected_regions_creator.py",
        "needs_cyclone": True
    },

    {
        "name": "Generate adjacency graph",
        "script": r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\processing\generate_adjacent_districts.py",
        "needs_cyclone": True
    },

    {
        "name": "Compute rainfall thresholds",
        "script": r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\processing\rainfall_threshold_calculator.py",
        "needs_cyclone": False   # ✅ static script
    },

    {
        "name": "Generate rainfall dataset",
        "script": r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\processing\rainfall_dataset_creator.py",
        "needs_cyclone": True
    },

    {
        "name": "Compute flood intensity",
        "script": r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\processing\flood_dataset_creator.py",
        "needs_cyclone": True
    },

    {
        "name": "Generate spread paths",
        "script": r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\processing\generate_spread_paths.py",
        "needs_cyclone": True
    },

    {
        "name": "Generate flood risk",
        "script": r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\processing\flood_risk_processor.py",
        "needs_cyclone": True
    }

]


# -------------------------
# RUN STEP
# -------------------------

def run_step(step):

    print("\n" + "="*60)
    print("STEP:", step["name"])
    print("="*60)

    start = time.time()

    # base command
    cmd = [sys.executable, step["script"]]

    # conditionally add cyclone name
    if step.get("needs_cyclone", True):
        cmd.append(CYCLONE_NAME)

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True
    )

    print(result.stdout)

    if result.returncode != 0:
        print(result.stderr)
        print("\nFAILED at step:", step["name"])
        sys.exit(1)

    print(
        "\ncompleted in",
        round(time.time() - start, 2),
        "seconds"
    )


# -------------------------
# MAIN
# -------------------------

def main():

    print("\nCYCLONE PIPELINE")
    print(f"\nCyclone: {CYCLONE_NAME}")
    print("\nstarting...\n")

    total_start = time.time()

    for step in STEPS:
        run_step(step)

    print("\n" + "="*60)
    print("PIPELINE COMPLETE")
    print("total time:", round(time.time() - total_start, 2), "seconds")
    print("="*60)


if __name__ == "__main__":
    main()