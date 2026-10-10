# AeroFusion — progress & checkpoints

> Resume point for anyone (human or AI). Update after every milestone. Last update: 2026-10-09.

```
Overall            ███████████████░░░░░  75%
Frontend UI        ████████████████████ 100%  12 pages, Liquid Glass, light/dark, photo backgrounds
Homepage           ████████████████████ 100%  stitched artwork bg, glass sections
Backend (FastAPI)  █████████████░░░░░░░  65%  LIVE ingestion: 6 sources → fusion → (T,33,20) tensor
ML package         ░░░░░░░░░░░░░░░░░░░░   0%
Docs / README      ████░░░░░░░░░░░░░░░░  20%
```

## Done
- [x] Next.js 16 + React 19 + Tailwind v4 + Motion + Lenis + Recharts app (`frontend/`)
- [x] Deterministic demo simulator (`frontend/src/lib/sim/*`): PM2.5, weather, fires, forecasts P10/P50/P90, attributions, wavelet, diffusion graph, scenarios
- [x] Pages: Home, Overview, Forecast, Live Map (custom canvas map: heat, wind particles, fires, transport arcs), Model Lab, Explainability, What-if Simulator, Data Sources, Data Pipeline, Reports (CSV/JSON/print exports), About
- [x] Apple Liquid Glass design system (`glass`, `glass-strong`, `glass-tint`, `glass-pop`, `glass-hero`, `card` in `globals.css`), floating sidebar/toolbar, iOS tab bar on mobile, light + dark
- [x] Photo backgrounds: homepage `public/hero/homepage.webp` (bg1+bg2+bg3 stitched), app pages `public/hero/app-bg.webp`
- [x] Fonts: Christmas Mallow (large headers, `font-hero`), Papernotes (inside cards/glass); numbers via `font-num`
- [x] Integrity: "Demo data" labels everywhere, Model Lab metrics flagged *illustrative*, CAMS shown only as benchmark
- [x] Backend: `backend/app/schemas.py`, `config.py`, `sim/` (port of TS simulator)

## Live data (2026-10-10)
- `backend/app/live/` — CAMS air quality + Open-Meteo weather (no key), NASA FIRMS 24 h CSV (no key), NASA GIBS WMS imagery (no key), XKDR CPCB archive baseline (key in `backend/.env`, never committed), calendar.
- Auto-refresh every 10 min (`AEROFUSION_REFRESH_SECONDS`), `POST /api/live/refresh` on demand; tensor saved to `backend/data/processed/live_tensor.npz`.
- Frontend `/pipeline` → **Live Data Fusion** dashboard (countdown ring, refresh button, source health, NASA image cards, tensor heatmap, fused city table).
- Note: XKDR is an archive (PM2.5 to Mar 2026, most stations to Dec 2024) → used as same-month historical baseline; live PM2.5 = CAMS (modelled, labelled).
- Run API: `C:/Users/Puneeth_M/.venvs/aerofusion/Scripts/python.exe -m uvicorn app.main:app --app-dir backend --port 8000`

## Next (in order)
1. **Backend** — `backend/app/providers/{base,demo,model}.py`, `main.py` routes (`/health /stations /snapshot /forecast/{city} /explain/{city} /graph /hotspots /whatif /metrics`), `requirements.txt`, pytest tests, Dockerfile.
2. **ML package `ml/`** — data fetchers (OpenAQ/CPCB, Open-Meteo ERA5, CAMS, NASA FIRMS), dataset builder, MW-AeroFusion-Net modules (causal wavelet, adaptive diffusion graph, ConvLSTM, Transformer, causal attention gate, quantile heads), baselines (persistence, LightGBM, LSTM, ConvLSTM), train/eval/explain scripts, unit tests.
3. **Train** on real data → write `ml/runs/<run_id>/metrics.json`, set `METRICS_STATUS = "measured"`.
4. **Frontend API mode** — typed client + hooks when `NEXT_PUBLIC_API_URL` is set.
5. **Polish** — 4K artwork (3840 px wide bg images), mobile pass, README with setup/screenshots, deploy (Vercel + Render/HF Spaces).

## Known issues / notes
- Background images are 1672 px wide (not 4K) — replace `bg1/bg2/bg3.png` at 3840 px and re-stitch.
- Christmas Mallow is a **personal-use demo** font without digits/punctuation (system font fills in); Papernotes licence unverified. Buy/verify licences before public/commercial use.
- In-app preview screenshots can stall (rAF throttling) — use `?static=1` to render animations in final state.

## Run locally
```bash
cd frontend && npm install && npm run dev   # http://localhost:3000
```


## Real-data overhaul (2026-10-10)
`[####################] 100%`
- All dashboards run on real data: Overview, Forecast (CAMS + Open-Meteo), Live Map, Explainability (live Spearman drivers, daily cycle, z-scores), Model Lab (CPCB archive 196M rows, tensor coverage, live wind graph, honest training status), Reports (CPCB 2022–2024 monthly/daily via `/api/history`), Simulator (live CAMS baseline), Home, topbar alerts and Live/Offline pill.
- Removed: architecture diagram, illustrative metrics, simulated backtests, demo-mode labels, old data-sources and pipeline views.
- Next: historical backfill → train MW-AeroFusion-Net → replace CAMS lines with model forecasts.


## Checkpoint — 2026-10-10 (`checkpoint-2026-10-10`)
`Overall  [################----]  80%`
`UI + live data  [####################] 100%`
`Model training  [##------------------]  10%`

Done since last checkpoint:
- **Explainability AI** (Groq, `openai/gpt-oss-120b` insights / `gpt-oss-20b` chat): 6 insight cards with reasoning, regenerated per live refresh, chat grounded in the live snapshot (`/api/ai/insights`, `/api/ai/chat`). Key in `backend/.env` as `GROQ_API_KEY` (never committed). Free tier = 8k tokens/min.
- **Refresh everything** button on Explainability (live sources + charts + AI).
- AI cards restyled to Liquid Glass (no coloured borders, larger/brighter text).
- **Sounds:** water-drop click on all buttons/links; looping sunrise ambience only on `/`; mute toggle (persisted).
- **Maps fixed:** MapLibre worker served from `frontend/public/maplibre/` (tiles never rendered before); NASA GIBS satellite + Esri labels on Overview/Simulator; Esri dark/light (CARTO now needs a key).
- **Live Map:** animated wind-flow particles; animated transport arrows into the selected city with share %; readable layers panel.

Next steps:
1. Historical backfill (CAMS reanalysis + ERA5 + FIRMS archive aligned to CPCB 2019–2024).
2. Train MW-AeroFusion-Net; evaluate vs CAMS & persistence on held-out 2024.
3. Serve model forecasts and replace CAMS lines; add SHAP/attention to Explainability.

Known issues:
- If `maplibre-gl` is upgraded, re-copy `node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs` to `frontend/public/maplibre/`.
- Backend has no `--reload`; restart the `api` server after backend edits.
- Browsers block autoplay audio until the first click/keypress.
- Font licences (Christmas Mallow / Papernotes demo fonts) must be checked before public release.
