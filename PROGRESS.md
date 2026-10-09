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
- [ ] Landing page (/)
- [ ] Overview dashboard (/dashboard)
- [ ] Live map (/live-map) — custom canvas map: heat, wind particles, fires, transport arcs
- [ ] Model Lab (/model-lab)
- [ ] Explainability (/explainability)
- [ ] What-if simulator (/simulator)
- [ ] Data sources (/data-sources)
- [ ] Data pipeline (/pipeline)
- [ ] Reports (/reports)
- [ ] About (/about)

## Backend (FastAPI)
- [ ] API contract + routers + demo provider

## ML (PyTorch package `ml/`)
- [ ] Model modules, baselines, training/eval scripts, tests

## Integrity rules (keep these)
- Demo values are simulated and labelled "Demo data" in the UI. Never present them as model results.
- Model Lab numbers are illustrative until `ml/runs/<run_id>/metrics.json` exists; UI shows a banner while `METRICS_STATUS !== "measured"`.
