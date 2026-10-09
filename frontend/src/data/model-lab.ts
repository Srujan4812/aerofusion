/**
 * Model Lab content.
 *
 * STATUS: ILLUSTRATIVE. These numbers are placeholders that show the shape of the results
 * table while training is in progress. They are NOT measured results. Replace them with the
 * output of `python -m aerofusion.evaluate` (ml/runs/<run_id>/metrics.json) — the UI shows a
 * banner whenever `status !== "measured"`.
 */

export type MetricsStatus = "illustrative" | "measured";

export interface LadderRow {
  rung: string;
  model: string;
  adds: string;
  metrics: Record<"1h" | "24h" | "48h", { mae: number; rmse: number; r2: number }>;
  params?: string;
  ours?: boolean;
}

export const METRICS_STATUS: MetricsStatus = "illustrative";

export const LADDER: LadderRow[] = [
  {
    rung: "R0",
    model: "Persistence",
    adds: "Floor: last observed value",
    metrics: { "1h": { mae: 9.8, rmse: 15.1, r2: 0.86 }, "24h": { mae: 31.8, rmse: 45.2, r2: 0.21 }, "48h": { mae: 38.6, rmse: 53.9, r2: 0.04 } },
    params: "0",
  },
  {
    rung: "R0b",
    model: "Seasonal naive (24 h)",
    adds: "Same hour yesterday",
    metrics: { "1h": { mae: 24.1, rmse: 34.0, r2: 0.48 }, "24h": { mae: 27.5, rmse: 39.8, r2: 0.38 }, "48h": { mae: 33.0, rmse: 47.1, r2: 0.18 } },
    params: "0",
  },
  {
    rung: "R1",
    model: "LightGBM + SHAP",
    adds: "Lags, weather, fire counts",
    metrics: { "1h": { mae: 8.6, rmse: 13.4, r2: 0.89 }, "24h": { mae: 19.6, rmse: 28.4, r2: 0.66 }, "48h": { mae: 24.3, rmse: 34.6, r2: 0.52 } },
    params: "~0.4 M leaves",
  },
  {
    rung: "R2a",
    model: "LSTM",
    adds: "Temporal recurrence",
    metrics: { "1h": { mae: 8.9, rmse: 13.9, r2: 0.88 }, "24h": { mae: 21.0, rmse: 30.2, r2: 0.61 }, "48h": { mae: 25.8, rmse: 36.5, r2: 0.47 } },
    params: "0.21 M",
  },
  {
    rung: "R2b",
    model: "CNN-LSTM",
    adds: "Spatial convolution on grid",
    metrics: { "1h": { mae: 8.7, rmse: 13.6, r2: 0.89 }, "24h": { mae: 19.9, rmse: 28.9, r2: 0.64 }, "48h": { mae: 24.9, rmse: 35.2, r2: 0.5 } },
    params: "0.34 M",
  },
  {
    rung: "R2c",
    model: "ConvLSTM",
    adds: "Joint spatio-temporal cells",
    metrics: { "1h": { mae: 8.4, rmse: 13.1, r2: 0.9 }, "24h": { mae: 18.7, rmse: 27.3, r2: 0.68 }, "48h": { mae: 23.6, rmse: 33.8, r2: 0.54 } },
    params: "0.52 M",
  },
  {
    rung: "R3",
    model: "+ Adaptive diffusion graph",
    adds: "Inter-city transport",
    metrics: { "1h": { mae: 7.9, rmse: 12.4, r2: 0.91 }, "24h": { mae: 17.1, rmse: 25.0, r2: 0.73 }, "48h": { mae: 21.5, rmse: 31.0, r2: 0.61 } },
    params: "0.61 M",
  },
  {
    rung: "R4",
    model: "+ Wavelet multi-resolution",
    adds: "Trend / daily / spike bands",
    metrics: { "1h": { mae: 7.6, rmse: 11.9, r2: 0.92 }, "24h": { mae: 16.2, rmse: 23.9, r2: 0.76 }, "48h": { mae: 20.4, rmse: 29.6, r2: 0.64 } },
    params: "0.66 M",
  },
  {
    rung: "R5",
    model: "+ Transformer encoder",
    adds: "Long-range dependencies",
    metrics: { "1h": { mae: 7.5, rmse: 11.7, r2: 0.92 }, "24h": { mae: 15.6, rmse: 23.1, r2: 0.78 }, "48h": { mae: 19.6, rmse: 28.4, r2: 0.67 } },
    params: "0.83 M",
  },
  {
    rung: "R6",
    model: "MW-AeroFusion-Net",
    adds: "+ Causal attention gate (full)",
    metrics: { "1h": { mae: 7.4, rmse: 11.6, r2: 0.92 }, "24h": { mae: 15.1, rmse: 22.4, r2: 0.79 }, "48h": { mae: 19.0, rmse: 27.7, r2: 0.69 } },
    params: "0.85 M",
    ours: true,
  },
];

