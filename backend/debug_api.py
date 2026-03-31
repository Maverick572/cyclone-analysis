import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def preview(data, max_items=2):
    """
    Returns trimmed preview of large JSON
    """
    if isinstance(data, list):
        return {
            "type": "list",
            "total_items": len(data),
            "sample": data[:max_items]
        }

    if isinstance(data, dict):
        keys = list(data.keys())
        sample = {}

        for k in keys[:max_items]:
            sample[k] = data[k]

        return {
            "type": "dict",
            "total_keys": len(keys),
            "sample_keys": keys[:10],
            "sample_values": sample
        }

    return data


def debug_endpoint(path):
    url = f"{BASE_URL}{path}"

    try:
        r = requests.get(url)

        print("\n====================")
        print(path)
        print("status:", r.status_code)

        data = r.json()

        print(
            json.dumps(
                preview(data),
                indent=2
            )
        )

        return data

    except Exception as e:
        print("ERROR:", e)



# ---------------------
# DEBUG ALL ENDPOINTS
# ---------------------

flood = debug_endpoint("/flood-intensity/amphan")

rainfall = debug_endpoint("/rainfall/amphan")

graph = debug_endpoint("/graph/amphan")

districts = debug_endpoint("/districts/amphan")


# ---------------------
# TEST FILTER ROUTES
# ---------------------

if flood and isinstance(flood, list):

    example_district = flood[0]["district"]

    print("\nUsing example district:", example_district)

    debug_endpoint(
        f"/flood-intensity/amphan/{example_district}"
    )

    debug_endpoint(
        f"/rainfall/amphan/{example_district}"
    )

    debug_endpoint(
        f"/graph/amphan/{example_district}"
    )