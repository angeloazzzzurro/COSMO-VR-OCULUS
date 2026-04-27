# COSMO VR — Exoplanet Atlas for Oculus Quest 2

Versione immersiva VR di [COSMO](https://github.com/angeloazzzzurro/cosmo): un atlante interattivo di stelle ed esopianeti Kepler, visualizzato dall'interno di una sfera celeste.

Tecnologia: **Three.js + WebXR** — nessuna app da installare, si apre direttamente nel browser del Quest 2.

---

## Come usarlo su Oculus Quest 2

1. Apri **Meta Browser** sul visore
2. Naviga all'URL dove hai hostato il progetto (es. GitHub Pages, Vercel, localhost)
3. Premi **ENTRA IN VR**
4. Sei dentro la sfera celeste — guarda intorno con la testa
5. **Grilletto** → seleziona una stella (mostra pannello info 3D)
6. **Joystick** → ruota la sfera stellare
7. **Grip** → chiude il pannello info

### Desktop / browser normale
- **Trascina** per ruotare il cielo
- **Scroll** per zoom
- **Click** su una stella per info

---

## Struttura progetto

```
COSMO-VR-OCULUS/
├── webxr/
│   ├── index.html          Entry point WebXR
│   ├── js/
│   │   ├── main.js         Scena Three.js, WebXR, controlli, raycasting
│   │   ├── starfield.js    Geometria stelle (Points + InstancedMesh)
│   │   ├── controllers.js  Controller Quest 2, raycasting VR
│   │   └── demo_data.js    Dati demo (stelle famose + casuali)
│   └── data/
│       └── stars.json      ← generato da export_webxr.py (vedi sotto)
└── atlas/
    └── export_webxr.py     Export JSON dalla pipeline COSMO originale
```

---

## Collegare la pipeline COSMO originale

Per usare i dati reali (9K stelle + KOI Kepler) invece dei dati demo:

```bash
# 1. Clona COSMO originale
git clone https://github.com/angeloazzzzurro/cosmo
cd cosmo

# 2. Copia lo script di export
cp ../COSMO-VR-OCULUS/atlas/export_webxr.py atlas/

# 3. Installa dipendenze COSMO se non le hai
pip install -r requirements.txt

# 4. Genera il JSON (adatta l'import in export_webxr.py se necessario)
python atlas/export_webxr.py

# 5. Copia il JSON generato nella cartella webxr/data/
cp webxr/data/stars.json ../COSMO-VR-OCULUS/webxr/data/
```

Il file `stars.json` viene caricato automaticamente. Se non trovato, il frontend usa i **dati demo** con stelle famose reali (Sirius, Betelgeuse, TRAPPIST-1, Kepler-452, ecc.) + ~500 stelle casuali.

---

## Hosting locale rapido

```bash
# Python
cd webxr && python -m http.server 8080

# Node
cd webxr && npx serve .
```

Poi apri `http://localhost:8080` — oppure usa ngrok/Tailscale per accederci dal Quest 2.

> **Nota:** WebXR richiede HTTPS o localhost. Per il Quest 2 in rete locale usa ngrok o un certificato self-signed.

---

## Legenda colori stelle con esopianeti

| Colore | Significato |
|--------|-------------|
| Oro    | 1 esopianeta |
| Arancio | 2–3 esopianeti |
| Rosso  | 4+ esopianeti |

Stelle senza esopianeti sono colorate per tipo spettrale (O→blu, M→arancio).

---

## Tech stack

- [Three.js r158](https://threejs.org/) — rendering 3D
- [WebXR Device API](https://immersiveweb.dev/) — interfaccia VR
- Python (Astropy, Pandas, PyTorch) — pipeline dati originale COSMO