export const HYPERPARAMS: { group: string; items: [string, string][] }[] = [
  {
    group: "Data",
    items: [
      ["Input window", "72 h (hourly)"],
      ["Horizons", "t+1, t+24, t+48"],
      ["Split", "Chronological 70 / 15 / 15"],
      ["Scaling", "Robust scaler fit on train only"],
    ],
  },
  {
    group: "Wavelet branch",
    items: [
      ["Transform", "Causal Haar à trous (SWT)"],
      ["Levels", "5 → trend · daily · spikes"],
      ["Applied", "Inside each input window"],
    ],
  },
  {
    group: "Adaptive graph",
    items: [
      ["Nodes", "33 cities"],
      ["Prior", "Haversine kernel × wind alignment"],
      ["Learned", "Node embeddings d=16, top-k=8"],
      ["Diffusion steps", "K = 2 (bidirectional)"],
    ],
  },
  {
    group: "ConvLSTM",
    items: [
      ["Grid", "32 × 32 (≈ 1° cells)"],
      ["Channels", "wind u/v, temp, RH, fire counts"],
      ["Hidden", "32, kernel 3 × 3, 2 layers"],
    ],
  },
  {
    group: "Transformer",
    items: [
      ["d_model", "64"],
      ["Heads / layers", "4 / 2"],
      ["Mask", "Causal (no look-ahead)"],
    ],
  },
  {
    group: "Training",
    items: [
      ["Loss", "Pinball (q = 0.1, 0.5, 0.9) + λ‖gate‖₁"],
      ["Optimiser", "AdamW, lr 1e-3, wd 1e-4"],
      ["Schedule", "Cosine, 3-epoch warm-up"],
      ["Batch / epochs", "32 / ≤ 60, early stop 8"],
      ["Stability", "AMP fp16 · grad-clip 1.0 · seed 42"],
    ],
  },
];

export const ARCH_MODULES = [
  {
    id: "input",
    title: "Multi-source input",
    subtitle: "CPCB · ERA5/IMD · FIRMS · calendar",
    detail: "Hourly PM2.5 per station, gridded weather fields, fire detections binned to cells, holiday & hour-of-week proxies.",
    gap: "G1",
  },
  {
    id: "wavelet",
    title: "Multi-resolution wavelet",
    subtitle: "Trend · daily cycle · spikes",
    detail: "Causal stationary wavelet transform inside each window separates slow trends from the daily cycle and sudden spikes.",
    gap: "G2",
  },
  {
    id: "graph",
    title: "Adaptive diffusion graph",
    subtitle: "Inter-city transport",
    detail: "Distance + wind-aligned prior adjacency, refined by learned node embeddings; K-step bidirectional diffusion convolution.",
    gap: "G3",
  },
  {
    id: "convlstm",
    title: "ConvLSTM",
    subtitle: "Local spatio-temporal fields",
    detail: "Convolutional recurrent cells over the 32×32 weather/fire raster capture plumes moving across the grid.",
    gap: "G4",
  },
  {
    id: "transformer",
    title: "Transformer encoder",
    subtitle: "Long-range dependencies",
    detail: "Causally-masked multi-head self-attention over the fused sequence learns multi-day patterns RNNs forget.",
    gap: "G5",
  },
  {
    id: "attention",
    title: "Causal attention gate",
    subtitle: "Source attribution",
    detail: "Softmax feature gate with L1 sparsity gives per-source weights; validated by occlusion tests.",
    gap: "G6",
  },
  {
    id: "output",
    title: "Outputs",
    subtitle: "P10 · P50 · P90 forecasts",
    detail: "Quantile heads for 1/24/48 h, CPCB AQI class, hotspot flags and attributions.",
    gap: "—",
  },
] as const;

export const EXPERIMENTS = [
  { id: "r6-full-s42", model: "MW-AeroFusion-Net", status: "planned", notes: "Full model, 3 seeds" },
  { id: "r5-transformer-s42", model: "+ Transformer", status: "planned", notes: "Ablation: no gate" },
  { id: "r4-wavelet-s42", model: "+ Wavelet", status: "planned", notes: "Ablation: no transformer" },
  { id: "r3-graph-s42", model: "+ Graph", status: "planned", notes: "Fixed vs adaptive adjacency" },
  { id: "r1-lgbm", model: "LightGBM", status: "planned", notes: "SHAP baseline" },
  { id: "r0-persistence", model: "Persistence", status: "planned", notes: "Floor" },
];
