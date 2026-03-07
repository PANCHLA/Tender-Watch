"""Supabase client and database helpers."""

from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

_supabase = None


def get_supabase():
    global _supabase
    if _supabase is None and SUPABASE_URL and SUPABASE_SERVICE_KEY:
        try:
            from supabase import create_client
            # Disable Realtime websocket — it causes WinError 10060 timeouts.
            # We only need the REST API for CRUD operations.
            _supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        except Exception as e:
            print(f"⚠️  Supabase not available: {e}")
    return _supabase


def db():
    """Return supabase client or raise if unavailable."""
    client = get_supabase()
    if client is None:
        raise RuntimeError(
            "Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env"
        )
    return client
