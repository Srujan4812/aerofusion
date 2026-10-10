# AeroFusion — progress & checkpoints

> Resume point for anyone (human or AI). Update after every milestone. Last update: **2026-10-10** · tag `checkpoint-2026-10-10`.

```
Overall                      ████████████████░░░░  80%
Frontend UI (12 pages)       ████████████████████ 100%  Liquid Glass, light/dark, photo backgrounds, sounds
Live data backend            ████████████████████ 100%  6 sources → fusion → (T,33,20) tensor, auto-refresh 10 min
Dashboards on real data      ████████████████████ 100%  no simulated values left in any dashboard
AI explainability            ████████████████████ 100%  Bedrock Nova Micro → Groq fallback; cards + streamed chat
Historical training dataset  ███░░░░░░░░░░░░░░░░░  15%  CPCB labels reachable (196M rows); inputs not backfilled
ML model (MW-AeroFusion-Net) ░░░░░░░░░░░░░░░░░░░░   0%  not started
Evaluation & model serving   ░░░░░░░░░░░░░░░░░░░░   0%
Tests / CI / deployment      █░░░░░░░░░░░░░░░░░░░   5%
Docs                         ██████████░░░░░░░░░░  50%  README + this file
```

---

## ✅ Done

### Frontend (`frontend/`)
- [x] Next.js 16 · React 19 · Tailwind v4 · Motion · Lenis · Recharts · MapLibre GL 6
- [x] Apple Liquid Glass design system (`glass`, `glass-hero`, `card` … in `globals.css`), floating sidebar/toolbar, mobile tab bar, light + dark
- [x] Photo backgrounds (home: stitched bg1–3; app: `public/hero/app-bg.webp`); fonts Christmas Mallow (headers) + Papernotes (cards)
- [x] Sounds: water-drop click on every button/link; looping sunrise ambience only on `/`; persisted mute toggle
- [x] Shared `LiveProvider` (`hooks/use-live.ts`) — one connection, status poll every 15 s, countdown, manual refresh
- [x] **All dashboards on real data**
  - Overview — national avg, cities > NAAQS, exposure, fires, NASA satellite map, 24 h alerts, rankings, live signals
  - Forecast — CAMS hourly (−24 h … +96 h), CPCB baseline line, ventilation chart, best/worst windows, insights
  - Live Map — NASA GIBS satellite + Esri labels, PM2.5 heat, FIRMS fires, MODIS AOD, **animated wind particles**, **animated transport arrows into selected city (share %)**, time scrubber
  - Explainability — Spearman drivers (cross-city & hourly), scatter, daily cycle, z-scores, **Groq AI insight cards with reasoning**, **chat**, single **Refresh everything** button
  - Model Lab — real CPCB archive stats, tensor coverage, live wind graph, honest training checklist (no fake metrics)
  - Reports — CPCB 2022–2024 monthly/daily, 2024 calendar, multi-city trends, CSV/JSON/MD downloads, print
  - What-if Simulator — sensitivity surrogate on the live CAMS baseline; fire share from live FIRMS
  - Data Sources / Live Data — 6 sources with health, NASA image cards, unified tensor heatmap
  - Home — live Delhi card, city list, chart, sources, fires; topbar Live/Offline pill + CAMS alerts
- [x] Architecture diagram, illustrative metrics and demo-mode labels removed

### Backend (`backend/`)
- [x] FastAPI app, background refresh loop (600 s), CORS for localhost:3000
- [x] Sources: CAMS (Open-Meteo AQ), Open-Meteo weather, NASA FIRMS (VIIRS 24 h), NASA GIBS (WMS/WMTS), XKDR CPCB archive (key), calendar
- [x] Fusion → `(T ≤ 72, N = 33, F = 20)` tensor saved to `backend/data/processed/live_tensor.npz`
- [x] Endpoints: `/health`, `/api/live/{status,snapshot,refresh}`, `/api/history`, `/api/history/{city}`, `/api/archive`, `/api/tensor`, `/api/ai/insights`, `/api/ai/chat`
- [x] LLM layer (`app/live/ai.py`): provider chain `AI_PROVIDERS=bedrock,groq` (Amazon Nova Micro primary, Groq fallback, optional Ollama), compact grounded context, insights pre-generated in background after each refresh, streamed chat, empty/429 handling

