import os
from dotenv import load_dotenv

load_dotenv()

# ── TinyFish ──────────────────────────────────────────
TINYFISH_API_KEY = os.getenv("TINYFISH_API_KEY", "")
TINYFISH_BASE_URL = "https://agent.tinyfish.ai/v1/automation/run-sse"

# ── Supabase ──────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "super-secret-jwt-token-with-at-least-32-characters-long")

# ── Resend ────────────────────────────────────────────
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "alerts@tenderwatch.in")

# ── App flags ─────────────────────────────────────────
SKIP_AUTH = os.getenv("SKIP_AUTH", "true").lower() == "true"
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:5173")

# ── Portal registry ───────────────────────────────────
PORTALS: dict[str, dict] = {
    "gem": {
        "name": "GeM Portal",
        "description": "Government e-Marketplace — central procurement platform",
        "url": "https://gem.gov.in",
        "icon": "🏛️",
        "color": "#4db8ff",
    },
    "cppp": {
        "name": "CPPP",
        "description": "Central Public Procurement Portal — all central govt tenders",
        "url": "https://eprocure.gov.in/cppp",
        "icon": "📋",
        "color": "#00e09e",
    },
    "mod": {
        "name": "Defence Tenders",
        "description": "Ministry of Defence — defence procurement tenders",
        "url": "https://mod.gov.in/tenders",
        "icon": "🛡️",
        "color": "#ffb547",
    },
    "ireps": {
        "name": "IREPS / Railways",
        "description": "Indian Railway E-Procurement System",
        "url": "https://www.ireps.gov.in",
        "icon": "🚂",
        "color": "#ff4d6a",
    },
    "nhai": {
        "name": "NHAI",
        "description": "National Highways Authority of India tenders",
        "url": "https://nhai.gov.in/tenders",
        "icon": "🛣️",
        "color": "#a78bfa",
    },
}
