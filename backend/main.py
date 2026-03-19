"""FastAPI application entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import CORS_ORIGIN, DEMO_MODE, SKIP_AUTH

from routers import portals, search, watchlists, tenders, alerts, history

app = FastAPI(
    title="TenderWatch API",
    description="Government contract intelligence platform powered by TinyFish AI agents",
    version="1.0.0",
)

# ── CORS ────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN, "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────────
app.include_router(portals.router)
app.include_router(search.router)
app.include_router(watchlists.router)
app.include_router(tenders.router)
app.include_router(alerts.router)
app.include_router(history.router)


# ── Health check ────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "demo_mode": DEMO_MODE,
        "skip_auth": SKIP_AUTH,
        "version": "1.0.0",
    }


# ── Dev entry ───────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
