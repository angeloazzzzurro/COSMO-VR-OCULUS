#!/usr/bin/env python3
"""
Ricostruisce webxr/data/stars.json dai CSV reali HYG + Kepler KOI.
Include dati orbitali per le stelle host (periodo, raggio, temperatura, insolazione).

Uso:
    python atlas/build_stars.py
"""
import json, math, sys
from pathlib import Path

try:
    import pandas as pd
    import numpy as np
except ImportError:
    sys.exit("Installa le dipendenze: pip install pandas numpy")

ROOT     = Path(__file__).parent.parent
COSMO    = Path(__file__).parent.parent.parent / "cosmo"
HYG_CSV  = COSMO / "data" / "hyg_database.csv"
KOI_CSV  = COSMO / "data" / "kepler_koi.csv"
OUT_JSON = ROOT / "webxr" / "data" / "stars.json"

MAG_LIMIT    = 7.0    # limite magnitudine stelle HYG di sfondo
MATCH_RADIUS = 0.05   # gradi per crossmatch HYG↔KOI

def ra_dec_to_xyz(ra_deg, dec_deg):
    ra  = math.radians(ra_deg)
    dec = math.radians(dec_deg)
    return (
        math.cos(dec) * math.cos(ra),
        math.sin(dec),
       -math.cos(dec) * math.sin(ra),
    )

def safe_float(v, default=None):
    try:
        f = float(v)
        return None if math.isnan(f) or math.isinf(f) else round(f, 4)
    except (TypeError, ValueError):
        return default

# ── Carica HYG ────────────────────────────────────────────────────────────────
print("Carico HYG...")
hyg = pd.read_csv(HYG_CSV, low_memory=False)
hyg = hyg[hyg["mag"] <= MAG_LIMIT].copy()
hyg = hyg.dropna(subset=["ra", "dec", "mag"])
hyg["ra_deg"] = hyg["ra"] * 15.0
hyg["label"]  = hyg["proper"].fillna(hyg["bf"]).fillna("HIP " + hyg["hip"].astype(str)).str.strip()
hyg["spect"]  = hyg["spect"].str[0].fillna("?")
hyg = hyg.reset_index(drop=True)
print(f"  {len(hyg):,} stelle (mag ≤ {MAG_LIMIT})")

# ── Carica KOI (solo CONFIRMED + CANDIDATE) ───────────────────────────────────
print("Carico KOI...")
koi = pd.read_csv(KOI_CSV, comment="#", low_memory=False)
koi = koi[koi["koi_disposition"].str.contains("CONFIRMED|CANDIDATE", na=False, case=False)].copy()
koi = koi.rename(columns={"ra": "ra_deg", "dec": "dec"})
koi = koi.reset_index(drop=True)
print(f"  {len(koi):,} oggetti KOI (CONFIRMED + CANDIDATE)")

# ── Raggruppa pianeti per stella host (stesso ra/dec) ─────────────────────────
# Per ogni stella host teniamo: n_planets, koi_score max, e i dati del pianeta
# con score più alto (periodo, raggio, temp, insolazione)
agg = koi.groupby(["ra_deg", "dec"]).agg(
    n_planets   = ("koi_score",  "count"),
    koi_score   = ("koi_score",  "max"),
    period      = ("koi_period", "first"),
    prad        = ("koi_prad",   "first"),   # raggio pianeta [R⊕]
    teq         = ("koi_teq",    "first"),   # temperatura equilibrio [K]
    insol       = ("koi_insol",  "first"),   # insolazione [S⊕]
).reset_index()

# ── Crossmatch HYG ↔ KOI ─────────────────────────────────────────────────────
print("Crossmatch HYG ↔ KOI...")
hyg["n_planets"] = 0
hyg["koi_score"] = 0.0
hyg["has_planet"] = False
hyg["period"]    = np.nan
hyg["prad"]      = np.nan
hyg["teq"]       = np.nan
hyg["insol"]     = np.nan

