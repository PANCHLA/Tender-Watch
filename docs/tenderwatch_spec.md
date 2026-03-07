# TenderWatch — Full Build Specification
**For: Google Antigravity (or any AI builder)**
**Version:** 1.0 | **Project:** TinyFish Hackathon Submission

---

## 1. What You're Building

**TenderWatch** is a government contract intelligence platform.
It deploys AI web agents (via the TinyFish API) across Indian government procurement portals simultaneously, extracts live tender listings, and presents them in a dashboard with filtering, urgency scoring, alerts, and saved watchlists.

**The one-line pitch:**
> "Never miss a government contract again. We monitor every relevant portal 24/7 so you don't have to."

**Target user:** Small and mid-size contractors, IT firms, and consultants who currently have a junior employee manually checking government portals every morning.

---

## 2. The Core Mechanic (Understand This First)

The TinyFish Web Agent API is the engine. It takes a URL + a plain-English goal, sends a real AI browser agent to navigate that website, and returns structured JSON results.

```
POST https://agent.tinyfish.ai/v1/automation/run-sse
Headers: X-API-Key: <key>, Content-Type: application/json

Body:
{
  "url": "https://gem.gov.in",
  "goal": "Find all open tenders related to 'IT networking equipment'.
           For each tender extract: title, reference_number, department,
           value, deadline, location, description.
           Return as JSON with a 'tenders' array.",
  "proxy_config": { "enabled": false }
}
```

Results stream back via SSE (Server-Sent Events). The final event has `"type": "COMPLETE"` and contains `resultJson.tenders[]`.

**Your app's job:** Be the interface + brain that decides what to search for, runs multiple portals concurrently, processes the results, and presents them cleanly.

---

## 3. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React + Vite | Component-based, proper routing |
| Styling | Tailwind CSS | Utility-first, fast to build |
| Backend | Python FastAPI | Async, SSE streaming support |
| Database | Supabase (PostgreSQL) | Auth + DB + realtime in one |
| Scheduler | Supabase Edge Functions or cron | Automated daily scans |
| Email | Resend API | Alert emails |
| Deployment | Vercel (frontend) + Railway (backend) | Both have free tiers |

---

## 4. Pages & Routes

```
/                    → Landing page (marketing)
/app                 → Main dashboard (search + results)
/app/saved           → Saved tenders
/app/watchlists      → Keyword watchlists (automated monitoring)
/app/alerts          → Alert settings
/app/settings        → Profile, API key management
/login               → Auth (Supabase Auth, Google OAuth)
/signup              → Registration
```

---

## 5. Database Schema (Supabase / PostgreSQL)

### users
```
id              uuid PRIMARY KEY (from Supabase Auth)
email           text
full_name       text
company_name    text
created_at      timestamptz
plan            text DEFAULT 'free'  -- 'free' | 'pro'
```

### watchlists
```
id              uuid PRIMARY KEY
user_id         uuid REFERENCES users(id)
name            text               -- e.g. "IT Hardware Projects"
keywords        text[]             -- e.g. ["networking", "switches", "LAN"]
portals         text[]             -- e.g. ["gem", "cppp"]
min_value       bigint             -- in paise / smallest unit
max_value       bigint
location        text
is_active       boolean DEFAULT true
scan_frequency  text DEFAULT 'daily'  -- 'daily' | 'twice_daily' | 'hourly'
last_scanned_at timestamptz
created_at      timestamptz
```

### tenders
```
id              uuid PRIMARY KEY
watchlist_id    uuid REFERENCES watchlists(id)
user_id         uuid REFERENCES users(id)
portal          text               -- 'gem' | 'cppp' | 'mod' | 'ireps'
title           text
reference_number text
department      text
value_raw       text               -- raw string from portal
value_numeric   bigint             -- parsed numeric value
deadline        date
location        text
description     text
urgency         text               -- 'high' | 'medium' | 'low'
is_saved        boolean DEFAULT false
is_read         boolean DEFAULT false
source_url      text               -- portal URL it came from
found_at        timestamptz DEFAULT now()
```

### scan_runs
```
id              uuid PRIMARY KEY
watchlist_id    uuid REFERENCES watchlists(id)
started_at      timestamptz
completed_at    timestamptz
portals_scanned text[]
tenders_found   int
status          text    -- 'running' | 'completed' | 'failed'
error           text
```

### alert_settings
```
id              uuid PRIMARY KEY
user_id         uuid REFERENCES users(id)
email_enabled   boolean DEFAULT true
email_address   text
alert_on        text[]  -- ['new_tender', 'deadline_approaching']
digest_time     time DEFAULT '08:00'  -- daily digest time
```

---

## 6. API Endpoints (FastAPI Backend)

### Auth
All endpoints except `/health` require `Authorization: Bearer <supabase_jwt>` header.

