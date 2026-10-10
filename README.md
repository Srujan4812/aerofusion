# AeroFusion

**Explainable PM2.5 air-quality monitoring and forecasting for 33 Indian cities.**
A live multi-source data-fusion backend (Copernicus CAMS, Open-Meteo, NASA FIRMS, NASA GIBS, CPCB archive) feeding an Apple-style Liquid Glass dashboard, with an LLM analyst (Amazon Nova Micro on Bedrock, Groq fallback) that explains what is driving pollution right now. Status and remaining work: [PROGRESS.md](PROGRESS.md).

**🌐 Live:** https://aerofusion.vercel.app · API: https://aerofusion-api.onrender.com ([health](https://aerofusion-api.onrender.com/health))

> Status: ~90% — all dashboards on live data, AI explainability with model picker. Remaining: deployment, rate-limiting, cleanup, tests. Forecasts shown are Copernicus CAMS; no custom-model accuracy is claimed.

---

## Features

| Page | What it shows (all real data) |
|---|---|
| **Home** | Live Delhi PM2.5, city list, CAMS chart, source status, fires |
| **Overview** | National average, cities above NAAQS, people exposed, NASA satellite map, 24 h alerts, rankings |
| **Forecast** | CAMS hourly PM2.5 (−24 h … +96 h), CPCB baseline, ventilation (wind × mixing height), best/worst hours |
| **Live Map** | NASA GIBS satellite, PM2.5 heat, FIRMS fires, MODIS AOD, animated wind flow, animated "who affects this city" arrows, time scrubber |
| **Explainability** | Data-driven drivers (Spearman), daily cycle, city z-scores, **AI insight cards with reasoning**, **chat with the data**, one-click refresh |
| **Model Lab** | CPCB archive (196 M rows, 558 stations), unified tensor coverage, wind-driven city graph, training status |
| **What-if Simulator** | Emission / weather levers applied to the live CAMS forecast |
| **Reports** | CPCB 2022–2024 history, 2024 calendar heatmaps, multi-city trends, CSV/JSON/Markdown exports, print |
| **Data Sources** | Health of all 6 sources, NASA image cards, tensor heatmap |

Extras: light/dark themes, smooth scrolling and motion, water-drop click sounds, sunrise ambience on the home page (mutable).

## Data sources

| Source | Used for | Key |
|---|---|---|
| Copernicus **CAMS** via Open-Meteo Air Quality | Live + forecast PM2.5, PM10, AOD, dust, NO₂, CO | none |
| **Open-Meteo** forecast | Temperature, humidity, wind, pressure, rain, boundary-layer height | none |
| **NASA FIRMS** (VIIRS, 24 h) | Active fires, FRP, upwind fire counts | none |
| **NASA GIBS** | Satellite imagery (true colour, AOD, thermal) | none |
| **XKDR India Air Quality API** (CPCB CAAQMS) | Measured history & same-month baselines | `XKDR_API_KEY` |
| **Amazon Bedrock** (Nova Micro) — primary | AI insights & chat on Explainability | `AWS_BEARER_TOKEN_BEDROCK` |
| **Groq** (`gpt-oss-120b` / `gpt-oss-20b`) — fallback | Used automatically if Bedrock fails | `GROQ_API_KEY` |
| **Ollama** (optional, self-hosted) | Extra fallback / offline | `OLLAMA_URL` |

Every refresh (every 12 h, `AEROFUSION_REFRESH_SECONDS=43200`, or on demand) fuses these into a `(time ≤ 72, cities = 33, features = 20)` tensor saved to `backend/data/processed/live_tensor.npz`.

## Architecture

```
frontend/  Next.js 16 · React 19 · Tailwind v4 · Motion · Recharts · MapLibre
   └─ LiveProvider ──HTTP──▶ backend/  FastAPI
                                ├─ live/sources.py   fetchers (CAMS, Open-Meteo, FIRMS, GIBS, XKDR)
                                ├─ live/service.py   refresh loop + fusion → tensor
                                └─ live/ai.py        LLM chain Bedrock → Groq (→ Ollama): insights & chat
```

### API

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness + last refresh |
| GET | `/api/live/status` | Last update, countdown, source health |
| GET | `/api/live/snapshot` | Full fused snapshot (cities, series, fires, GIBS, tensor) |
| POST | `/api/live/refresh` | Refresh all sources now |
| GET | `/api/history` · `/api/history/{city}` | CPCB monthly (2022–2024) / daily 2024 |
| GET | `/api/archive` | CPCB archive size & coverage |
| GET | `/api/tensor` | Saved tensor shape, timestamps, coverage |
| GET | `/api/ai/provider` | Configured LLM chain (no secrets) |
| GET | `/api/ai/insights?force=1` | AI insight cards (generated in background; returns cache + `generating` status) |
| POST | `/api/ai/chat` · `/api/ai/chat/stream` | `{messages:[{role,content}], city?}` → grounded answer (streamed) |

## Deployment
| Part | Host | Notes |
|---|---|---|
| Frontend | **Vercel** — `aerofusion` project, root `frontend/`, auto-deploys on push to `main` | env `NEXT_PUBLIC_API_URL=https://aerofusion-api.onrender.com` |
| Backend | **Render** free web service via [`render.yaml`](render.yaml), auto-deploys on push | secrets `XKDR_API_KEY`, `AWS_BEARER_TOKEN_BEDROCK`, `GROQ_API_KEY` set in Render; refresh every 12 h |

Render's free plan sleeps after ~15 min idle; the first visit wakes it (~1 min, the UI shows a "connecting" card and retries automatically).
Weather falls back from Open-Meteo to MET Norway when the shared cloud IP is rate-limited.

## Run locally

**Requirements:** Node 20+, Python 3.11+.

```bash
# 1. Backend
python -m venv .venv
.venv/Scripts/activate            # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env   # then fill in XKDR_API_KEY, AWS_BEARER_TOKEN_BEDROCK, GROQ_API_KEY
python -m uvicorn app.main:app --app-dir backend --port 8000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                        # http://localhost:3000
```

`backend/.env`:

```ini
XKDR_API_KEY=...                   # https://airquality.xkdr.org
AI_PROVIDERS=bedrock,groq         # tried in order
AWS_BEARER_TOKEN_BEDROCK=...       # Bedrock console → API keys
BEDROCK_REGION=us-east-1
BEDROCK_MODEL=us.amazon.nova-micro-v1:0
GROQ_API_KEY=...                   # https://console.groq.com (fallback)
GROQ_MODEL=openai/gpt-oss-120b
AEROFUSION_REFRESH_SECONDS=600
```

Set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` if the API is not on `http://localhost:8000`.
Add `?static=1` to any page URL to render all animations in their final state (for screenshots).

## Honesty notes
- Live PM2.5 is the **CAMS model** (~40 km grid), labelled as such everywhere — not a ground measurement.
- The CPCB archive is historical (most stations to Dec 2024), used for baselines and history.
- AI text is generated by an LLM from the live numbers and can be wrong; the charts are the source of truth.
- No custom forecasting model is trained (out of scope); Model Lab shows the training data and readiness for future work.

## Roadmap
Deploy (Vercel + hosted API) → rate-limit AI endpoints → cleanup & CI. Training MW-AeroFusion-Net is future work. Full checklist in [PROGRESS.md](PROGRESS.md#-whats-left-current-scope).

## Credits
India boundaries: DataMeet (CC BY 4.0) · Imagery: NASA GIBS / Worldview · Fires: NASA FIRMS · Air-quality model: Copernicus CAMS · Weather: Open-Meteo · Labels/basemaps: Esri · Measurements: CPCB via XKDR.
