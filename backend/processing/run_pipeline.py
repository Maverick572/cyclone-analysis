import subprocess
import time
import sys


CYCLONE_NAME = "amphan"


STEPS = [

    {
        "name": "Create affected districts region",
        "script": r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\processing\affected_regions_creator.py"
    },

    {
        "name": "Generate adjacency graph",
        "script": r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\processing\generate_adjacent_districts.py"
    },

    {
        "name": "Compute rainfall thresholds",
        "script": r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\processing\rainfall_threshold_calculator.py"
    },

    {
        "name": "Generate rainfall dataset",
        "script": r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\processing\rainfall_dataset_creator.py"
    },

    {
        "name": "Compute flood intensity",
        "script": r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\processing\flood_dataset_creator.py"
    },

    {
        "name": "Generate spread paths",
        "script": r"C:\Vault\Projects\cyclone-rainfall-analysis\backend\processing\generate_spread_paths.py"
    }

]


def run_step(step):

    print("\n" + "="*60)

    print("STEP:", step["name"])

    print("="*60)


    start = time.time()


    result = subprocess.run(

        [sys.executable, step["script"]],

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



def main():

    print("\nCYCLONE PIPELINE")

    print("cyclone:", CYCLONE_NAME)

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