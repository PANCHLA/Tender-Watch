"""
Quick connection test for TinyFish + Supabase.
Run: python test_connections.py
"""
import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()

TINYFISH_API_KEY = os.getenv("TINYFISH_API_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower().split()[0].rstrip(";#") == "true"

print("\n=== TenderWatch Connection Test ===\n")

# ── 1. Env var check ──────────────────────────────────────────
print("📋 Env Vars:")
print(f"  TINYFISH_API_KEY  : {'✅ SET (' + str(len(TINYFISH_API_KEY)) + ' chars)' if TINYFISH_API_KEY and 'your_' not in TINYFISH_API_KEY else '❌ MISSING'}")
print(f"  SUPABASE_URL      : {'✅ ' + SUPABASE_URL if SUPABASE_URL and 'xxxx' not in SUPABASE_URL else '❌ MISSING/PLACEHOLDER'}")
print(f"  SUPABASE_SVC_KEY  : {'✅ SET (' + str(len(SUPABASE_SERVICE_KEY)) + ' chars)' if SUPABASE_SERVICE_KEY and 'your_' not in SUPABASE_SERVICE_KEY else '❌ MISSING'}")
print(f"  SUPABASE_JWT_SEC  : {'✅ SET (' + str(len(SUPABASE_JWT_SECRET)) + ' chars)' if SUPABASE_JWT_SECRET else '❌ MISSING'}")
print(f"  DEMO_MODE         : {DEMO_MODE} (should be False to use live APIs)\n")

print("🗄️  Testing Supabase connection...")
try:
    from supabase import create_client
    sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Lightweight REST query — list watchlists (table may not exist yet, that's fine)
    result = sb.table("watchlists").select("id").limit(1).execute()
    print(f"  ✅ Supabase REST API connected — {len(result.data)} rows returned")
except Exception as e:
    err = str(e)
    if "does not exist" in err or "relation" in err.lower():
        print(f"  ✅ Supabase connected (tables not set up yet — run schema.sql)")
    else:
        print(f"  ❌ Supabase error: {err[:120]}")

# ── 3. TinyFish connectivity ───────────────────────────────────
print("\n⚡ Testing TinyFish API connection...")

async def test_tinyfish():
    import httpx
    import json

    headers = {
        "X-API-Key": TINYFISH_API_KEY,
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
    }
    payload = {
        "url": "https://gem.gov.in",
        "goal": """Find open tenders related to "IT equipment".
Return ONLY valid JSON: {"tenders": [{"title": "...", "reference_number": "...", "department": "...", "value": 1000000, "deadline": "2026-04-01", "location": "Delhi", "description": "test"}]}
Return a maximum of 2 results.""",
        "proxy_config": {"enabled": True},
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            async with client.stream(
                "POST",
                "https://agent.tinyfish.ai/v1/automation/run-sse",
                json=payload,
                headers=headers,
            ) as response:
                status = response.status_code
                if status == 401:
                    print(f"  ❌ TinyFish auth failed (401) — check TINYFISH_API_KEY")
                    return
                if status == 403:
                    print(f"  ❌ TinyFish forbidden (403) — API key may not have credits")
                    return
                if status != 200:
                    print(f"  ❌ TinyFish returned HTTP {status}")
                    return

                print(f"  ✅ TinyFish connected (HTTP {status}) — streaming events...")
                events_seen = []
                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    raw = line[5:].strip()
                    if not raw:
                        continue
                    try:
                        event = json.loads(raw)
                        etype = event.get("type", "?")
                        if etype not in events_seen:
                            events_seen.append(etype)
                            print(f"     Event received: {etype}")

                        if etype == "COMPLETE":
                            result = event.get("resultJson", {})
                            if isinstance(result, str):
                                result = json.loads(result)
                            tenders = result.get("tenders", [])
                            print(f"  ✅ TinyFish returned {len(tenders)} tender(s)")
                            if tenders:
                                t = tenders[0]
                                print(f"     Sample: {t.get('title', 'N/A')[:60]}")
                            return
                    except json.JSONDecodeError:
                        pass

                print(f"  ⚠️  TinyFish stream ended without COMPLETE event. Events seen: {events_seen}")

    except httpx.TimeoutException:
        print("  ⏱️  TinyFish timed out (60s) — agent may still be running, but connection works")
    except Exception as e:
        print(f"  ❌ TinyFish error: {e}")

asyncio.run(test_tinyfish())

print("\n=== Test complete ===\n")
