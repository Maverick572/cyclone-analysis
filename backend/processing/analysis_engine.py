"""
Analysis Engine
Computes cyclone rainfall analysis summaries and inter-cyclone comparisons.
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class AnalysisEngine:
    def __init__(self, processed_dir: Path):
        self.processed_dir = processed_dir

    def _load_cyclone(self, name: str) -> Optional[dict]:
        f = self.processed_dir / f"{name}.json"
        if not f.exists():
            return None
        with open(f) as fp:
            return json.load(fp)

    def compute_analysis(self, data: dict, cyclone_name: str) -> dict:
        """Full analysis summary for one cyclone."""
        daily = data.get("daily_rainfall", {})
        metrics = data.get("district_metrics", {})
        flood = data.get("flood_indicators", {})
        dates = sorted(daily.keys())

        # Top 10 districts by cumulative rainfall
        sorted_by_cumulative = sorted(
            metrics.items(),
            key=lambda x: x[1].get("cumulative_rainfall", 0),
            reverse=True,
        )[:10]

        # Top 10 by max daily
        sorted_by_max = sorted(
            metrics.items(),
            key=lambda x: x[1].get("max_daily_rainfall", 0),
            reverse=True,
        )[:10]

        # Spatial spread: how many districts had >20mm on each day
        daily_spread = {}
        for date in dates:
            count = sum(1 for v in daily[date].values() if v > 20)
            daily_spread[date] = count

        # Rainfall totals per day (sum across all districts)
        daily_totals = {}
        for date in dates:
            total = sum(daily[date].values())
            daily_totals[date] = round(total, 2)

        # Flood hotspots
        high_risk = {k: v for k, v in flood.items() if v.get("risk_level") == "HIGH"}
        medium_risk = {k: v for k, v in flood.items() if v.get("risk_level") == "MEDIUM"}

        # State-level aggregation
        state_rainfall = {}
        for district_id, m in metrics.items():
            state = district_id.split(" - ")[0] if " - " in district_id else "Unknown"
            if state not in state_rainfall:
                state_rainfall[state] = {"cumulative": 0.0, "district_count": 0}
            state_rainfall[state]["cumulative"] += m.get("cumulative_rainfall", 0)
            state_rainfall[state]["district_count"] += 1

        for state in state_rainfall:
            n = state_rainfall[state]["district_count"]
            state_rainfall[state]["mean_cumulative"] = round(
                state_rainfall[state]["cumulative"] / n if n > 0 else 0, 2
            )
            state_rainfall[state]["cumulative"] = round(state_rainfall[state]["cumulative"], 2)

        return {
            "cyclone": cyclone_name,
            "dates": dates,
            "total_districts": len(metrics),
            "top_districts_cumulative": [
                {
                    "district": d,
                    "cumulative_rainfall": m["cumulative_rainfall"],
                    "max_daily": m["max_daily_rainfall"],
                    "rainy_days": m["rainy_day_count"],
                }
                for d, m in sorted_by_cumulative
            ],
            "top_districts_max_daily": [
                {
                    "district": d,
                    "max_daily_rainfall": m["max_daily_rainfall"],
                    "date_of_max": max(
                        m["daily_values"], key=lambda k: m["daily_values"][k]
                    ),
                }
                for d, m in sorted_by_max
            ],
            "daily_spread": daily_spread,
            "daily_totals": daily_totals,
            "flood_hotspots": {
                "high_risk_count": len(high_risk),
                "medium_risk_count": len(medium_risk),
                "high_risk_districts": list(high_risk.keys())[:20],
                "medium_risk_districts": list(medium_risk.keys())[:20],
            },
            "state_rainfall": state_rainfall,
        }

    def compare_cyclones(self) -> dict:
        """Compare rainfall metrics across all cyclones."""
        cyclones = ["amphan", "yaas", "remal"]
        comparison = {}

        for name in cyclones:
            data = self._load_cyclone(name)
            if not data:
                continue

            metrics = data.get("district_metrics", {})
            daily = data.get("daily_rainfall", {})
            flood = data.get("flood_indicators", {})
            dates = sorted(daily.keys())

            if not metrics:
                continue

            all_cumulatives = [m.get("cumulative_rainfall", 0) for m in metrics.values()]
            all_max_daily = [m.get("max_daily_rainfall", 0) for m in metrics.values()]

            # District with max rainfall
            max_district = max(metrics.items(), key=lambda x: x[1].get("cumulative_rainfall", 0))
            max_daily_district = max(metrics.items(), key=lambda x: x[1].get("max_daily_rainfall", 0))

            # Per-day average across all districts
            daily_averages = {}
            for date in dates:
                vals = list(daily[date].values())
                daily_averages[date] = round(sum(vals) / len(vals) if vals else 0, 2)

            comparison[name] = {
                "date_range": {"start": dates[0] if dates else None, "end": dates[-1] if dates else None},
                "total_days": len(dates),
                "mean_district_cumulative": round(sum(all_cumulatives) / len(all_cumulatives) if all_cumulatives else 0, 2),
                "max_district_cumulative": round(max(all_cumulatives) if all_cumulatives else 0, 2),
                "mean_district_max_daily": round(sum(all_max_daily) / len(all_max_daily) if all_max_daily else 0, 2),
                "max_daily_rainfall": round(max(all_max_daily) if all_max_daily else 0, 2),
                "most_affected_district": max_district[0],
                "most_affected_cumulative": max_district[1].get("cumulative_rainfall", 0),
                "highest_single_day_district": max_daily_district[0],
                "highest_single_day_value": max_daily_district[1].get("max_daily_rainfall", 0),
                "high_risk_districts": sum(1 for v in flood.values() if v.get("risk_level") == "HIGH"),
                "daily_averages": daily_averages,
            }

        return {"comparison": comparison, "cyclones": list(comparison.keys())}
