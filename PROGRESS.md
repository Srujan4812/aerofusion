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
- [~] Liquid Glass redesign (Apple-style): material tokens, floating nav, glass controls, pastel ambient bg, light/dark
- [~] Backend: `backend/app/{schemas,config}.py` + `backend/app/sim/*` (bit-exact port of TS simulator) done; providers/routers/main/tests TODO
