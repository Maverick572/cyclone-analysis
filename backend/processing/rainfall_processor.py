"""
Rainfall Processor
Processes NASA GPM IMERG NetCDF4 files into district-level rainfall statistics.
"""

import json
import logging
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# India bounding box
INDIA_LAT_MIN = 5.0
INDIA_LAT_MAX = 38.0
INDIA_LON_MIN = 65.0
INDIA_LON_MAX = 98.0

RAINY_DAY_THRESHOLD = 5.0      # mm/day
EXTREME_RAIN_THRESHOLD = 100.0  # mm/day
MULTI_DAY_THRESHOLD = 200.0     # mm over 3 days


class RainfallProcessor:
    def __init__(self, datasets_dir: Path, processed_dir: Path, districts_file: Path):
        self.datasets_dir = datasets_dir
        self.processed_dir = processed_dir
        self.districts_file = districts_file
        self._districts_cache: Optional[dict] = None

    def process_all_cyclones(self):
        """Scan dataset folders and process each cyclone."""
        if not self.datasets_dir.exists():
            logger.warning(f"Datasets directory not found: {self.datasets_dir}")
            return

        for cyclone_dir in sorted(self.datasets_dir.iterdir()):
            if not cyclone_dir.is_dir():
                continue

            cyclone_name = cyclone_dir.name
            output_file = self.processed_dir / f"{cyclone_name}.json"

            nc4_files = sorted(cyclone_dir.glob("*.nc4"))
            if not nc4_files:
                logger.warning(f"No .nc4 files found in {cyclone_dir}")
                continue

            if output_file.exists():
                logger.info(f"Skipping {cyclone_name} — already processed")
                continue

            logger.info(f"Processing cyclone: {cyclone_name} ({len(nc4_files)} files)")
            result = self._process_cyclone(cyclone_name, nc4_files)
            if result:
                with open(output_file, "w") as f:
                    json.dump(result, f, indent=2)
                logger.info(f"Saved: {output_file}")

    def _process_cyclone(self, cyclone_name: str, nc4_files: List[Path]) -> Optional[dict]:
        """Process all NetCDF files for a single cyclone."""
        try:
            import xarray as xr
            import geopandas as gpd
            from rasterstats import zonal_stats
        except ImportError as e:
            logger.error(f"Missing dependency: {e}")
            return None

        districts_gdf = self._load_districts()
        if districts_gdf is None:
            return None

        daily_rainfall: Dict[str, Dict[str, float]] = {}

        for nc4_file in nc4_files:
            date_str = nc4_file.stem  # filename is YYYY-MM-DD
            logger.info(f"  Processing {date_str}...")

            try:
                ds = xr.open_dataset(nc4_file, engine="netcdf4")

                # Find precipitation variable
                precip_var = None
                for var in ["precipitation", "precipitationCal", "HQprecipitation"]:
                    if var in ds:
                        precip_var = var
                        break
                if precip_var is None:
                    precip_var = list(ds.data_vars)[0]

                da = ds[precip_var]

                # Handle dimensions — IMERG: (time, lon, lat) or (time, lat, lon)
                if "time" in da.dims:
                    da = da.isel(time=0)

                # Rename dims if needed
                dim_map = {}
                for d in da.dims:
                    if d.lower() in ["latitude", "lat"]:
                        dim_map[d] = "lat"
                    elif d.lower() in ["longitude", "lon"]:
                        dim_map[d] = "lon"
                if dim_map:
                    da = da.rename(dim_map)

                # Subset to India
                lat_vals = da.lat.values
                lon_vals = da.lon.values

                lat_mask = (lat_vals >= INDIA_LAT_MIN) & (lat_vals <= INDIA_LAT_MAX)
                lon_mask = (lon_vals >= INDIA_LON_MIN) & (lon_vals <= INDIA_LON_MAX)

                da_india = da.sel(lat=lat_vals[lat_mask], lon=lon_vals[lon_mask])

                # Compute zonal stats per district
                rainfall_values = da_india.values  # shape: (lat, lon) or (lon, lat)

                # IMERG native layout is (lon, lat), transpose to (lat, lon) for rasterio
                if da_india.dims[0] == "lon":
                    rainfall_values = rainfall_values.T

                rainfall_values = np.where(rainfall_values < 0, 0, rainfall_values)

                from rasterio.transform import from_bounds
                lat_sub = lat_vals[lat_mask]
                lon_sub = lon_vals[lon_mask]

                transform = from_bounds(
                    lon_sub.min(), lat_sub.min(),
                    lon_sub.max(), lat_sub.max(),
                    rainfall_values.shape[1],
                    rainfall_values.shape[0],
                )

                stats = zonal_stats(
                    districts_gdf,
                    rainfall_values,
                    affine=transform,
                    stats=["mean"],
                    nodata=-9999,
                    all_touched=True,
                )

                day_rainfall = {}
                for idx, (_, row) in enumerate(districts_gdf.iterrows()):
                    district_id = f"{row['NAME_1']} - {row['NAME_2']}"
                    mean_val = stats[idx].get("mean") or 0.0
                    day_rainfall[district_id] = round(float(mean_val), 2)

                daily_rainfall[date_str] = day_rainfall
                ds.close()

            except Exception as e:
                logger.error(f"Error processing {nc4_file}: {e}")
                continue

        if not daily_rainfall:
            return None

        district_metrics = self._compute_district_metrics(daily_rainfall)
        flood_indicators = self._compute_flood_indicators(daily_rainfall, district_metrics)

        return {
            "cyclone": cyclone_name,
            "daily_rainfall": daily_rainfall,
            "district_metrics": district_metrics,
            "flood_indicators": flood_indicators,
        }

    def _compute_district_metrics(self, daily_rainfall: dict) -> dict:
        """Compute per-district metrics across the cyclone window."""
        dates = sorted(daily_rainfall.keys())
        if not dates:
            return {}

        # Collect all districts
        all_districts = set()
        for day_data in daily_rainfall.values():
            all_districts.update(day_data.keys())

        metrics = {}
        for district in all_districts:
            values = [daily_rainfall[d].get(district, 0.0) for d in dates]
            arr = np.array(values)

            cumulative = float(np.sum(arr))
            max_daily = float(np.max(arr))
            mean_daily = float(np.mean(arr))
            rainy_days = int(np.sum(arr > RAINY_DAY_THRESHOLD))

            # Persistence: max consecutive rainy days
            persistence = 0
            current_streak = 0
            for v in arr:
                if v > RAINY_DAY_THRESHOLD:
                    current_streak += 1
                    persistence = max(persistence, current_streak)
                else:
                    current_streak = 0

            # Anomaly z-score
            std = float(np.std(arr))
            anomaly = (arr - mean_daily) / std if std > 0 else np.zeros_like(arr)
            anomaly_by_date = {d: round(float(a), 3) for d, a in zip(dates, anomaly)}

            metrics[district] = {
                "cumulative_rainfall": round(cumulative, 2),
                "max_daily_rainfall": round(max_daily, 2),
                "mean_daily_rainfall": round(mean_daily, 2),
                "rainy_day_count": rainy_days,
                "rainfall_persistence": persistence,
                "anomaly_by_date": anomaly_by_date,
                "daily_values": {d: round(float(v), 2) for d, v in zip(dates, values)},
            }

        return metrics

    def _compute_flood_indicators(self, daily_rainfall: dict, district_metrics: dict) -> dict:
        """Flag districts with potential flood risk indicators."""
        dates = sorted(daily_rainfall.keys())
        indicators = {}

        for district, metrics in district_metrics.items():
            flags = []

            # Extreme rainfall flag
            if metrics["max_daily_rainfall"] > EXTREME_RAIN_THRESHOLD:
                flags.append("extreme_rainfall")

            # Multi-day accumulation flag
            daily = metrics["daily_values"]
            vals = [daily.get(d, 0.0) for d in dates]
            for i in range(len(vals) - 2):
                if sum(vals[i : i + 3]) > MULTI_DAY_THRESHOLD:
                    flags.append("multi_day_accumulation")
                    break

            # Persistence flag
            if metrics["rainfall_persistence"] >= 3:
                flags.append("rainfall_persistence")

            if flags:
                indicators[district] = {
                    "flags": flags,
                    "risk_level": self._risk_level(len(flags)),
                    "cumulative": metrics["cumulative_rainfall"],
                    "max_daily": metrics["max_daily_rainfall"],
                }

        return indicators

    def _risk_level(self, flag_count: int) -> str:
        if flag_count >= 3:
            return "HIGH"
        elif flag_count == 2:
            return "MEDIUM"
        return "LOW"

    def _load_districts(self):
        """Load and cache district GeoDataFrame."""
        if self._districts_cache is not None:
            return self._districts_cache

        if not self.districts_file.exists():
            logger.error(f"District file not found: {self.districts_file}")
            return None

        try:
            import geopandas as gpd
            gdf = gpd.read_file(self.districts_file)
            # Ensure CRS
            if gdf.crs is None:
                gdf = gdf.set_crs("EPSG:4326")
            elif gdf.crs.to_epsg() != 4326:
                gdf = gdf.to_crs("EPSG:4326")
            self._districts_cache = gdf
            return gdf
        except Exception as e:
            logger.error(f"Error loading districts: {e}")
            return None
