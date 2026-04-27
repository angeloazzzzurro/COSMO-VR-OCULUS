#!/usr/bin/env python3
"""
COSMO — Export WebXR
====================
Esporta il catalogo stelle elaborato dalla pipeline COSMO in un JSON
compatibile con il frontend Three.js/WebXR.

Utilizzo (dalla root del progetto COSMO originale):
    python atlas/export_webxr.py

Output: webxr/data/stars.json

Coordinate: converte RA/Dec in coordinate cartesiane Three.js (Y-up, -Z forward)
    x =  cos(dec) * cos(ra)
    y =  sin(dec)              ← asse verticale Three.js
    z = -cos(dec) * sin(ra)    ← profondita' (negato per handedness Three.js)
"""

import json
import math
import os
import sys

try:
    import pandas as pd
    import numpy as np
except ImportError:
    sys.exit("Installa le dipendenze: pip install pandas numpy")

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "webxr", "data", "stars.json")


def ra_dec_to_xyz(ra_deg: float, dec_deg: float) -> dict:
    ra  = math.radians(ra_deg)
    dec = math.radians(dec_deg)
    return {
        "x":  math.cos(dec) * math.cos(ra),
        "y":  math.sin(dec),
        "z": -math.cos(dec) * math.sin(ra),
    }


def export_stars(stars_df: "pd.DataFrame", output_path: str = OUTPUT_PATH) -> list:
    """
    Esporta un DataFrame di stelle in JSON per WebXR.

    Colonne attese nel DataFrame:
        ra_deg, dec, mag, label, spect_class,
        has_planet (bool), n_planets (int), koi_score (float, opzionale)

    Restituisce la lista di record esportati.
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    records = []

    for _, row in stars_df.iterrows():
        xyz = ra_dec_to_xyz(float(row["ra_deg"]), float(row["dec"]))

        koi_raw = row.get("koi_score", 0.0)
        koi_val = float(koi_raw) if pd.notna(koi_raw) else 0.0

        record = {
            "label":     str(row["label"]),
            "ra":        float(row["ra_deg"]),
            "dec":       float(row["dec"]),
            "mag":       float(row["mag"]),
            "spect":     str(row.get("spect_class", "?"))[:1],
            "has_planet": bool(row.get("has_planet", False)),
            "n_planets": int(row.get("n_planets", 0)),
            "koi_score": round(koi_val, 4),
            **xyz,
        }
        records.append(record)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(records, f, separators=(",", ":"))

    n_hosts = sum(1 for r in records if r["has_planet"])
    print(f"[COSMO Export] {len(records):,} stelle → {output_path}")
    print(f"[COSMO Export] Stelle con esopianeti: {n_hosts}")
    return records


# ─── Entry point ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Adatta l'import in base alla struttura del tuo progetto COSMO originale.
    # Esempio: from atlas.map import build_star_catalog
    try:
        sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
        from atlas.map import build_star_catalog   # <-- aggiusta se necessario
        print("[COSMO Export] Costruzione catalogo stelle...")
        df = build_star_catalog()
        export_stars(df)
    except ImportError as e:
        print(f"[COSMO Export] Errore import: {e}")
        print("[COSMO Export] Assicurati di eseguire dalla root del progetto COSMO.")
        print("[COSMO Export] Oppure usa export_stars(df) direttamente dal tuo script.")
        sys.exit(1)
