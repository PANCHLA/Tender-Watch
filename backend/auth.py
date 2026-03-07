"""Authentication — validates Supabase JWT, falls back to demo user."""

import logging
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from config import SUPABASE_JWT_SECRET, SKIP_AUTH
from database import get_supabase

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

# Fake dev user when no valid JWT is provided (demo bypass)
DEV_USER = {
    "id": "00000000-0000-0000-0000-000000000001",
    "email": "demo@tenderwatch.in",
    "role": "authenticated",
}


def _ensure_public_user(user_id: str, email: str = ""):
    """
    Ensure the authenticated user exists in public.users table.
    The tenders table has a FK to public.users, so this must exist
    before any tenders can be inserted for this user.
    """
    sb = get_supabase()
    if not sb:
        return
    try:
        sb.table("users").upsert(
            {"id": user_id, "email": email},
            on_conflict="id",
        ).execute()
    except Exception as e:
        logger.debug(f"public.users upsert for {user_id}: {e}")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    1. If a valid Supabase JWT is present → decode it, return real user.
    2. If SKIP_AUTH is true and no/invalid token → return the demo user.
    3. Otherwise → 401 Unauthorized.
    """
    if credentials is not None:
        token = credentials.credentials
        # Skip decoding for the literal "dev" token (frontend demo mode)
        if token == "dev":
            _ensure_public_user(DEV_USER["id"], DEV_USER["email"])
            return DEV_USER
        try:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            # Supabase puts the user UUID in "sub"
            user = {
                "id": payload.get("sub"),
                "email": payload.get("email", ""),
                "role": payload.get("role", "authenticated"),
            }
            # Ensure user exists in public.users (FK requirement)
            _ensure_public_user(user["id"], user["email"])
            return user
        except JWTError as e:
            if not SKIP_AUTH:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid or expired token: {str(e)}",
                )
            # SKIP_AUTH is on and token is invalid → fall through to dev user

    # No credentials at all
    if SKIP_AUTH:
        _ensure_public_user(DEV_USER["id"], DEV_USER["email"])
        return DEV_USER

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing authorization header",
    )
