# 🌀 Cyclone Rainfall Spatiotemporal Analysis Platform

An interactive platform for analyzing cyclone-driven rainfall evolution across Indian districts using NASA GPM IMERG satellite data.

## Features

- **Spatiotemporal rainfall animation** — watch rainfall propagate across districts like a movie
- **District-level statistics** — cumulative rainfall, rainy day counts, rainfall persistence, anomaly scores
- **Flood risk indicators** — auto-flagged hotspots based on extreme rainfall and multi-day accumulation
- **Inter-cyclone comparison** — Amphan (2020), Yaas (2021), Remal (2024)
- **Interactive Leaflet map** — click districts for detailed metrics

---

## Project Structure

```
cyclone-rainfall-analysis/
├── backend/
│   ├── main.py                        # FastAPI application
│   ├── processing/
│   │   ├── rainfall_processor.py      # NetCDF4 → district rainfall
│   │   └── analysis_engine.py        # Analysis & comparison
│   ├── datasets/
│   │   └── rainfall/
│   │       ├── amphan/                # 2020-05-14.nc4 … 2020-05-18.nc4
│   │       ├── yaas/                  # 2021-05-23.nc4 … 2021-05-26.nc4
│   │       └── remal/                 # 2024-05-24.nc4 … 2024-05-27.nc4
│   ├── processed_data/
│   │   └── rainfall/                  # Auto-generated JSONs
│   ├── gadm41_IND_2.json              # District boundaries (required)
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── DistrictMap.jsx        # Leaflet choropleth map
    │   │   ├── TimelineSlider.jsx     # Playback controls
    │   │   └── Charts.jsx             # Recharts visualizations
    │   ├── pages/
    │   │   ├── Home.jsx
    │   │   ├── CyclonePage.jsx
    │   │   ├── RainfallMap.jsx        # Main animation view
    │   │   └── AnalysisDashboard.jsx  # Statistics & charts
    │   └── services/api.js
    ├── package.json
    └── vite.config.js
```

---

## Quick Start

### 1. Download Required Data

#### District Boundaries
Download GADM India Level 2 (districts):
- https://gadm.org/download_country.html → India → Level 2 → GeoJSON
- File: `gadm41_IND_2.json`
- Place in: `backend/gadm41_IND_2.json`

#### NASA GPM IMERG Rainfall Data
Download from NASA GES DISC: https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGDF_07/summary

Register for a free NASA Earthdata account, then download daily files:

**Amphan window (2020):**
- 3B-DAY.MS.MRG.3IMERG.20200514-S000000-E235959.V07B.nc4
- 3B-DAY.MS.MRG.3IMERG.20200515-S000000-E235959.V07B.nc4
- 3B-DAY.MS.MRG.3IMERG.20200516-S000000-E235959.V07B.nc4
- 3B-DAY.MS.MRG.3IMERG.20200517-S000000-E235959.V07B.nc4
- 3B-DAY.MS.MRG.3IMERG.20200518-S000000-E235959.V07B.nc4

Rename each file to `YYYY-MM-DD.nc4` and place in `backend/datasets/rainfall/amphan/`

**Yaas window (2021):**
- 2021-05-23.nc4, 2021-05-24.nc4, 2021-05-25.nc4, 2021-05-26.nc4
- Place in: `backend/datasets/rainfall/yaas/`

**Remal window (2024):**
- 2024-05-24.nc4, 2024-05-25.nc4, 2024-05-26.nc4, 2024-05-27.nc4
- Place in: `backend/datasets/rainfall/remal/`

---

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start server (auto-processes data on first run)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend will automatically:
1. Scan `datasets/rainfall/` for cyclone folders
2. Process each `.nc4` file using zonal statistics
3. Cache results in `processed_data/rainfall/`

API docs available at: http://localhost:8000/docs

---

### 3. Frontend Setup

```bash
cd frontend

npm install
npm run dev
```

Open http://localhost:5173

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /cyclones` | List all cyclones with metadata |
| `GET /cyclones/{name}/dates` | Available dates for a cyclone |
| `GET /cyclones/{name}/rainfall/{date}` | District rainfall for one date |
| `GET /cyclones/{name}/district/{district}` | Full timeline for a district |
| `GET /cyclones/{name}/analysis` | Complete analysis summary |
| `GET /cyclones/comparison/all` | Compare all cyclones |
| `GET /districts` | GeoJSON district boundaries |

---

## How It Works

### Data Processing Pipeline

1. **NetCDF loading** — xarray reads IMERG `.nc4` files
2. **India subsetting** — crops global raster to lat 5–38°N, lon 65–98°E
3. **Zonal statistics** — `rasterstats.zonal_stats()` computes mean rainfall per district polygon
4. **Metrics computation** — cumulative, persistence, anomaly z-score, rainy day count
5. **Flood indicators** — flags districts meeting risk thresholds

### Flood Risk Thresholds

| Indicator | Threshold |
|-----------|-----------|
| Extreme daily rainfall | > 100 mm/day |
| Multi-day accumulation | > 200 mm over 3 days |
| Rainfall persistence | ≥ 3 consecutive rainy days |

Districts meeting 2+ criteria are flagged **MEDIUM** risk; 3 criteria = **HIGH** risk.

### Rainfall Color Scale

| Color | Range |
|-------|-------|
| Light yellow | 0–1 mm |
| Orange | 1–5 mm |
| Dark orange | 5–20 mm |
| Red | 20–50 mm |
| Dark red | 50–100 mm |
| Maroon | > 100 mm |

---

## Dependencies

### Backend
- `fastapi` + `uvicorn` — API server
- `xarray` + `netCDF4` — NetCDF reading
- `geopandas` + `shapely` — vector geometry
- `rasterstats` — zonal statistics
- `rasterio` — raster transforms
- `numpy` + `pandas` — data processing
- `scipy` — statistical functions

### Frontend
- `react` + `react-router-dom` — SPA framework
- `leaflet` + `react-leaflet` — interactive maps
- `recharts` — data visualization
- `axios` — HTTP client
- `vite` — build tool

---

## Cyclone Information

### Cyclone Amphan (2020)
- **Category**: Super Cyclonic Storm
- **Landfall**: 20 May 2020, West Bengal/Bangladesh coast
- **Peak winds**: ~260 km/h
- **Analysis window**: 14–18 May 2020

### Cyclone Yaas (2021)
- **Category**: Very Severe Cyclonic Storm
- **Landfall**: 26 May 2021, Odisha coast near Balasore
- **Peak winds**: ~185 km/h
- **Analysis window**: 23–26 May 2021

### Cyclone Remal (2024)
- **Category**: Severe Cyclonic Storm
- **Landfall**: 26 May 2024, West Bengal/Bangladesh coast
- **Peak winds**: ~135 km/h
- **Analysis window**: 24–27 May 2024