hyg_ra  = hyg["ra_deg"].values
hyg_dec = hyg["dec"].values

matched = 0
for _, row in agg.iterrows():
    d = np.sqrt((hyg_ra - row["ra_deg"])**2 + (hyg_dec - row["dec"])**2)
    best = d.argmin()
    if d[best] < MATCH_RADIUS:
        hyg.at[best, "has_planet"] = True
        hyg.at[best, "n_planets"] = int(row["n_planets"])
        hyg.at[best, "koi_score"] = float(row["koi_score"])
        hyg.at[best, "period"]    = row["period"]
        hyg.at[best, "prad"]      = row["prad"]
        hyg.at[best, "teq"]       = row["teq"]
        hyg.at[best, "insol"]     = row["insol"]
        matched += 1

print(f"  {matched} stelle HYG con esopianeti")

# ── Aggiungi stelle host KOI non trovate in HYG ──────────────────────────────
print("Aggiungo stelle host KOI non in HYG...")
koi_hosts = koi.rename(columns={"ra": "ra_deg"}).groupby(["ra_deg", "dec"]).agg(
    n_planets  = ("koi_score",   "count"),
    koi_score  = ("koi_score",   "max"),
    period     = ("koi_period",  "first"),
    prad       = ("koi_prad",    "first"),
    teq        = ("koi_teq",     "first"),
    insol      = ("koi_insol",   "first"),
    kepmag     = ("koi_kepmag",  "first"),
    name       = ("kepoi_name",  "first"),
).reset_index()

hyg_ra_arr  = hyg["ra_deg"].values
hyg_dec_arr = hyg["dec"].values
extra_rows  = []
for _, h in koi_hosts.iterrows():
    d = np.sqrt((hyg_ra_arr - h["ra_deg"])**2 + (hyg_dec_arr - h["dec"])**2)
    if d.min() >= MATCH_RADIUS:
        mag = safe_float(h["kepmag"]) or 12.0
        extra_rows.append({
            "label":      str(h["name"]),
            "ra_deg":     float(h["ra_deg"]),
            "dec":        float(h["dec"]),
            "mag":        mag,
            "spect":      "?",
            "has_planet": True,
            "n_planets":  int(h["n_planets"]),
            "koi_score":  safe_float(h["koi_score"]) or 0.0,
            "period":     h["period"],
            "prad":       h["prad"],
            "teq":        h["teq"],
            "insol":      h["insol"],
        })

print(f"  {len(extra_rows)} stelle host KOI aggiunte (non presenti in HYG)")

# ── Esporta JSON ──────────────────────────────────────────────────────────────
print("Esporto JSON...")
all_stars = list(hyg.to_dict("records")) + extra_rows
records = []
for row in all_stars:
    x, y, z = ra_dec_to_xyz(float(row["ra_deg"]), float(row["dec"]))
    rec = {
        "label":      str(row["label"]),
        "ra":         safe_float(row["ra_deg"]),
        "dec":        safe_float(row["dec"]),
        "mag":        safe_float(row["mag"]),
        "spect":      str(row["spect"])[:1],
        "has_planet": bool(row["has_planet"]),
        "n_planets":  int(row["n_planets"]),
        "koi_score":  safe_float(row["koi_score"]) or 0.0,
        "x": round(x, 6), "y": round(y, 6), "z": round(z, 6),
    }
    if row["has_planet"]:
        rec["period"] = safe_float(row.get("period"))
        rec["prad"]   = safe_float(row.get("prad"))
        rec["teq"]    = safe_float(row.get("teq"))
        rec["insol"]  = safe_float(row.get("insol"))
    records.append(rec)

OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump(records, f, separators=(",", ":"))

hosts = sum(1 for r in records if r["has_planet"])
print(f"[OK] {len(records):,} stelle → {OUT_JSON}")
print(f"[OK] {hosts} stelle host con dati orbitali")