### Portals
```
GET  /portals
→ Returns list of supported portals with name, description, logo
```

### Search (one-off, live)
```
POST /search
Body: {
  keywords: string,
  portals: string[],
  min_value?: number,
  max_value?: number,
  location?: string
}
→ SSE stream of events:
  { type: "START", portals: [...] }
  { type: "PROGRESS", portal: "gem", portal_name: "GeM Portal", message: "Scanning..." }
  { type: "PORTAL_COMPLETE", portal: "gem", tenders: [...] }
  { type: "ERROR", portal: "gem", error: "..." }
  { type: "DONE", total: 12 }
```

### Watchlists
```
GET    /watchlists              → List user's watchlists
POST   /watchlists              → Create watchlist
PUT    /watchlists/:id          → Update watchlist
DELETE /watchlists/:id          → Delete watchlist
POST   /watchlists/:id/scan     → Trigger manual scan now (returns SSE stream)
```

### Tenders
```
GET  /tenders?watchlist_id=&portal=&urgency=&is_saved=&sort=&page=
→ Paginated tender results

POST /tenders/:id/save          → Save/unsave a tender
POST /tenders/:id/read          → Mark as read
GET  /tenders/stats             → { total, new_today, high_urgency, portals_active }
```

### Alerts
```
GET  /alerts/settings           → Get user alert preferences
PUT  /alerts/settings           → Update preferences
POST /alerts/test               → Send a test email
```

---

## 7. TinyFish Integration Detail

### Goal prompt template (backend)
```python
def build_goal(keywords: str, min_value=None, max_value=None, location=None) -> str:
    goal = f"""Find all currently open government tenders related to: "{keywords}".

For each tender extract these fields:
- title: full tender name/title
- reference_number: bid/tender reference ID
- department: issuing organization or ministry
- value: estimated contract value in INR as a number (omit currency symbols)
- deadline: submission deadline in YYYY-MM-DD format
- location: state or city if specified
- description: 1-2 sentence summary of the work

Return ONLY valid JSON in this exact format:
{{
  "tenders": [
    {{
      "title": "...",
      "reference_number": "...",
      "department": "...",
      "value": 45000000,
      "deadline": "2026-03-15",
      "location": "...",
      "description": "..."
    }}
  ]
}}

Only include tenders that are currently open (submission deadline in the future).
Return maximum 8 most relevant results."""

    if location:
        goal += f"\nPrefer tenders from location: {location}"
    if min_value:
        goal += f"\nOnly include tenders with value above ₹{min_value:,.0f}"
    if max_value:
        goal += f"\nOnly include tenders with value below ₹{max_value:,.0f}"

    return goal
```

### Running agents concurrently
```python
import asyncio

async def scan_portal(portal_key, portal_url, goal, api_key):
    """Returns list of tenders from one portal"""
    ...

async def scan_all_portals(portals, goal, api_key):
    """Runs all portal scans concurrently"""
    tasks = [scan_portal(p, PORTALS[p]["url"], goal, api_key) for p in portals]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return results
```

### Portals config
```python
PORTALS = {
    "gem":   { "name": "GeM Portal",        "url": "https://gem.gov.in",            "icon": "🏛️" },
    "cppp":  { "name": "CPPP",              "url": "https://eprocure.gov.in/cppp",  "icon": "📋" },
    "mod":   { "name": "Defence Tenders",   "url": "https://mod.gov.in/tenders",    "icon": "🛡️" },
    "ireps": { "name": "IREPS / Railways",  "url": "https://www.ireps.gov.in",      "icon": "🚂" },
    "nhai":  { "name": "NHAI",              "url": "https://nhai.gov.in/tenders",   "icon": "🛣️" },
}
```

---

## 8. Frontend Component Tree

```
App
├── Layout
│   ├── Header (logo, nav, user menu)
│   └── Sidebar (navigation links)
│
├── Pages
│   ├── LandingPage
│   │
│   ├── DashboardPage (/app)
│   │   ├── SearchPanel (sidebar)
│   │   │   ├── KeywordsInput
│   │   │   ├── PortalSelector (multi-toggle)
│   │   │   ├── ValueRangeInputs
│   │   │   ├── LocationInput
│   │   │   └── ScanButton
│   │   ├── ActivityFeed (live scan log)
│   │   ├── PortalStatusBar (badge per portal)
│   │   ├── ResultsHeader (count + sort)
│   │   └── TenderGrid
│   │       └── TenderCard (× N)
│   │           └── TenderDetailModal
│   │
│   ├── SavedPage (/app/saved)
│   │   └── TenderGrid (filtered to saved)
│   │
│   ├── WatchlistsPage (/app/watchlists)
│   │   ├── WatchlistCard (× N)
│   │   │   └── WatchlistEditModal
│   │   └── CreateWatchlistModal
│   │
│   └── AlertsPage (/app/alerts)
│       └── AlertSettingsForm
│
└── Shared Components
    ├── TenderCard
    ├── TenderDetailModal
    ├── EmptyState
    ├── LoadingSpinner
    └── Toast (notifications)
```

