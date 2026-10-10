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

from .live.service import LiveService  # noqa: E402

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
