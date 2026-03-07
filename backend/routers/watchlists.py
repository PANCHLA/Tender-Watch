"""Watchlist CRUD + manual scan trigger."""

import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from auth import get_current_user
from database import db
from config import DEMO_MODE
from routers.search import run_scan_stream, SearchRequest

router = APIRouter(prefix="/watchlists", tags=["watchlists"])

# ── In-memory store for demo mode ────────────────────────────────
_demo_watchlists: list[dict] = [
    {
        "id": "wl-demo-001",
        "user_id": "00000000-0000-0000-0000-000000000001",
        "name": "IT Networking Projects",
        "keywords": ["networking", "switches", "routers", "LAN", "WiFi"],
        "portals": ["gem", "cppp"],
        "min_value": None,
        "max_value": None,
        "location": None,
        "is_active": True,
        "scan_frequency": "daily",
        "last_scanned_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
]


class WatchlistCreate(BaseModel):
    name: str
    keywords: list[str]
    portals: list[str]
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    location: Optional[str] = None
    scan_frequency: str = "daily"


class WatchlistUpdate(WatchlistCreate):
    is_active: Optional[bool] = True


# ── Endpoints ─────────────────────────────────────────────────────

@router.get("")
async def list_watchlists(user=Depends(get_current_user)):
    if DEMO_MODE:
        return [w for w in _demo_watchlists if w["user_id"] == user["id"]]
    result = db().table("watchlists").select("*").eq("user_id", user["id"]).execute()
    return result.data


@router.post("")
async def create_watchlist(body: WatchlistCreate, user=Depends(get_current_user)):
    new_wl = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "name": body.name,
        "keywords": body.keywords,
        "portals": body.portals,
        "min_value": body.min_value,
        "max_value": body.max_value,
        "location": body.location,
        "is_active": True,
        "scan_frequency": body.scan_frequency,
        "last_scanned_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if DEMO_MODE:
        _demo_watchlists.append(new_wl)
        return new_wl
    result = db().table("watchlists").insert(new_wl).execute()
    return result.data[0]


@router.put("/{watchlist_id}")
async def update_watchlist(watchlist_id: str, body: WatchlistUpdate, user=Depends(get_current_user)):
    if DEMO_MODE:
        for i, wl in enumerate(_demo_watchlists):
            if wl["id"] == watchlist_id and wl["user_id"] == user["id"]:
                _demo_watchlists[i].update(body.model_dump(exclude_none=True))
                return _demo_watchlists[i]
        raise HTTPException(404, "Watchlist not found")
    result = (
        db().table("watchlists")
        .update(body.model_dump(exclude_none=True))
        .eq("id", watchlist_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Watchlist not found")
    return result.data[0]


@router.delete("/{watchlist_id}")
async def delete_watchlist(watchlist_id: str, user=Depends(get_current_user)):
    if DEMO_MODE:
        global _demo_watchlists
        _demo_watchlists = [w for w in _demo_watchlists
                            if not (w["id"] == watchlist_id and w["user_id"] == user["id"])]
        return {"deleted": True}
    db().table("watchlists").delete().eq("id", watchlist_id).eq("user_id", user["id"]).execute()
    return {"deleted": True}


@router.post("/{watchlist_id}/scan")
async def scan_watchlist(watchlist_id: str, user=Depends(get_current_user)):
    """Trigger a manual scan of a watchlist — streams SSE events."""
    # Fetch watchlist
    if DEMO_MODE:
        wl = next((w for w in _demo_watchlists if w["id"] == watchlist_id), None)
    else:
        result = db().table("watchlists").select("*").eq("id", watchlist_id).eq("user_id", user["id"]).execute()
        wl = result.data[0] if result.data else None

    if not wl:
        raise HTTPException(404, "Watchlist not found")

    req = SearchRequest(
        keywords=" ".join(wl["keywords"]),
        portals=wl["portals"],
        min_value=wl.get("min_value"),
        max_value=wl.get("max_value"),
        location=wl.get("location"),
    )

    return StreamingResponse(
        run_scan_stream(req, user),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
