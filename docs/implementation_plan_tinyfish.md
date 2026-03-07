# TenderWatch — Implementation Plan

Full-stack build of TenderWatch, a government contract intelligence platform using the TinyFish Web Agent API. The project deploys AI agents across Indian government procurement portals, extracting live tender listings. Built for the TinyFish hackathon.

## Proposed Changes

### Directory Structure
```
tinyfish_proj/
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── auth.py
│   ├── tinyfish.py
│   ├── database.py
│   ├── email_service.py
│   ├── routers/
│   │   ├── portals.py
│   │   ├── search.py
│   │   ├── watchlists.py
│   │   ├── tenders.py
│   │   └── alerts.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── lib/
        │   ├── supabase.js
        │   └── api.js
        ├── store/
        │   └── index.js (Zustand)
        ├── data/
        │   └── mockTenders.js (demo mode seed data)
        └── components/ + pages/
```

---

### Backend (FastAPI / Python)

#### [NEW] `backend/main.py`
FastAPI app entrypoint. Registers all routers, sets CORS for Vite dev server, adds health check endpoint.

#### [NEW] `backend/config.py`
All env var loading (TINYFISH_API_KEY, SUPABASE_URL, etc.) + the `PORTALS` dict from spec.

#### [NEW] `backend/auth.py`
Supabase JWT validation FastAPI dependency using `python-jose`. Decodes bearer token against Supabase JWT secret. All protected routes use `Depends(get_current_user)`.

#### [NEW] `backend/tinyfish.py`
Core agent runner. `scan_portal()` opens SSE connection to `agent.tinyfish.ai/v1/automation/run-sse`, yields progress events, extracts final JSON. `scan_all_portals()` runs concurrently with `asyncio.gather`. Includes exponential backoff retry (max 2 retries).

#### [NEW] `backend/routers/search.py`
`POST /search` — SSE streaming endpoint. Runs concurrent portal scans, yields `START → PROGRESS → PORTAL_COMPLETE → ERROR → DONE` events. Results stored in Supabase tenders table if user is authenticated.

#### [NEW] `backend/routers/portals.py`
`GET /portals` — returns static portal list with metadata.

#### [NEW] `backend/routers/watchlists.py`
Full CRUD + `POST /watchlists/:id/scan` that triggers a manual scan (SSE stream).

#### [NEW] `backend/routers/tenders.py`
Paginated `GET /tenders` with filters, `POST /tenders/:id/save`, `POST /tenders/:id/read`, `GET /tenders/stats`.

#### [NEW] `backend/routers/alerts.py`
`GET + PUT /alerts/settings`, `POST /alerts/test` (sends test email via Resend).

#### [NEW] `backend/email_service.py`
Resend API integration: sends tender digest email with urgency breakdown.

#### [NEW] `backend/database.py`
Supabase Python client initializer + helper functions.

#### [NEW] `backend/schema.sql`
Full PostgreSQL schema for Supabase: `users`, `watchlists`, `tenders`, `scan_runs`, `alert_settings` tables with RLS policies.

#### [NEW] `backend/requirements.txt`
```
fastapi, uvicorn, httpx, python-dotenv, python-jose[cryptography],
supabase, resend, asyncio
```

#### [NEW] `backend/.env.example`

---

### Frontend (React + Vite + Tailwind)

#### [NEW] `frontend/` (scaffolded via `npm create vite@latest`)

#### [NEW] `frontend/src/index.css`
Global CSS with all design tokens from spec (color palette as CSS custom properties), Google Fonts (Playfair Display, DM Sans, DM Mono), noise texture overlay, base utility classes.

#### [NEW] `frontend/src/lib/supabase.js`
Supabase JS client, auth helpers (`signInWithGoogle`, `signOut`, `getSession`).

#### [NEW] `frontend/src/lib/api.js`
Axios-based API client with JWT injection. `openScanStream()` function for EventSource / ReadableStream SSE consumption.

#### [NEW] `frontend/src/store/index.js`
Zustand store: `auth` slice (user, session), `scan` slice (status, activity log per portal), `tenders` slice (results, saved), `ui` slice (toast queue).

#### [NEW] `frontend/src/data/mockTenders.js`
20 seeded realistic tender objects for demo mode (DEMO_MODE env flag). Lets the app look live without API calls.

#### Pages
| Page | Route | Key Behavior |
|------|--------|-------------|
| `LandingPage` | `/` | Marketing hero, feature grid, CTA |
| `LoginPage` | `/login` | Supabase email + Google OAuth |
| `SignupPage` | `/signup` | Registration |
| `DashboardPage` | `/app` | Search panel + SSE activity feed + TenderGrid |
| `SavedPage` | `/app/saved` | Filtered saved tenders |
| `WatchlistsPage` | `/app/watchlists` | CRUD watchlists, trigger manual scan |
| `AlertsPage` | `/app/alerts` | Email alert settings form |
| `SettingsPage` | `/app/settings` | Profile info, API key display |

#### Shared Components
- `Layout` — Header (logo, nav, user avatar) + Sidebar (page links, active state)
- `TenderCard` — displays with urgency badge, formatted value, portal icon, save/read actions
- `TenderDetailModal` — full tender info, source link, save button
- `PortalSelector` — multi-toggle button group for portal selection
- `ActivityFeed` — scrolling live log of scan events (`PROGRESS`, `PORTAL_COMPLETE`, `ERROR`)
- `EmptyState` — context-aware empty state illustrations
- `LoadingSpinner` — branded spinner
- `Toast` — notification system (top-right, auto-dismiss)
- `WatchlistCard` + `CreateWatchlistModal`

---

## Verification Plan

### Backend Server Startup
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Visit http://localhost:8000/docs — FastAPI Swagger UI should show all endpoints
```

### Frontend Dev Server
```bash
cd frontend
npm install
npm run dev
# Visit http://localhost:5173 — app should load
```

### Key Manual Checks (Browser)
1. `/` — Landing page renders with hero section and green accent colors
2. `/login` — Login form renders, Google OAuth button visible
3. `/app` — Dashboard loads, SearchPanel visible on left
4. Select portals → enter keywords → click "Scan Portals" → ActivityFeed shows SSE events
5. In DEMO_MODE=true, tender cards appear immediately with correct urgency badges/values
6. Click a TenderCard → Detail modal opens correctly
7. `/app/saved` — saved tenders appear; `/app/watchlists` — watchlist CRUD works
8. `/app/alerts` — Alert settings form renders and submits

### API Endpoint Check (Swagger at /docs)
- `GET /portals` → returns portal list
- `GET /tenders/stats` → returns stats object  
- `GET /watchlists` → returns empty array (no auth token needed in dev mode)
