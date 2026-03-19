import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user, DEV_USER
from database import get_supabase

router = APIRouter(prefix="/history", tags=["history"])

_demo_history_store = []


@router.get("")
def get_search_history(user=Depends(get_current_user)):
    user_id = user.get("id") or user.get("sub")
    sb = get_supabase()
    is_dev = user_id == DEV_USER["id"]

    if is_dev or not sb:
        # Return demo history sorted by created_at desc
        return {"history": sorted(_demo_history_store, key=lambda x: x["created_at"], reverse=True)}

    try:
        response = sb.table("search_history").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return {"history": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")


@router.get("/{history_id}")
def get_history_detail(history_id: str, user=Depends(get_current_user)):
    """Return a single history record with its linked tenders."""
    user_id = user.get("id") or user.get("sub")
    sb = get_supabase()
    is_dev = user_id == DEV_USER["id"]

    if is_dev or not sb:
        # Find history record in demo store
        record = next((h for h in _demo_history_store if h["id"] == history_id), None)
        if not record:
            raise HTTPException(status_code=404, detail="History record not found")

        # Find linked tenders from demo store
        from routers.tenders import _demo_tenders_store, _demo_state
        tenders = []
        for t_id, t in _demo_tenders_store.items():
            if t.get("search_history_id") == history_id:
                state = _demo_state.get(t_id, {})
                tenders.append({**t, **state})

        return {"history": record, "tenders": tenders}

    try:
        # Fetch history record
        h_result = sb.table("search_history").select("*").eq("id", history_id).eq("user_id", user_id).execute()
        if not h_result.data:
            raise HTTPException(status_code=404, detail="History record not found")

        # Fetch linked tenders
        t_result = sb.table("tenders").select("*").eq("search_history_id", history_id).eq("user_id", user_id).order("found_at", desc=True).execute()

        return {"history": h_result.data[0], "tenders": t_result.data or []}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history detail: {str(e)}")


@router.delete("/{history_id}")
def delete_search_history(history_id: str, user=Depends(get_current_user)):
    user_id = user.get("id") or user.get("sub")
    sb = get_supabase()
    is_dev = user_id == DEV_USER["id"]

    if is_dev or not sb:
        global _demo_history_store
        _demo_history_store = [h for h in _demo_history_store if h["id"] != history_id]
        return {"status": "success"}

    try:
        sb.table("search_history").delete().eq("id", history_id).eq("user_id", user_id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete history: {str(e)}")
