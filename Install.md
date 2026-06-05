# AirPulse — Installation Guide

Interactive sonic visualization of air quality data, built with Next.js, Mapbox, Web MIDI, and pd4web.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 18+ | Next.js runtime |
| **npm** | 9+ | Package management |
| **Python** | 3.9+ | Data pipeline (fetching air quality data) |
| **Git** | any | Cloning the repo |

Optional:

| Tool | Purpose |
|------|---------|
| **MIDI controller** | Physical knob control for map navigation (CC 23 = zoom, CC 24 = station hop) |
| **pd4web** | Only needed if you want to recompile the Pure Data audio patch |

---

## 1. Clone and Install

```bash
git clone <repository-url>
cd geo-learn
npm install
```

---

## 2. Environment Variables

Create a `.env` file in the project root with the following API keys:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
NEXT_PUBLIC_OPENAQ_TOKEN=your_openaq_token
NEXT_PUBLIC_WAQI_TOKEN=your_waqi_token
```

### Where to get the keys

| Variable | Sign up at |
|----------|-----------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | [mapbox.com/account](https://account.mapbox.com/) — create a free account and copy your default public token |
| `NEXT_PUBLIC_OPENAQ_TOKEN` | [openaq.org](https://explore.openaq.org/) — register for an API key |
| `NEXT_PUBLIC_WAQI_TOKEN` | [aqicn.org/data-platform/token](https://aqicn.org/data-platform/token/) — request a free token |

---

## 3. Populate the Database

The app reads air quality data from a local SQLite database. You need to run the Python data pipeline at least once to populate it.

```bash
cd data-pipeline

# Create a virtual environment (recommended)
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Run the ETL script
python fetch_climate.py
```

You should see output like:

```
tokens loaded successfully
fetching opeAQ data
fetching WAQI data
transforming data to GeoJSON
loading data into sqlite database
data saved to ecopulse.db
```

This creates `ecopulse.db` with the latest air quality readings from OpenAQ and WAQI. You can re-run this script anytime to refresh the data.

```bash
cd ..
```

---

## 4. Run the Dev Server

```bash
npm run dev
```

Open **http://localhost:3000** in Chrome (recommended for Web MIDI and Web Audio support).

### First-time usage

1. The page shows an overlay with **"AirPulse Audio Engine"**
2. Wait for the WASM download to complete (~2.7 MB)
3. Click **"CLICK TO INITIALIZE AUDIO"** to start the audio engine
4. The Mapbox map loads with colored circles representing air quality stations
5. Hover over stations to send PM2.5 values to the audio engine
6. If a MIDI controller is connected, use CC 23 to zoom and CC 24 to hop between stations

---

## 5. Recompiling the PD Patch (Optional)

The compiled pd4web files (`pd4web.js`, `pd4web.wasm`, `pd4web.data`, `index.pd`) are already included in `public/audio/`. You only need this step if you modify `airpulse.pd`.

### Install pd4web

```bash
pip install pd4web
```

### Compile

```bash
cd public/audio
pd4web --patch airpulse.pd
```

This regenerates the WASM bundle and `index.pd` in the `WebPatch/` output directory. Copy the runtime files to `public/audio/`:

```bash
copy WebPatch\pd4web.js .
copy WebPatch\pd4web.wasm .
copy WebPatch\pd4web.data .
copy WebPatch\index.pd .
copy WebPatch\pd4web.threads.js .
```

On macOS/Linux use `cp` instead of `copy`.

```bash
cd ../..
```

---

## Project Structure

```
geo-learn/
├── app/
│   ├── api/climate-data/    # Next.js API route — reads from SQLite
│   ├── layout.js            # Root layout
│   └── page.js              # Main page — map + audio integration
├── components/
│   └── StationPopup.js      # Tooltip when hovering a station
├── config/
│   └── mapConfig.js         # Mapbox token, MIDI CC mappings, layer styles
├── data-pipeline/
│   ├── fetch_climate.py     # ETL script — fetches OpenAQ + WAQI data
│   ├── requirements.txt     # Python dependencies
│   └── ecopulse.db          # SQLite database (generated)
├── hooks/
│   ├── useClimateData.js    # Fetches GeoJSON from the API route
│   ├── useMidiControl.js    # Web MIDI CC → map zoom + station navigation
│   └── usePdAudio.js        # pd4web integration — loads WASM, sends PM2.5
├── public/audio/
│   ├── airpulse.pd          # Source Pure Data patch
│   ├── index.pd             # Compiled PD patch (loaded at runtime)
│   ├── pd4web.js            # Emscripten JS glue
│   ├── pd4web.wasm          # Compiled audio engine (~2.7 MB)
│   ├── pd4web.data          # Embedded patch data + Lua GUI scripts
│   └── pd4web.threads.js    # COI service worker for SharedArrayBuffer
├── .env                     # API keys (not committed)
├── next.config.ts           # COOP/COEP headers for cross-origin isolation
└── package.json
```

---

## Troubleshooting

### "LOADING AUDIO FILES..." hangs forever

- Open DevTools Console and check `window.crossOriginIsolated`. It must be `true`.
- If `false`, the COOP/COEP headers in `next.config.ts` may not be applied. Restart the dev server.

### No sound after clicking Initialize

- Check the Console for errors. The `floatatom.pd_lua` errors are cosmetic (GUI display elements) and don't affect audio.
- Make sure you're using Chrome — Firefox and Safari have limited Web Audio Worklet support.
- Verify your system audio output is not muted.

### Map doesn't load / blank screen

- Verify `NEXT_PUBLIC_MAPBOX_TOKEN` is set correctly in `.env`.
- Mapbox tokens are domain-restricted by default — localhost should work, but check your Mapbox dashboard if deployed.

### "No data found in database"

- Run the data pipeline: `cd data-pipeline && python fetch_climate.py`
- Verify `ecopulse.db` exists and is not empty.

### MIDI controller not detected

- Use Chrome (Web MIDI is not supported in Firefox/Safari).
- The status panel in the top-left corner shows the MIDI connection state.
- Default CC mappings: **CC 23** = zoom, **CC 24** = station hop. Edit `config/mapConfig.js` to change.
