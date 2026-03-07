"""Alert settings CRUD + test email."""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from database import db
from config import DEMO_MODE
from email_service import send_tender_digest
from mock_data import MOCK_TENDERS

router = APIRouter(prefix="/alerts", tags=["alerts"])

_demo_settings: dict = {
    "id": "alert-demo-001",
    "user_id": "00000000-0000-0000-0000-000000000001",
    "email_enabled": True,
    "email_address": "dev@tenderwatch.in",
    "alert_on": ["new_tender", "deadline_approaching"],
    "digest_time": "08:00",
}


class AlertSettingsUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    email_address: Optional[str] = None
    alert_on: Optional[List[str]] = None
    digest_time: Optional[str] = None


@router.get("/settings")
async def get_settings(user=Depends(get_current_user)):
    if DEMO_MODE:
        return _demo_settings
    result = db().table("alert_settings").select("*").eq("user_id", user["id"]).execute()
    if not result.data:
        return {"email_enabled": False, "email_address": "", "alert_on": [], "digest_time": "08:00"}
    return result.data[0]


@router.put("/settings")
async def update_settings(body: AlertSettingsUpdate, user=Depends(get_current_user)):
    update_data = body.model_dump(exclude_none=True)
    if DEMO_MODE:
        _demo_settings.update(update_data)
        return _demo_settings
    result = (
        db().table("alert_settings")
        .upsert({"user_id": user["id"], **update_data})
        .execute()
    )
    return result.data[0]


@router.post("/test")
async def send_test_email(user=Depends(get_current_user)):
    """Sends a test digest to the user's alert email."""
    settings = _demo_settings if DEMO_MODE else (
        db().table("alert_settings").select("*").eq("user_id", user["id"]).execute().data or [{}]
    )[0]

    email = settings.get("email_address") or user.get("email", "")
    if not email:
        raise HTTPException(400, "No email address configured")

    result = send_tender_digest(
        to_email=email,
        tenders=MOCK_TENDERS[:3],
        watchlist_name="Test Watchlist",
        user_name=user.get("email", "there").split("@")[0],
    )
    return {"status": "sent", "to": email, "result": result}
