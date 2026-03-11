"""
Cyclone Rainfall Spatiotemporal Analysis Platform
FastAPI Backend
"""

import os
import json
import logging
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from processing.rainfall_processor import RainfallProcessor
from processing.analysis_engine import AnalysisEngine
from processing.graph_processor import GraphProcessor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent
DATASETS_DIR = BASE_DIR / "datasets" / "rainfall"
PROCESSED_DIR = BASE_DIR / "processed_data" / "rainfall"
DISTRICTS_FILE = BASE_DIR / "gadm41_IND_2.json"

processor = RainfallProcessor(DATASETS_DIR, PROCESSED_DIR, DISTRICTS_FILE)
engine = AnalysisEngine(PROCESSED_DIR)
graph_processor = GraphProcessor(BASE_DIR)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Process datasets on startup if not already processed."""
    logger.info("Starting Cyclone Rainfall Analysis Platform...")
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    processor.process_all_cyclones()
    logger.info("Pre-loading graph processor datasets (CSVs + GeoJSON)...")
    graph_processor.preload()
    logger.info("Data processing complete. Platform ready.")
    yield


app = FastAPI(
    title="Cyclone Rainfall Analysis API",
    description="Spatiotemporal analysis of cyclone-driven rainfall over Indian districts",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "platform": "Cyclone Rainfall Spatiotemporal Analysis",
        "version": "1.0.0",
        "cyclones": ["amphan", "yaas", "remal"],
    }


@app.get("/cyclones")
async def list_cyclones():
    """List all available cyclone datasets with metadata."""
    cyclones_meta = {
        "amphan": {
            "name": "Cyclone Amphan",
            "year": 2020,
            "landfall_date": "2020-05-20",
            "landfall_location": "West Bengal/Bangladesh coast",
            "category": "Super Cyclonic Storm",
            "dates": ["2020-05-14", "2020-05-15", "2020-05-16", "2020-05-17", "2020-05-18"],
        },
        "yaas": {
            "name": "Cyclone Yaas",
            "year": 2021,
            "landfall_date": "2021-05-26",
            "landfall_location": "Odisha coast near Balasore",
            "category": "Very Severe Cyclonic Storm",
            "dates": ["2021-05-23", "2021-05-24", "2021-05-25", "2021-05-26"],
        },
        "remal": {
            "name": "Cyclone Remal",
            "year": 2024,
            "landfall_date": "2024-05-26",
            "landfall_location": "West Bengal/Bangladesh coast",
            "category": "Severe Cyclonic Storm",
            "dates": ["2024-05-24", "2024-05-25", "2024-05-26", "2024-05-27"],
        },
    }

    available = []
    for key, meta in cyclones_meta.items():
        processed_file = PROCESSED_DIR / f"{key}.json"
        meta["processed"] = processed_file.exists()
        meta["id"] = key
        available.append(meta)

    return {"cyclones": available}


@app.get("/cyclones/{name}/dates")
async def get_cyclone_dates(name: str):
    """Get available rainfall dates for a cyclone."""
    processed_file = PROCESSED_DIR / f"{name}.json"
    if not processed_file.exists():
        raise HTTPException(status_code=404, detail=f"Cyclone '{name}' data not found")

    with open(processed_file) as f:
        data = json.load(f)

    return {
        "cyclone": name,
        "dates": sorted(data.get("daily_rainfall", {}).keys()),
    }


@app.get("/cyclones/{name}/rainfall/{date}")
async def get_rainfall_for_date(name: str, date: str):
    """Get district rainfall values for a specific date."""
    processed_file = PROCESSED_DIR / f"{name}.json"
    if not processed_file.exists():
        raise HTTPException(status_code=404, detail=f"Cyclone '{name}' data not found")

    with open(processed_file) as f:
        data = json.load(f)

    daily = data.get("daily_rainfall", {})
    if date not in daily:
        raise HTTPException(status_code=404, detail=f"Date '{date}' not found for cyclone '{name}'")

    return {
        "cyclone": name,
        "date": date,
        "rainfall": daily[date],
    }


@app.get("/cyclones/{name}/district/{district}")
async def get_district_timeline(name: str, district: str):
    """Get full rainfall timeline for a specific district."""
    processed_file = PROCESSED_DIR / f"{name}.json"
    if not processed_file.exists():
        raise HTTPException(status_code=404, detail=f"Cyclone '{name}' data not found")

    with open(processed_file) as f:
        data = json.load(f)

    district_decoded = district.replace("%20", " ").replace("+", " ")
    daily = data.get("daily_rainfall", {})
    timeline = {}
    for date, districts in daily.items():
        timeline[date] = districts.get(district_decoded, 0.0)

    metrics = data.get("district_metrics", {}).get(district_decoded, {})

    return {
        "cyclone": name,
        "district": district_decoded,
        "timeline": timeline,
        "metrics": metrics,
    }


@app.get("/cyclones/{name}/analysis")
async def get_cyclone_analysis(name: str):
    """Get complete analysis summary for a cyclone."""
    processed_file = PROCESSED_DIR / f"{name}.json"
    if not processed_file.exists():
        raise HTTPException(status_code=404, detail=f"Cyclone '{name}' data not found")

    with open(processed_file) as f:
        data = json.load(f)

    analysis = engine.compute_analysis(data, name)
    return analysis


@app.get("/cyclones/comparison/all")
async def compare_cyclones():
    """Compare rainfall patterns across all cyclones."""
    comparison = engine.compare_cyclones()
    return comparison


@app.get("/districts")
async def get_districts():
    """Return district boundary GeoJSON for map rendering."""
    if not DISTRICTS_FILE.exists():
        raise HTTPException(
            status_code=404,
            detail="District boundary file gadm41_IND_2.json not found. Please place it in the backend directory.",
        )

    with open(DISTRICTS_FILE) as f:
        geojson = json.load(f)

    # Slim down properties for faster transfer
    for feature in geojson.get("features", []):
        props = feature.get("properties", {})
        feature["properties"] = {
            "NAME_1": props.get("NAME_1", ""),
            "NAME_2": props.get("NAME_2", ""),
            "district_id": f"{props.get('NAME_1', '')} - {props.get('NAME_2', '')}",
        }

    return geojson


# =============================================================================
# NEW GRAPH ENDPOINTS
# =============================================================================

@app.get("/cyclones/{name}/graph/{date}")
async def get_graph_state(name: str, date: str):
    """
    Return flood propagation graph state for a cyclone on a specific date.
    Nodes  = districts with rainfall > 10 mm/day.
    Edges  = directed flood propagation between adjacent flooded districts.
    """
    processed_file = PROCESSED_DIR / f"{name}.json"
    if not processed_file.exists():
        raise HTTPException(status_code=404, detail=f"Cyclone '{name}' data not found")
    try:
        state = graph_processor.get_graph_state(name, date)
        return {"cyclone": name, "date": date, **state}
    except Exception as e:
        logger.error(f"Graph state error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/graph/district/{district_id}/risk")
async def get_district_risk(district_id: str):
    """Return full risk detail for a district (for the impact metrics panel)."""
    decoded = district_id.replace("%20", " ").replace("+", " ")
    try:
        detail = graph_processor.get_district_risk_detail(decoded)
        return {"district_id": decoded, **detail}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)