"""
Graph Processor
Computes the flood propagation graph state for one cyclone + date.

Data sources:
  1. NASA rainfall  — from processed_data/rainfall/{cyclone}.json (existing pipeline)
  2. district_flood_risk_cleaned.csv  — district-level historical risk metrics
  3. flood_inventory_cleaned_2000plus.csv — dated flood events (multi-district rows)
  4. gadm41_IND_2.json — centroids + adjacency

Key facts about the CSVs (confirmed from actual files):
  - district_flood_risk_cleaned.csv: columns are district (name only, no state),
    percent_flooded_area, parmanent_water, corrected_percent_flooded_area,
    human_fatality, human_injured, population, mean_flood_duration
  - flood_inventory_cleaned_2000plus.csv: district column is a COMMA-SEPARATED
    string of district names per event row. Dates are start_date / end_date.
"""

import json
import logging
import math
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

RAINFALL_NODE_THRESHOLD   = 10.0    # mm/day — minimum to show a node
EXTREME_RAIN_FLOOD_THRESH = 150.0   # mm/day — infer flood if no event record
ADJACENCY_DEG_RADIUS      = 0.7     # degrees — centroid proximity for true adjacency


class GraphProcessor:
    def __init__(self, base_dir: Path):
        self.base_dir     = base_dir
        self.processed_dir = base_dir / "processed_data" / "rainfall"
        self.risk_csv     = base_dir / "district_flood_risk_cleaned.csv"
        self.flood_csv    = base_dir / "flood_inventory_cleaned_2000plus.csv"
        self.geojson_file = base_dir / "gadm41_IND_2.json"

        self._risk_df:   Optional[pd.DataFrame] = None   # keyed by lowercase district name
        self._flood_df:  Optional[pd.DataFrame] = None   # exploded to one district per row
        self._centroids: Optional[Dict[str, Tuple[float, float]]] = None  # district_id → (lon, lat)
        self._adjacency: Optional[Dict[str, List[str]]] = None            # district_id → [neighbors]
        self._global_means: Optional[dict] = None

    # ─────────────────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────────────────

    def get_graph_state(self, cyclone: str, selected_date: str) -> dict:
        self._ensure_loaded()

        # Normalise: selected_date may be a raw IMERG filename stem
        iso_date = self._parse_date(selected_date)

        rainfall = self._load_rainfall(cyclone, selected_date, iso_date)
        if rainfall is None:
            return {"nodes": [], "edges": [], "stats": {}}

        flooded_set = self._detect_flooded(iso_date, rainfall)

        nodes = []
        node_ids: set = set()
        for district_id, mm in rainfall.items():
            if mm < RAINFALL_NODE_THRESHOLD:
                continue
            node = self._build_node(district_id, mm, flooded_set)
            if node:
                nodes.append(node)
                node_ids.add(district_id)

        edges = self._build_edges(flooded_set, node_ids, rainfall)
        self._apply_neighbor_amplification(nodes, flooded_set)

        stats = {
            "total_nodes":      len(nodes),
            "flooded_nodes":    sum(1 for n in nodes if n["flooded"]),
            "total_edges":      len(edges),
            "high_risk_nodes":  sum(1 for n in nodes if n["risk_level"] == "HIGH"),
            "moderate_risk_nodes": sum(1 for n in nodes if n["risk_level"] == "MODERATE"),
        }
        return {"nodes": nodes, "edges": edges, "stats": stats}

    def get_district_risk_detail(self, district_id: str) -> dict:
        self._ensure_loaded()
        return self._get_risk_record(district_id)

    # ─────────────────────────────────────────────────────────────────────────
    # Startup preload (called explicitly from FastAPI lifespan)
    # ─────────────────────────────────────────────────────────────────────────

    def preload(self):
        """Load all static data at server startup, not on first request."""
        self._load_risk_csv()
        self._load_flood_csv()
        self._load_centroids()
        self._build_adjacency()

    def _ensure_loaded(self):
        """Fallback guard — preload() should have run already."""
        if self._risk_df is None:   self._load_risk_csv()
        if self._flood_df is None:  self._load_flood_csv()
        if self._centroids is None: self._load_centroids()
        if self._adjacency is None: self._build_adjacency()

    # ─────────────────────────────────────────────────────────────────────────
    # Date parsing helper
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _parse_date(raw: str) -> str:
        """
        Extract a YYYY-MM-DD string from any input, including full IMERG filenames
        like '3B-DAY.MS.MRG.3IMERG.20200515-S000000-E235959.V07B'.

        Returns the ISO date string, or raises ValueError if no date found.
        """
        # Already ISO format
        if re.match(r'^\d{4}-\d{2}-\d{2}$', raw):
            return raw
        # Find 8-digit compact date YYYYMMDD anywhere in the string
        m = re.search(r'(\d{4})(\d{2})(\d{2})', raw)
        if m:
            return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
        raise ValueError(f"Cannot extract a date from: {raw}")

    def _load_risk_csv(self):
        if not self.risk_csv.exists():
            logger.warning("district_flood_risk_cleaned.csv not found")
            self._risk_df = pd.DataFrame()
            return
        df = pd.read_csv(self.risk_csv)
        df.columns = [c.strip().lower() for c in df.columns]
        # normalise typo: 'parmanent_water' → 'permanent_water'
        df = df.rename(columns={"parmanent_water": "permanent_water"})
        # lowercase district name for matching
        df["_district_key"] = df["district"].str.strip().str.lower()
        self._risk_df = df
        # precompute global means for fallback
        num_cols = ["percent_flooded_area", "permanent_water",
                    "corrected_percent_flooded_area", "human_fatality",
                    "human_injured", "population", "mean_flood_duration"]
        self._global_means = {c: float(df[c].mean()) for c in num_cols if c in df.columns}
        logger.info(f"Loaded risk CSV: {len(df)} rows")

    def _load_flood_csv(self):
        if not self.flood_csv.exists():
            logger.warning("flood_inventory_cleaned_2000plus.csv not found")
            self._flood_df = pd.DataFrame()
            return
        df = pd.read_csv(self.flood_csv, low_memory=False)
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
        df["start_date"] = pd.to_datetime(df["start_date"], errors="coerce")
        df["end_date"]   = pd.to_datetime(df["end_date"],   errors="coerce")

        # Explode comma-separated district column → one district per row
        df["district"] = df["district"].fillna("").astype(str)
        rows = []
        for _, row in df.iterrows():
            districts = [d.strip() for d in row["district"].split(",") if d.strip()]
            if not districts:
                continue
            for d in districts:
                r = row.copy()
                r["_district_single"] = d.strip().lower()
                rows.append(r)
        if rows:
            self._flood_df = pd.DataFrame(rows).reset_index(drop=True)
        else:
            self._flood_df = pd.DataFrame()
        logger.info(f"Loaded flood CSV: {len(self._flood_df)} exploded rows")

    def _load_centroids(self):
        self._centroids = {}
        if not self.geojson_file.exists():
            logger.warning("gadm41_IND_2.json not found — no centroids available")
            return
        with open(self.geojson_file) as f:
            gj = json.load(f)
        for feat in gj.get("features", []):
            props = feat.get("properties", {})
            state    = props.get("NAME_1", "").strip()
            district = props.get("NAME_2", "").strip()
            did = f"{state} - {district}"
            cx, cy = self._geom_centroid(feat.get("geometry", {}))
            if cx is not None:
                self._centroids[did] = (cx, cy)
        logger.info(f"Loaded {len(self._centroids)} district centroids")

    def _geom_centroid(self, geom: dict) -> Tuple[Optional[float], Optional[float]]:
        gtype  = geom.get("type", "")
        coords = geom.get("coordinates", [])
        pts: list = []
        try:
            if gtype == "Polygon":
                pts = coords[0] if coords else []
            elif gtype == "MultiPolygon":
                for poly in coords:
                    pts.extend(poly[0] if poly else [])
            if pts:
                return float(np.mean([p[0] for p in pts])), float(np.mean([p[1] for p in pts]))
        except Exception:
            pass
        return None, None

    def _build_adjacency(self):
        self._adjacency = {did: [] for did in self._centroids}
        ids = list(self._centroids.keys())
        for i, a in enumerate(ids):
            ax, ay = self._centroids[a]
            for b in ids[i + 1:]:
                bx, by = self._centroids[b]
                if math.sqrt((ax - bx) ** 2 + (ay - by) ** 2) <= ADJACENCY_DEG_RADIUS:
                    self._adjacency[a].append(b)
                    self._adjacency[b].append(a)
        logger.info("Adjacency graph built")

    # ─────────────────────────────────────────────────────────────────────────
    # Rainfall
    # ─────────────────────────────────────────────────────────────────────────

    def _load_rainfall(self, cyclone: str, raw_date: str,
                       iso_date: str) -> Optional[Dict[str, float]]:
        """
        Load rainfall for a date from the processed JSON.
        The JSON may be keyed by the raw IMERG filename stem OR by ISO date —
        try both.
        """
        f = self.processed_dir / f"{cyclone}.json"
        if not f.exists():
            return None
        with open(f) as fp:
            data = json.load(fp)
        daily = data.get("daily_rainfall", {})
        # Try exact key first (raw filename stem as stored by rainfall_processor)
        if raw_date in daily:
            return daily[raw_date]
        # Fallback: ISO date
        if iso_date in daily:
            return daily[iso_date]
        # Last resort: scan keys for matching 8-digit date
        for key, val in daily.items():
            try:
                if self._parse_date(key) == iso_date:
                    return val
            except ValueError:
                pass
        return None

    # ─────────────────────────────────────────────────────────────────────────
    # Flood Detection
    # ─────────────────────────────────────────────────────────────────────────

    def _detect_flooded(self, iso_date: str, rainfall: Dict[str, float]) -> set:
        """
        iso_date is always a clean YYYY-MM-DD string.
        Ground truth: flood inventory event window covers this date.
        Fallback: rainfall >= 150 mm/day.
        """
        flooded: set = set()
        target = pd.Timestamp(iso_date)

        # Ground truth from flood inventory
        if not self._flood_df.empty and "start_date" in self._flood_df.columns:
            mask = (self._flood_df["start_date"] <= target) & \
                   (self._flood_df["end_date"]   >= target)
            events = self._flood_df[mask]
            for _, row in events.iterrows():
                raw_name = str(row.get("_district_single", ""))
                state    = str(row.get("state", ""))
                did = self._resolve_district_id(raw_name, state)
                if did:
                    flooded.add(did)

        # Rainfall inference fallback
        for did, mm in rainfall.items():
            if mm >= EXTREME_RAIN_FLOOD_THRESH:
                flooded.add(did)

        return flooded

    # ─────────────────────────────────────────────────────────────────────────
    # Node Building
    # ─────────────────────────────────────────────────────────────────────────

    def _build_node(self, district_id: str, mm: float, flooded_set: set) -> Optional[dict]:
        centroid = self._centroids.get(district_id) or self._infer_centroid(district_id)
        if centroid is None:
            return None

        risk = self._get_risk_record(district_id)
        risk_score = self._compute_risk_score(mm, risk, district_id in flooded_set)
        risk_level = self._risk_level(risk_score)

        parts       = district_id.split(" - ", 1)
        state       = parts[0] if len(parts) == 2 else ""
        district_nm = parts[1] if len(parts) == 2 else district_id

        return {
            "id":            district_id,
            "district":      district_nm,
            "state":         state,
            "lon":           centroid[0],
            "lat":           centroid[1],
            "rainfall_mm":   round(mm, 2),
            "flooded":       district_id in flooded_set,
            "risk_score":    round(risk_score, 3),
            "risk_level":    risk_level,
            # from risk CSV
            "susceptibility":          round(risk.get("susceptibility_score", 0), 3),
            "fatality_rate":           round(risk.get("fatality_rate", 0), 6),
            "population":              int(risk.get("population", 0)),
            "mean_flood_duration":     round(risk.get("mean_flood_duration", 0), 2),
            "corrected_flooded_pct":   round(risk.get("corrected_percent_flooded_area", 0), 2),
            "percent_flooded_area":    round(risk.get("percent_flooded_area", 0), 2),
            "human_fatality":          int(risk.get("human_fatality", 0)),
            "human_injured":           int(risk.get("human_injured", 0)),
            # size tier: 0=normal(>10mm), 1=large(>50mm), 2=highlight(>100mm)
            "size_tier":     2 if mm > 100 else (1 if mm > 50 else 0),
            # filled in later by amplification pass
            "neighbor_flood_influence": 0.0,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Edge Building
    # ─────────────────────────────────────────────────────────────────────────

    def _build_edges(self, flooded_set: set, node_ids: set,
                     rainfall: Dict[str, float]) -> list:
        """
        Draw directed edges between ALL pairs of adjacent active nodes.
        Direction rule:
          - flooded src → any neighbor = flood propagation (always directed src→tgt)
          - non-flooded: higher rainfall → lower rainfall (water flows downhill)
        Only one edge per pair (no duplicates).
        """
        edges = []
        seen: set = set()
        for src in node_ids:
            src_flooded  = src in flooded_set
            src_rainfall = rainfall.get(src, 0)
            for tgt in self._adjacency.get(src, []):
                if tgt not in node_ids:
                    continue
                # Canonical pair key — undirected dedup
                pair = (min(src, tgt), max(src, tgt))
                if pair in seen:
                    continue
                seen.add(pair)
                tgt_flooded  = tgt in flooded_set
                tgt_rainfall = rainfall.get(tgt, 0)
                # Determine direction
                if src_flooded and not tgt_flooded:
                    source, target = src, tgt
                elif tgt_flooded and not src_flooded:
                    source, target = tgt, src
                elif src_rainfall >= tgt_rainfall:
                    source, target = src, tgt
                else:
                    source, target = tgt, src
                tgt_mm = rainfall.get(target, 0)
                edges.append({
                    "source":           source,
                    "target":           target,
                    "source_rainfall":  rainfall.get(source, 0),
                    "target_rainfall":  tgt_mm,
                    "target_flooded":   target in flooded_set,
                    "target_size_tier": 2 if tgt_mm > 100 else (1 if tgt_mm > 50 else 0),
                })
        return edges

    # ─────────────────────────────────────────────────────────────────────────
    # Risk Scoring
    # ─────────────────────────────────────────────────────────────────────────

    def _compute_risk_score(self, mm: float, risk: dict, flooded: bool) -> float:
        rain_w  = min(mm / 250.0, 1.0) * 0.40
        susc_w  = min(risk.get("susceptibility_score", 0), 1.0) * 0.25
        dur_w   = min(risk.get("mean_flood_duration", 0) / 30.0, 1.0) * 0.15
        fat_w   = min(risk.get("fatality_rate", 0) * 1000, 1.0) * 0.10
        flood_w = 0.10 if flooded else 0.0
        return rain_w + susc_w + dur_w + fat_w + flood_w

    def _apply_neighbor_amplification(self, nodes: list, flooded_set: set):
        node_map = {n["id"]: n for n in nodes}
        for did in flooded_set:
            for nbr in self._adjacency.get(did, []):
                if nbr not in node_map:
                    continue
                influence = 0.12
                node_map[nbr]["neighbor_flood_influence"] = round(
                    node_map[nbr]["neighbor_flood_influence"] + influence, 3)
                node_map[nbr]["risk_score"] = round(
                    min(node_map[nbr]["risk_score"] + influence, 1.0), 3)
                node_map[nbr]["risk_level"] = self._risk_level(node_map[nbr]["risk_score"])

    def _risk_level(self, score: float) -> str:
        if score >= 0.60: return "HIGH"
        if score >= 0.35: return "MODERATE"
        return "LOW"

    # ─────────────────────────────────────────────────────────────────────────
    # Risk Record Lookup — 4-level fallback
    # ─────────────────────────────────────────────────────────────────────────

    def _get_risk_record(self, district_id: str) -> dict:
        if self._risk_df is None or self._risk_df.empty:
            return self._empty_risk()

        # Extract just the district name part (e.g. "West Bengal - Kolkata" → "Kolkata")
        parts = district_id.split(" - ", 1)
        district_name = parts[1] if len(parts) == 2 else district_id

        # 1. Direct match by district name
        row = self._match_risk_row(district_name)
        if row is not None:
            return self._row_to_risk(row)

        # 2. Neighbor mean
        nbr_recs = []
        for nbr in self._adjacency.get(district_id, [])[:6]:
            nbr_parts = nbr.split(" - ", 1)
            nbr_name  = nbr_parts[1] if len(nbr_parts) == 2 else nbr
            r = self._match_risk_row(nbr_name)
            if r is not None:
                nbr_recs.append(self._row_to_risk(r))
        if nbr_recs:
            return self._mean_of_records(nbr_recs)

        # 3. State mean (districts sharing same state prefix)
        if len(parts) == 2:
            state = parts[0]
            state_recs = []
            for did2, _ in self._centroids.items():
                if did2.startswith(state + " - ") and did2 != district_id:
                    p2 = did2.split(" - ", 1)
                    r = self._match_risk_row(p2[1] if len(p2) == 2 else did2)
                    if r is not None:
                        state_recs.append(self._row_to_risk(r))
                        if len(state_recs) >= 10:
                            break
            if state_recs:
                return self._mean_of_records(state_recs)

        # 4. Global mean
        return self._global_mean_record()

    def _match_risk_row(self, district_name: str):
        """Look up a district in the risk CSV by name (case-insensitive)."""
        if self._risk_df is None or self._risk_df.empty:
            return None
        key = district_name.strip().lower()
        matches = self._risk_df[self._risk_df["_district_key"] == key]
        if not matches.empty:
            return matches.iloc[0]
        # Partial match fallback
        matches = self._risk_df[self._risk_df["_district_key"].str.contains(key, na=False)]
        return matches.iloc[0] if not matches.empty else None

    def _row_to_risk(self, row) -> dict:
        def g(col, default=0.0):
            try:
                v = row.get(col, default)
                return float(v) if pd.notna(v) else default
            except Exception:
                return default

        pct  = g("percent_flooded_area")
        perm = g("permanent_water")
        corr = g("corrected_percent_flooded_area")
        fat  = g("human_fatality")
        inj  = g("human_injured")
        pop  = g("population", 100000)
        dur  = g("mean_flood_duration")

        susc     = min((pct / 100.0) * 0.5 + (dur / 30.0) * 0.3 +
                       (fat / max(pop, 1)) * 1000 * 0.2, 1.0)
        fat_rate = fat / max(pop, 1)

        return {
            "percent_flooded_area":           round(pct, 4),
            "permanent_water":                round(perm, 4),
            "corrected_percent_flooded_area": round(corr, 4),
            "human_fatality":                 int(fat),
            "human_injured":                  int(inj),
            "population":                     int(pop),
            "mean_flood_duration":            round(dur, 2),
            "susceptibility_score":           round(susc, 4),
            "fatality_rate":                  round(fat_rate, 6),
        }

    def _mean_of_records(self, records: list) -> dict:
        if not records:
            return self._empty_risk()
        result = {}
        for k in records[0]:
            vals = [r[k] for r in records if isinstance(r.get(k), (int, float))]
            result[k] = round(float(np.mean(vals)), 4) if vals else 0.0
        return result

    def _global_mean_record(self) -> dict:
        if not self._global_means:
            return self._empty_risk()
        g = self._global_means
        pct  = g.get("percent_flooded_area", 0)
        dur  = g.get("mean_flood_duration", 0)
        pop  = g.get("population", 100000)
        fat  = g.get("human_fatality", 0)
        susc = min((pct / 100.0) * 0.5 + (dur / 30.0) * 0.3 +
                   (fat / max(pop, 1)) * 1000 * 0.2, 1.0)
        return {
            "percent_flooded_area":           round(pct, 4),
            "permanent_water":                round(g.get("permanent_water", 0), 4),
            "corrected_percent_flooded_area": round(g.get("corrected_percent_flooded_area", 0), 4),
            "human_fatality":                 int(g.get("human_fatality", 0)),
            "human_injured":                  int(g.get("human_injured", 0)),
            "population":                     int(pop),
            "mean_flood_duration":            round(dur, 2),
            "susceptibility_score":           round(susc, 4),
            "fatality_rate":                  round(fat / max(pop, 1), 6),
        }

    def _empty_risk(self) -> dict:
        return {
            "percent_flooded_area": 0.0, "permanent_water": 0.0,
            "corrected_percent_flooded_area": 0.0, "human_fatality": 0,
            "human_injured": 0, "population": 0, "mean_flood_duration": 0.0,
            "susceptibility_score": 0.0, "fatality_rate": 0.0,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Helpers
    # ─────────────────────────────────────────────────────────────────────────

    def _resolve_district_id(self, raw_name: str, state: str) -> Optional[str]:
        """
        Find a canonical 'State - District' key from the centroids dict
        given a raw district name and optionally a state name.
        """
        raw_l  = raw_name.strip().lower()
        state_l = state.strip().lower()

        # Exact name match with state filter
        for did in self._centroids:
            parts = did.split(" - ", 1)
            if len(parts) != 2:
                continue
            if parts[1].strip().lower() == raw_l:
                if not state_l or parts[0].strip().lower() == state_l:
                    return did

        # Exact name match without state
        for did in self._centroids:
            parts = did.split(" - ", 1)
            if len(parts) == 2 and parts[1].strip().lower() == raw_l:
                return did

        # Partial / contains match
        for did in self._centroids:
            parts = did.split(" - ", 1)
            if len(parts) == 2 and raw_l in parts[1].strip().lower():
                return did

        return None

    def _infer_centroid(self, district_id: str) -> Optional[Tuple[float, float]]:
        """Approximate centroid from neighboring districts."""
        pts = [self._centroids[n] for n in self._adjacency.get(district_id, [])
               if n in self._centroids]
        if pts:
            return float(np.mean([p[0] for p in pts])), float(np.mean([p[1] for p in pts]))
        return None