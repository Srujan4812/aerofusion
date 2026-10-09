# AeroFusion — progress & checkpoints

> Resume point for anyone (human or AI). Update after every milestone. Last update: 2026-10-09.

```
Overall            ███████████████░░░░░  75%
Frontend UI        ████████████████████ 100%  12 pages, Liquid Glass, light/dark, photo backgrounds
Homepage           ████████████████████ 100%  stitched artwork bg, glass sections
Backend (FastAPI)  ███████░░░░░░░░░░░░░  35%  schemas + config + bit-exact simulator port
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
