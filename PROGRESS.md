# AeroFusion — build progress & checkpoints

> Resume point for anyone (human or AI) picking the work back up. Update after every milestone.

## Status legend
- [x] done · [~] in progress · [ ] todo

## Frontend (Next.js 16 · React 19 · Tailwind v4 · Motion · Recharts)
- [x] Scaffold, design tokens (light/dark), fonts, Lenis smooth scroll, theme toggle (view-transition)
- [x] Deterministic demo simulator (`src/lib/sim/*`): PM2.5, weather, fires, forecasts + P10/P90, attributions, wavelet, diffusion graph, scenarios
- [x] App shell: animated sidebar, topbar (⌘K search, clock, demo-data pill, alerts), mobile drawer, footer
- [x] Procedural SkyScene hero (haze follows PM2.5, city landmarks, mountains/orbit variants, particles)
- [x] Forecast page
- [x] Landing page (/)
- [x] Overview dashboard (/dashboard)
- [x] Live map (/live-map) — custom canvas map: heat, wind particles, fires, transport arcs
- [x] Model Lab (/model-lab)
- [x] Explainability (/explainability)
- [x] What-if simulator (/simulator)
- [x] Data sources (/data-sources)
- [x] Data pipeline (/pipeline)
- [x] Reports (/reports)
- [x] About (/about)

- [x] Production build passes (all 12 routes static); eslint + tsc clean
- [x] `?static=1` URL flag renders all Motion animations in their final state (for report screenshots)

## Backend (FastAPI)
- [ ] API contract + routers + demo provider

## ML (PyTorch package `ml/`)
- [ ] Model modules, baselines, training/eval scripts, tests

## Integrity rules (keep these)
- Demo values are simulated and labelled "Demo data" in the UI. Never present them as model results.
- Model Lab numbers are illustrative until `ml/runs/<run_id>/metrics.json` exists; UI shows a banner while `METRICS_STATUS !== "measured"`.

## In progress (2026-10-09)
- [x] Liquid Glass redesign (Apple-style): glass/card/glass-strong/glass-tint/glass-pop materials in globals.css, floating sidebar + toolbar capsules, iOS tab bar (mobile), segmented lens, iOS slider/switch, pastel ambient bg, light/dark; build passes
- [~] Backend: `backend/app/{schemas,config}.py` + `backend/app/sim/*` (bit-exact port of TS simulator) done; providers/routers/main/tests TODO

## Next steps (resume here)
1. Backend: write `backend/app/providers/{base,demo,model}.py`, `backend/app/main.py` (FastAPI routes: /health /stations /snapshot /forecast/{city} /explain/{city} /graph /hotspots /whatif /metrics), `requirements.txt`, tests, Dockerfile.
2. ML package `ml/`: data fetchers (Open-Meteo/ERA5, CAMS, FIRMS, OpenAQ), dataset builder, models (wavelet, adaptive graph, ConvLSTM, transformer, causal gate, quantile heads), baselines, train/eval/explain, unit tests.
3. Frontend API mode: typed client + hooks when `NEXT_PUBLIC_API_URL` is set.
4. Root README (setup, run, integrity notes), push to GitHub once `puneethmcs24` has write access to Srujan4812/aerofusion.
