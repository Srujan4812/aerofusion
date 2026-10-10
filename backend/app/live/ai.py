"""LLM reasoning over the live snapshot (Groq, OpenAI-compatible API).

The model only sees numbers computed by the backend from the live sources, and is told to
reason from them and say when the data can't answer something.
"""

from __future__ import annotations

import asyncio
import json
import math
import os

import httpx

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM = """You are AeroFusion's air-quality analyst for India. You reason ONLY from the live data context provided
(CAMS modelled PM2.5 via Open-Meteo, Open-Meteo weather, NASA FIRMS fires, CPCB measured baselines via XKDR).
Rules: use the 'category' column exactly as given; cite concrete numbers and city names from the context; explain the physical reasoning (dispersion, mixing height,
wind transport, fires, humidity, seasonality); never invent values; if the context can't answer, say so plainly.
PM2.5 categories (µg/m³, 24-h): Good ≤30, Satisfactory ≤60, Moderate ≤90, Poor ≤120, Very poor ≤250, Severe >250. NAAQS 24-h = 60.
Live PM2.5 is a model estimate (CAMS), not a ground measurement; the AeroFusion model itself is not trained yet."""


def _r(v, d=1):
    return None if v is None or (isinstance(v, float) and math.isnan(v)) else round(v, d)


def _spearman(xs, ys):
    pairs = [(x, y) for x, y in zip(xs, ys) if x is not None and y is not None]
    if len(pairs) < 5:
        return None

    def rank(a):
        order = sorted(range(len(a)), key=lambda i: a[i])
        r = [0.0] * len(a)
        for k, i in enumerate(order):
            r[i] = k + 1
        return r

    rx, ry = rank([p[0] for p in pairs]), rank([p[1] for p in pairs])
    n = len(pairs)
    m = (n + 1) / 2
    num = sum((a - m) * (b - m) for a, b in zip(rx, ry))
    den = math.sqrt(sum((a - m) ** 2 for a in rx) * sum((b - m) ** 2 for b in ry))
    return round(num / den, 2) if den else None


def _cat(pm: float) -> str:
    for lim, name in ((30, "Good"), (60, "Satisfactory"), (90, "Moderate"), (120, "Poor"), (250, "Very poor")):
        if pm <= lim:
            return name
    return "Severe"


def build_context(snap: dict) -> str:
    cities = [c for c in snap["cities"] if c.get("pm25") is not None]
    rows = []
    for c in sorted(cities, key=lambda c: -c["pm25"]):
        s = c.get("series") or {}
        pm = s.get("pm25") or []
        times = s.get("time") or []
        # next-24h peak from the hourly series (series starts 48 h in the past)
        fut = [(t, v) for t, v in zip(times[48:72], pm[48:72]) if v is not None]
        peak = max(fut, key=lambda x: x[1]) if fut else (None, None)
        past = [v for v in c.get("pm25_24h") or [] if v is not None]
        pt = None
        if peak[0]:
            h = (int(peak[0][11:13]) + 5) % 24 + (1 if int(peak[0][14:16]) + 30 >= 60 else 0)
            pt = f"{h % 24:02d}:{(int(peak[0][14:16]) + 30) % 60:02d} IST"
        rows.append(
            [c["name"], _cat(c["pm25"]), _r(c["pm25"], 0), _r(past[0], 0) if past else None, _r(peak[1], 0), pt, _r(c.get("pm10"), 0), _r(c.get("aod"), 2),
             _r(c.get("dust"), 0), _r(c.get("no2"), 0), _r(c.get("temp"), 0), _r(c.get("rh"), 0), _r(c.get("wind")), _r(c.get("wind_dir"), 0),
             _r(c.get("pblh"), 0), c.get("fires_300km"), c.get("fires_upwind"), _r((c.get("cpcb") or {}).get("pm25_mean"), 0)]
        )
    feats = ["aod", "dust", "no2", "co", "temp", "rh", "wind", "pblh", "fires_300km", "fires_upwind", "cpcb_baseline"]
    corr = {f: _spearman([c["pm25"] for c in cities], [c.get(f) for c in cities]) for f in feats}
    nat = sum(c["pm25"] for c in cities) / len(cities)
    ctx = {
        "updated_at_utc": snap["updated_at"],
        "national_avg_pm25": round(nat, 1),
        "cities_above_naaqs": sum(c["pm25"] > 60 for c in cities),
        "fires_24h_total": snap["fires"]["total"],
        "fire_regions": snap["fires"]["regions"][:6],
        "spearman_pm25_vs_feature_across_cities": corr,
        "sources_online": [s["name"] for s in snap["sources"] if s["ok"]],
        "city_columns": ["city", "category", "pm25", "pm25_24h_ago", "next24h_peak", "peak_time", "pm10", "aod", "dust", "no2", "temp_c", "rh", "wind_ms",
                         "wind_from_deg", "pblh_m", "fires_300km", "fires_upwind", "cpcb_same_month_2024"],
        "cities": rows,
    }
    return json.dumps(ctx, separators=(",", ":"))


async def _complete(messages: list[dict], json_mode: bool = False, max_tokens: int = 1800, model: str | None = None) -> str:
    key = os.getenv("GROQ_API_KEY")
    if not key:
        raise RuntimeError("GROQ_API_KEY not configured")
    body = {"model": model or os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"), "messages": messages, "temperature": 0.3, "max_tokens": max_tokens}
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    async with httpx.AsyncClient(timeout=60) as client:
        for attempt in range(2):
            r = await client.post(GROQ_URL, headers={"Authorization": f"Bearer {key}"}, json=body)
            if r.status_code != 429 or attempt:
                break
            await asyncio.sleep(min(20.0, float(r.headers.get("retry-after", "8"))))
        if r.status_code != 200:
            raise RuntimeError(f"Groq {r.status_code}: {r.text[:200]}")
        return r.json()["choices"][0]["message"]["content"]


async def insights(snap: dict) -> dict:
    prompt = (
        "LIVE DATA CONTEXT (JSON):\n"
        + build_context(snap)
        + """

Write 6 insight cards about India's air quality right now. Return JSON:
{"headline": "<one sentence national summary>",
 "insights": [{"title": "<short>", "finding": "<what the data shows, with numbers>",
   "reasoning": "<why, physically, step by step in 2-3 sentences, referencing the drivers>",
   "tone": "alert|warn|good|info", "cities": ["<city names>"], "confidence": "high|medium|low"}]}
Cover: the worst hotspots and their causes, the next-24h outlook, the fire/transport signal, meteorology (wind/mixing height),
the cross-city driver correlations, and how today compares with the CPCB 2024 same-month baseline."""
    )
    out = await _complete([{"role": "system", "content": SYSTEM}, {"role": "user", "content": prompt}], json_mode=True, max_tokens=2600)
    data = json.loads(out)
    data["updated_at"] = snap["updated_at"]
    data["model"] = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    return data


async def chat(snap: dict, messages: list[dict], city: str | None) -> str:
    sys = SYSTEM + "\n\nLIVE DATA CONTEXT (JSON):\n" + build_context(snap)
    if city:
        sys += f"\nThe user currently has '{city}' selected."
    sys += "\nAnswer concisely in Markdown (short paragraphs or bullets)."
    msgs = [{"role": "system", "content": sys}] + [{"role": m["role"], "content": str(m["content"])[:2000]} for m in messages[-10:] if m.get("role") in ("user", "assistant")]
    return await _complete(msgs, max_tokens=1200, model=os.getenv("GROQ_CHAT_MODEL", "openai/gpt-oss-20b"))
