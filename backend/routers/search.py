"""
POST /search — streams live portal scan results via SSE.

Event sequence:
  START → PROGRESS (per portal, on start) → PORTAL_COMPLETE | ERROR (per portal) → DONE
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from auth import get_current_user
from tinyfish import scan_portal
from config import PORTALS
from database import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["search"])


class SearchRequest(BaseModel):
    keywords: str
    portals: list[str]
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    location: Optional[str] = None


def sse(event_data: dict) -> str:
    return f"data: {json.dumps(event_data)}\n\n"


def _store_tenders(tenders: list[dict], user_id: str | None) -> list[dict]:
    """
    Insert scraped tenders into the Supabase tenders table.
    Returns the list of tenders enriched with their DB ids.
    """
    sb = get_supabase()
    if not sb or not tenders:
        for i, t in enumerate(tenders):
            t.setdefault("id", str(uuid.uuid4()))
        return tenders

    rows = []
    for t in tenders:
        # Parse value — may be a number or string
        value_numeric = None
        raw_value = t.get("value")
        if raw_value is not None:
            try:
                value_numeric = int(float(raw_value))
            except (ValueError, TypeError):
                pass

        # Parse deadline
        deadline = t.get("deadline")
        if deadline:
            try:
                datetime.strptime(deadline, "%Y-%m-%d")
            except ValueError:
                deadline = None

        row = {
            "portal": t.get("portal", ""),
            "title": t.get("title", "Unknown"),
            "reference_number": t.get("reference_number"),
            "department": t.get("department"),
            "value_numeric": value_numeric,
            "value_raw": str(raw_value) if raw_value else None,
            "deadline": deadline,
            "location": t.get("location"),
            "description": t.get("description"),
            "source_url": t.get("tender_url") or t.get("source_url"),
            "is_saved": False,
            "is_read": False,
        }
        # Always associate tenders with the user (real or demo)
        if user_id:
            row["user_id"] = user_id
        rows.append(row)

    try:
        result = sb.table("tenders").insert(rows).execute()
        stored = result.data if result.data else []
        enriched = []
        for db_row in stored:
            enriched.append({
                "id": db_row["id"],
                "portal": db_row.get("portal"),
                "title": db_row.get("title"),
                "reference_number": db_row.get("reference_number"),
                "department": db_row.get("department"),
                "value": db_row.get("value_numeric"),
                "value_raw": db_row.get("value_raw"),
                "deadline": db_row.get("deadline"),
                "location": db_row.get("location"),
                "description": db_row.get("description"),
                "source_url": db_row.get("source_url"),
                "tender_url": db_row.get("source_url"),
                "is_saved": db_row.get("is_saved", False),
                "is_read": db_row.get("is_read", False),
            })
        logger.info(f"Stored {len(enriched)} tenders in Supabase")
        return enriched
    except Exception as e:
        logger.error(f"Failed to store tenders in DB: {e}")
        for i, t in enumerate(tenders):
            t.setdefault("id", str(uuid.uuid4()))
        return tenders


async def run_scan_stream(req: SearchRequest, user: dict):
    """
    Async generator that yields SSE events as portals complete.
    """
    valid_portals = [p for p in req.portals if p in PORTALS]
    if not valid_portals:
        yield sse({"type": "ERROR", "error": "No valid portals selected"})
        return

    user_id = user.get("id") or user.get("sub")

    yield sse({"type": "START", "portals": valid_portals, "keywords": req.keywords})

    queue: asyncio.Queue = asyncio.Queue()

    async def run_one(portal_key: str):
        yield_event = None
        try:
            await queue.put({
                "type": "PROGRESS",
                "portal": portal_key,
                "portal_name": PORTALS[portal_key]["name"],
                "message": "Scanning portal…",
            })
            tenders = await scan_portal(
                portal_key,
                req.keywords,
                req.min_value,
                req.max_value,
                req.location,
            )

            stored = await asyncio.get_event_loop().run_in_executor(
                None, _store_tenders, tenders, user_id
            )

            yield_event = {
                "type": "PORTAL_COMPLETE",
                "portal": portal_key,
                "portal_name": PORTALS[portal_key]["name"],
                "tenders": stored,
                "count": len(stored),
            }
        except Exception as e:
            logger.exception(f"Portal {portal_key} scan failed")
            yield_event = {
                "type": "ERROR",
                "portal": portal_key,
                "portal_name": PORTALS[portal_key]["name"],
                "error": str(e),
            }
        finally:
            await queue.put(yield_event)
            await queue.put(None)

    tasks = [asyncio.create_task(run_one(p)) for p in valid_portals]
    sentinels_received = 0
    total = len(valid_portals)
    all_tenders = []

    while sentinels_received < total:
        event = await queue.get()
        if event is None:
            sentinels_received += 1
            continue
        if event.get("type") == "PORTAL_COMPLETE":
            all_tenders.extend(event.get("tenders", []))
        yield sse(event)

    yield sse({"type": "DONE", "total": len(all_tenders)})


@router.post("")
async def search(req: SearchRequest, user=Depends(get_current_user)):
    """SSE endpoint — streams scan progress across portals."""
    return StreamingResponse(
        run_scan_stream(req, user),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
