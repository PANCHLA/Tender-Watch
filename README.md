# TenderWatch — Running & Debugging Guide

## Quick Start (2 terminals)

### Terminal 1 — Backend
```powershell
cd c:\Users\Parth\Desktop\EXTRAS\tinyfish_proj\backend
python -m uvicorn main:app --reload --port 8000
```
✅ Ready when you see: `Application startup complete.`

### Terminal 2 — Frontend
```powershell
cd c:\Users\Parth\Desktop\EXTRAS\tinyfish_proj\frontend
npm run dev
```
✅ Ready when you see: `Local: http://localhost:5173/`

Then open **http://localhost:5173** in your browser. Click **"Continue as Demo User"** to skip login.

---

## Environment Check

Before starting, make sure `backend/.env` has exactly this format (no trailing comments):
```
TINYFISH_API_KEY=sk-tinyfish-...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_JWT_SECRET=...
RESEND_API_KEY=re_...
FROM_EMAIL=you@gmail.com
SKIP_AUTH=true
DEMO_MODE=false
CORS_ORIGIN=http://localhost:5173
```

To verify values are loading correctly:
```powershell
cd backend
python -c "from dotenv import dotenv_values; v = dotenv_values('.env'); [print(k,'=',v[k][:10]+'...') for k in v]"
```

---

## API Docs (Swagger UI)

With the backend running, open: **http://localhost:8000/docs**

All endpoints listed there — you can test them directly in the browser with the built-in form. No auth token needed while `SKIP_AUTH=true`.

### Key endpoints to test manually in Swagger:
| Endpoint | What to verify |
|----------|---------------|
| `GET /health` | Shows `demo_mode` and `skip_auth` flags |
| `GET /portals` | Returns all 5 portals |
| `GET /tenders/stats` | Returns KPI numbers |
| `GET /watchlists` | Returns demo watchlist |

---

## Testing Live TinyFish Scan

### Option A — via the app UI
1. Go to `http://localhost:5173/app`
2. Type keywords, select GeM only (fastest portal), click **Scan Portals**
3. Watch the activity feed — events take **2–5 min** (real browser agent running)

### Option B — via Python script
```powershell
cd backend
python test_connections.py
```
This tests both Supabase auth and TinyFish and prints results. TinyFish part takes 2–5 min — **don't Ctrl+C**, just wait.

### Option C — via curl / Swagger
Test the SSE endpoint directly:
```powershell
curl -X POST http://localhost:8000/search `
  -H "Content-Type: application/json" `
  -d '{"keywords":"IT equipment","portals":["gem"]}' `
  --no-buffer
```
Events stream in real time. Look for `COMPLETE` event with `tenders[]`.

---

## Common Issues & Fixes

| Problem | Fix |
|---------|-----|
| `uvicorn: command not found` | Use `python -m uvicorn ...` instead |
| Backend crashes on startup | Check `backend/.env` exists and has no comments on value lines |
| `DEMO_MODE` still True | Make sure `.env` has `DEMO_MODE=false` with no trailing spaces/comments |
| Supabase `WinError 10060` | Network timeout — `SKIP_AUTH=true` bypasses this for now. See Supabase note below. |
| Frontend shows blank page | Open browser console (F12) and check for JS errors |
| Port already in use | Run `netstat -ano \| findstr :8000` and kill the PID shown |

### Supabase connectivity (WinError 10060)
The `supabase-py` library may timeout on your network. This doesn't affect the core scan feature while `SKIP_AUTH=true`. To fix it later:
- Try a different network (hotspot vs. WiFi)
- Or in Supabase dashboard → Settings → API → check if the project is paused (free tier pauses after 1 week inactive)

---

## Switching Between Demo and Live Mode

| Mode | What it does | Set in .env |
|------|-------------|-------------|
| `DEMO_MODE=true` | Uses 12 seeded fake tenders, no API calls | Safe for UI dev |
| `DEMO_MODE=false` | Calls real TinyFish agents on real portals | Needs API key |

---

## Database Setup (Supabase)

If you haven't run the schema yet:
1. Go to your Supabase project → **SQL Editor**
2. Open `backend/schema.sql`
3. Copy all contents → paste into SQL Editor → **Run**

This creates: `users`, `watchlists`, `tenders`, `scan_runs`, `alert_settings` tables.

---

## Project Structure Reference
```
tinyfish_proj/
├── backend/
│   ├── main.py           ← FastAPI app (start here)
│   ├── tinyfish.py       ← TinyFish agent runner + SSE parsing
│   ├── mock_data.py      ← Fake tenders for DEMO_MODE
│   ├── config.py         ← All env vars + portal registry
│   ├── auth.py           ← JWT validation (bypassed by SKIP_AUTH)
│   ├── routers/
│   │   ├── search.py     ← POST /search (SSE stream)
│   │   ├── watchlists.py ← CRUD watchlists
│   │   ├── tenders.py    ← Results, save, stats
│   │   └── alerts.py     ← Email alert settings
│   ├── schema.sql        ← Run this in Supabase SQL Editor
│   └── .env              ← Your secrets (never commit this)
└── frontend/
    ├── src/
    │   ├── pages/        ← One file per page
    │   ├── components/   ← Shared UI components
    │   ├── lib/api.js    ← All API calls + SSE handler
    │   └── store/        ← Zustand state (auth, scan, tenders)
    └── .env              ← VITE_API_URL, VITE_DEMO_MODE
```
