"""AeroFusion API.

Run:  uvicorn app.main:app --reload --port 8000   (from the backend/ folder)
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

import time  # noqa: E402

import httpx  # noqa: E402

from .live import sources as S  # noqa: E402
from .live.service import LiveService  # noqa: E402
from .sim.core import CITY_BY_SLUG  # noqa: E402

live = LiveService(interval_s=int(os.getenv("AEROFUSION_REFRESH_SECONDS", "600")))


@asynccontextmanager
async def lifespan(_: FastAPI):
    live.start()
    yield
    await live.stop()


app = FastAPI(title="AeroFusion API", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("AEROFUSION_CORS", "http://localhost:3000,http://127.0.0.1:3000").split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "last_refresh": live.snapshot["updated_at"] if live.snapshot else None}


@app.get("/api/live/status")
def live_status():
    return {
        "updated_at": live.snapshot["updated_at"] if live.snapshot else None,
        "next_refresh_in": live.next_refresh_in(),
        "interval_s": live.interval_s,
        "refreshing": live.lock.locked(),
        "sources": live.sources_status(),
    }


@app.get("/api/live/snapshot")
async def live_snapshot():
    if live.snapshot is None:
        await live.refresh()
    return {**live.snapshot, "next_refresh_in": live.next_refresh_in()}


@app.post("/api/live/refresh")
async def live_refresh():
    if live.lock.locked():
        raise HTTPException(409, "A refresh is already running")
    snap = await live.refresh()
    return {**snap, "next_refresh_in": live.next_refresh_in()}


_cache: dict[str, tuple[float, dict]] = {}


async def _cached(key: str, ttl: float, fn):
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    val = await fn()
    _cache[key] = (time.time(), val)
    return val


@app.get("/api/history")
async def history_all():
    """Measured monthly PM2.5 for all cities from the CPCB archive (XKDR), 2022–2024."""
    key = os.getenv("XKDR_API_KEY")
    if not key:
        raise HTTPException(503, "XKDR_API_KEY not configured")

    async def run():
        async with httpx.AsyncClient(timeout=120) as client:
            return await S.cpcb_history_all(client, key)

    return await _cached("hist:all", 24 * 3600, run)


@app.get("/api/history/{city}")
async def history(city: str):
    """Measured monthly PM2.5 from the CPCB archive (XKDR) for 2022–2024."""
    c = CITY_BY_SLUG.get(city)
    if not c:
        raise HTTPException(404, "unknown city")
    key = os.getenv("XKDR_API_KEY")
    if not key:
        raise HTTPException(503, "XKDR_API_KEY not configured")

    async def run():
        async with httpx.AsyncClient(timeout=90) as client:
            return await S.cpcb_history(client, key, c)

    return await _cached(f"hist:{city}", 24 * 3600, run)


@app.get("/api/archive")
async def archive():
    """Size and coverage of the measured CPCB archive available for training."""
    key = os.getenv("XKDR_API_KEY")
    if not key:
        raise HTTPException(503, "XKDR_API_KEY not configured")

    async def run():
        async with httpx.AsyncClient(timeout=90) as client:
            return await S.cpcb_meta(client, key)

    return await _cached("archive", 12 * 3600, run)


@app.get("/api/tensor")
def tensor_info():
    """Rolling live tensor saved for the model."""
    import numpy as np

    f = live.data_dir / "live_tensor.npz"
    if not f.exists():
        return {"exists": False}
    d = np.load(f)
    X = d["X"]
    return {
        "exists": True,
        "shape": list(X.shape),
        "timestamps": [str(t) for t in d["timestamps"]],
        "features": [str(x) for x in d["features"]],
        "coverage_per_feature": [round(float(v), 4) for v in np.isfinite(X).mean(axis=(0, 1))],
        "size_kb": round(f.stat().st_size / 1024, 1),
    }