---

## ⏳ What's left (in order)

### 1. Historical training dataset — *highest priority*
- [ ] `ml/data/` fetchers for **2019–2024**: CAMS reanalysis / EAC4 (or Open-Meteo AQ archive), ERA5 weather (Open-Meteo archive API), NASA FIRMS archive (needs free MAP_KEY), calendar features
- [ ] Hourly CPCB PM2.5 labels per city from XKDR (station means within 30 km, QC: drop flat-lines / > 999 / gaps)
- [ ] Align to the same 20 features as the live tensor → `ml/data/train.npz` (T × 33 × 20) + masks
- [ ] Train/val/test split by time (train 2019–2022, val 2023, test 2024)

### 2. Model — MW-AeroFusion-Net (`ml/`)
- [ ] Baselines first: persistence, climatology, CAMS-as-forecast, LightGBM
- [ ] Modules: causal wavelet branch · adaptive diffusion graph (init from live wind graph) · ConvLSTM/temporal encoder · Transformer · causal attention gate · P10/P50/P90 quantile heads (pinball loss)
- [ ] Training script, configs, seeds, `ml/runs/<run_id>/metrics.json` + checkpoint
- [ ] Unit tests for shapes / causality (no future leakage)

### 3. Evaluation
- [ ] MAE / RMSE / CRPS / interval coverage by horizon (1–72 h), per city and per season, vs CAMS and persistence on held-out 2024
- [ ] Ablations (remove wavelet / graph / fires / met) — only real numbers go into the UI

### 4. Serve the model
- [ ] `POST /api/forecast/{city}` and `/api/explain/{city}` (SHAP / attention) from the trained checkpoint, run on the live tensor each refresh
- [ ] Forecast page: overlay AeroFusion P50 + P10–P90 band next to CAMS; Model Lab: real metrics & curves; Explainability: real attributions next to the AI cards
- [ ] Simulator: perturb model inputs instead of the surrogate

### 5. Engineering
- [ ] Backend tests (pytest, mocked sources) and frontend type/lint in CI (GitHub Actions)
- [ ] Persist snapshot history (SQLite/Parquet) instead of only the rolling 72-step tensor
- [ ] `--reload` dev script; Dockerfile for API; deploy (frontend on Vercel, API on Render / HF Spaces) with env secrets
- [ ] Remove the now-unused demo simulator (`frontend/src/lib/sim/*`, `backend/app/sim/*` except city list) and `use-anchor`
- [ ] Rate-limit / auth the AI endpoints before any public deployment (Bedrock is pay-per-token from the $100 credit; Groq free tier is small)
- [ ] Switch `BEDROCK_REGION` to `ap-south-1` (`apac.amazon.nova-micro-v1:0`) once AWS account verification completes

### 6. Polish
- [ ] 4K artwork (3840 px) for backgrounds; mobile pass on Live Map & Explainability
- [ ] Optional: swap click sound for the myinstants "water drop plop" clip
- [ ] Screenshots in README; final report figures

---

## Known issues / notes
- Live PM2.5 is the **CAMS model** (~40 km), not ground truth; CPCB archive (XKDR) is not real-time (PM2.5 to Mar 2026, most stations to Dec 2024).
- If `maplibre-gl` is upgraded, re-copy `node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs` → `frontend/public/maplibre/` (maps go blank otherwise).
- CARTO raster tiles now require a key → Esri tiles are used for labels / dark / light.
- Backend runs without `--reload`: restart the API after backend edits.
- Browsers block autoplay audio until the first click / keypress.
- Christmas Mallow is a personal-use demo font; Papernotes licence unverified — clear licences before public use.
- In-app preview screenshots stall on animated pages; use `?static=1`.

## Run locally
See [README.md](README.md#run-locally).
