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

# Add detailed file logging to catch the exact error
import logging.handlers
logger = logging.getLogger(__name__)
fh = logging.FileHandler('debug_scan.log')
fh.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
fh.setFormatter(formatter)
logger.addHandler(fh)
logger.setLevel(logging.DEBUG)

router = APIRouter(prefix="/search", tags=["search"])


class SearchRequest(BaseModel):
    keywords: str
    portals: list[str]
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    location: Optional[str] = None


def sse(event_data: dict) -> str:
    return f"data: {json.dumps(event_data)}\n\n"


from auth import DEV_USER
from routers.tenders import _demo_tenders_store


def _store_tenders(tenders: list[dict], user_id: str | None, search_history_id: str | None = None) -> list[dict]:
    """
    Insert scraped tenders into the Supabase tenders table.
    Returns the list of tenders enriched with their DB ids.
    """
    sb = get_supabase()
    is_dev_user = user_id == DEV_USER["id"]
    if not sb or not tenders or is_dev_user:
        for i, t in enumerate(tenders):
            t_id = str(uuid.uuid4())
            t["id"] = t_id
            t["search_history_id"] = search_history_id
            _demo_tenders_store[t_id] = t
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
        if search_history_id:
            row["search_history_id"] = search_history_id
        rows.append(row)

    try:
        result = sb.table("tenders").insert(rows).execute()
        stored = result.data if result.data else []
    except Exception as insert_err:
        # If insert fails (e.g. search_history_id column doesn't exist yet),
        # retry without search_history_id
        logger.warning(f"Tender insert failed, retrying without search_history_id: {insert_err}")
        for row in rows:
            row.pop("search_history_id", None)
        try:
            result = sb.table("tenders").insert(rows).execute()
            stored = result.data if result.data else []
        except Exception as retry_err:
            logger.error(f"Failed to store tenders in DB (retry): {retry_err}")
            for i, t in enumerate(tenders):
                t.setdefault("id", str(uuid.uuid4()))
            return tenders

    if stored:
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
                "search_history_id": db_row.get("search_history_id"),
            })
        logger.info(f"Stored {len(enriched)} tenders in Supabase")
        return enriched
    else:
        for i, t in enumerate(tenders):
            t.setdefault("id", str(uuid.uuid4()))
        return tenders


def _create_history_record(req: SearchRequest, user_id: str, valid_portals: list[str]) -> str | None:
    """Create a search_history record at the START of the scan so we have an ID to link tenders."""
    from routers.history import _demo_history_store
    sb = get_supabase()
    is_dev_user = user_id == DEV_USER["id"]

    history_record = {
        "keywords": req.keywords,
        "portals": valid_portals,
        "min_value": req.min_value,
        "max_value": req.max_value,
        "location": req.location,
        "tenders_found": 0,
    }

    if is_dev_user or not sb:
        history_id = str(uuid.uuid4())
        history_record["id"] = history_id
        history_record["user_id"] = user_id
        history_record["created_at"] = datetime.utcnow().isoformat() + "Z"
        _demo_history_store.append(history_record)
        return history_id
    else:
        try:
            history_record["user_id"] = user_id
            result = sb.table("search_history").insert(history_record).execute()
            if result.data:
                return result.data[0]["id"]
        except Exception as e:
            logger.error(f"Failed to create search history: {e}")
    return None


def _update_history_count(history_id: str, total_found: int, user_id: str):
    """Update tenders_found count on the history record after scan completes."""
    from routers.history import _demo_history_store
    sb = get_supabase()
    is_dev_user = user_id == DEV_USER["id"]

    if is_dev_user or not sb:
        for h in _demo_history_store:
            if h["id"] == history_id:
                h["tenders_found"] = total_found
                break
    else:
        try:
            sb.table("search_history").update({"tenders_found": total_found}).eq("id", history_id).execute()
        except Exception as e:
            logger.error(f"Failed to update history count: {e}")


async def run_scan_stream(req: SearchRequest, user: dict):
    """
    Async generator that yields SSE events as portals complete.
    """
    valid_portals = [p for p in req.portals if p in PORTALS]
    if not valid_portals:
        yield sse({"type": "ERROR", "error": "No valid portals selected"})
        return

    user_id = user.get("id") or user.get("sub")

    # Create history record upfront to get an ID for linking tenders
    history_id = await asyncio.get_event_loop().run_in_executor(
        None, _create_history_record, req, user_id, valid_portals
    )

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
                None, _store_tenders, tenders, user_id, history_id
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

    total_found = len(all_tenders)

    # Update the history record with final count
    if history_id:
        try:
            await asyncio.get_event_loop().run_in_executor(
                None, _update_history_count, history_id, total_found, user_id
            )
        except Exception as e:
            logger.error(f"Failed to update history count: {e}")

    yield sse({"type": "DONE", "total": total_found})


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
