"""Tender results — paginated list, save/read, stats."""

import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from auth import get_current_user, DEV_USER
from database import db
from config import DEMO_MODE
from mock_data import MOCK_TENDERS

router = APIRouter(prefix="/tenders", tags=["tenders"])

# In-memory store for demo saves / reads
_demo_state: dict[str, dict] = {}  # id → {is_saved, is_read}
_demo_tenders_store: dict[str, dict] = {}  # id → tender (for scan results in demo mode)

def _apply_demo_state(tender: dict) -> dict:
    state = _demo_state.get(tender["id"], {})
    return {**tender, **state}


def _user_filter(query, user):
    """Always filter by user_id for data isolation."""
    return query.eq("user_id", user["id"])


@router.get("/stats")
async def get_stats(user=Depends(get_current_user)):
    """Dashboard KPIs."""
    if DEMO_MODE:
        from datetime import timedelta
        today = datetime.utcnow().date()
        new_today = sum(1 for t in MOCK_TENDERS
                        if datetime.utcnow().date() == today)
        high_urgency = sum(
            1 for t in MOCK_TENDERS
            if t.get("deadline") and
            (datetime.strptime(t["deadline"], "%Y-%m-%d") - datetime.utcnow()).days < 3
        )
        return {
            "total": len(MOCK_TENDERS) + len(_demo_tenders_store),
            "new_today": 3,
            "high_urgency": high_urgency,
            "portals_active": 5,
        }
    query = db().table("tenders").select("*", count="exact")
    query = _user_filter(query, user)
    result = query.execute()
    return {
        "total": result.count or 0,
        "new_today": 0,
        "high_urgency": 0,
        "portals_active": 0,
    }


@router.get("")
async def list_tenders(
    user=Depends(get_current_user),
    watchlist_id: Optional[str] = Query(None),
    portal: Optional[str] = Query(None),
    urgency: Optional[str] = Query(None),
    is_saved: Optional[bool] = Query(None),
    sort: str = Query("deadline"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    is_demo = DEMO_MODE or (user and user.get("id") == DEV_USER["id"])
    if is_demo:
        all_demo = MOCK_TENDERS + list(_demo_tenders_store.values())
        results = [_apply_demo_state(t) for t in all_demo]
        if portal:
            results = [t for t in results if t.get("portal") == portal]
        if is_saved is not None:
            results = [t for t in results if t.get("is_saved") == is_saved]
        if urgency:
            def _urgency(t):
                dl = t.get("deadline")
                if not dl:
                    return "low"
                days = (datetime.strptime(dl, "%Y-%m-%d") - datetime.utcnow()).days
                if days < 3: return "high"
                if days < 10: return "medium"
                return "low"
            results = [t for t in results if _urgency(t) == urgency]
        start = (page - 1) * page_size
        return {"tenders": results[start: start + page_size], "total": len(results)}

    query = db().table("tenders").select("*")
    query = _user_filter(query, user)
    if portal:
        query = query.eq("portal", portal)
    if is_saved is not None:
        query = query.eq("is_saved", is_saved)
    query = query.order("found_at", desc=True).limit(page_size)
    result = query.execute()
    return {"tenders": result.data, "total": len(result.data)}


@router.post("/{tender_id}/save")
async def toggle_save(tender_id: str, user=Depends(get_current_user)):
    is_demo = DEMO_MODE or (user and user.get("id") == DEV_USER["id"])
    if is_demo:
        current = _demo_state.get(tender_id, {})
        _demo_state[tender_id] = {**current, "is_saved": not current.get("is_saved", False)}
        return {"is_saved": _demo_state[tender_id]["is_saved"]}

    query = db().table("tenders").select("is_saved").eq("id", tender_id)
    query = _user_filter(query, user)
    result = query.execute()
    if not result.data:
        return {"error": "Not found", "is_saved": False}
    new_val = not result.data[0]["is_saved"]
    db().table("tenders").update({"is_saved": new_val}).eq("id", tender_id).execute()
    return {"is_saved": new_val}


@router.post("/{tender_id}/read")
async def mark_read(tender_id: str, user=Depends(get_current_user)):
    is_demo = DEMO_MODE or (user and user.get("id") == DEV_USER["id"])
    if is_demo:
        current = _demo_state.get(tender_id, {})
        _demo_state[tender_id] = {**current, "is_read": True}
        return {"is_read": True}
    query = db().table("tenders").update({"is_read": True}).eq("id", tender_id)
    query = _user_filter(query, user)
    query.execute()
    return {"is_read": True}