---

## 9. TenderCard Component — Data Shape

Each card displays one tender. Here's the data shape and derived display logic:

```typescript
interface Tender {
  id: string
  portal: 'gem' | 'cppp' | 'mod' | 'ireps' | 'nhai'
  title: string
  reference_number?: string
  department?: string
  value?: number          // raw INR value as number
  deadline?: string       // ISO date string
  location?: string
  description?: string
  found_at: string
  is_saved: boolean
  is_read: boolean
}

// Derived display values:

// Urgency (from deadline)
function getUrgency(deadline: string) {
  const days = (new Date(deadline) - new Date()) / 86400000
  if (days < 3)  return { label: 'URGENT',   color: 'red'   }
  if (days < 10) return { label: '< 10 DAYS', color: 'amber' }
  return              { label: 'OPEN',      color: 'green' }
}

// Value display
function formatValue(value: number) {
  if (value >= 1e7)  return `₹${(value/1e7).toFixed(1)}Cr`
  if (value >= 1e5)  return `₹${(value/1e5).toFixed(1)}L`
  return `₹${value.toLocaleString('en-IN')}`
}
```

---

## 10. Key User Flows

### Flow 1: One-off Search
1. User lands on `/app`
2. Types keywords → selects portals → clicks "Scan Portals"
3. Frontend POSTs to `/search`, opens SSE stream
4. Activity feed shows live progress per portal
5. Cards appear as each portal completes
6. User clicks a card → detail modal opens
7. User saves a tender → calls `/tenders/:id/save`

### Flow 2: Automated Watchlist
1. User goes to `/app/watchlists`
2. Creates watchlist: name + keywords + portals + schedule
3. System runs scan on schedule (cron/edge function)
4. New tenders saved to DB, alert email sent if enabled
5. User opens dashboard, sees new results badge
6. User reviews, saves or dismisses tenders

### Flow 3: Alert Email
1. Watchlist scan completes, new tenders found
2. Backend checks user's alert settings
3. If email enabled: Resend API sends digest
4. Email shows: N new tenders found, urgency breakdown, top 3 cards with links

---

## 11. Design System

### Color Palette
```css
--bg:        #0b0f0e     /* near-black green tint */
--surface:   #111615     /* card backgrounds */
--surface2:  #161d1b     /* elevated surfaces */
--border:    #1e2b28     /* subtle borders */
--accent:    #00e09e     /* primary green — CTAs, highlights */
--accent2:   #00b07c     /* hover state */
--text:      #e8f0ee     /* primary text */
--text2:     #7a9490     /* secondary text */
--text3:     #4a6460     /* muted/placeholder text */
--red:       #ff4d6a     /* urgent / error */
--amber:     #ffb547     /* warning / medium urgency */
--blue:      #4db8ff     /* info */
```

### Typography
- **Display/headings:** Playfair Display (serif) — authoritative, premium feel
- **Body/UI:** DM Sans — clean, readable
- **Data/codes/numbers:** DM Mono — reference numbers, values, timestamps

### Aesthetic Direction
Dark, data-dense, government-intelligence aesthetic. Think mission control meets financial terminal. Not playful — serious, trustworthy, precise. Generous use of monospace for data fields. Subtle green accents on dark backgrounds. Noise texture overlay for depth.

### Urgency Tags
- `URGENT` (< 3 days) → red badge
- `< 10 DAYS` (3-10 days) → amber badge
- `OPEN` (10+ days) → green badge

---

## 12. Environment Variables

### Backend (.env)
```
TINYFISH_API_KEY=your_tinyfish_key
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_key
FROM_EMAIL=alerts@tenderwatch.in
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## 13. What NOT to Build (Scope Limits for Hackathon)

These are explicitly out of scope for the v1 submission:

- ❌ Mobile app (responsive web is fine)
- ❌ Team/multi-user accounts
- ❌ Payment processing / billing
- ❌ PDF tender document parsing
- ❌ Auto-filling bid applications
- ❌ State-specific portal logins (auth-gated portals)
- ❌ Analytics / reporting dashboards

---

## 14. Hackathon Submission Checklist

- [ ] Live search works across at least 2 portals (GEM + CPPP minimum)
- [ ] Results display with urgency tags and value formatting
- [ ] At least one watchlist can be created and saved
- [ ] Email alert sends on new tender found
- [ ] 2-3 minute demo video recorded showing live scan
- [ ] Demo video posted on X (Twitter) tagging @Tiny_fish
- [ ] Project submitted on HackerEarth by March 29, 2026

---