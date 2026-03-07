"""
TinyFish Web Agent integration.

Sends AI browser agents to government procurement portals and parses
the structured tender JSON from their SSE stream.
"""

import json
import asyncio
import logging
from typing import AsyncGenerator, Optional
import httpx
from config import TINYFISH_API_KEY, TINYFISH_BASE_URL, PORTALS, DEMO_MODE
from mock_data import MOCK_TENDERS

logger = logging.getLogger(__name__)

MAX_RETRIES = 2
AGENT_TIMEOUT = 120  # seconds per portal


def build_goal(keywords: str, min_value: Optional[float] = None,
               max_value: Optional[float] = None,
               location: Optional[str] = None) -> str:
    goal = f"""Find all currently open government tenders related to: "{keywords}".

For each tender extract these fields:
- title: full tender name/title
- reference_number: bid/tender reference ID
- department: issuing organization or ministry
- value: estimated contract value in INR as a number (omit currency symbols)
- deadline: submission deadline in YYYY-MM-DD format
- location: state or city if specified
- description: 1-2 sentence summary of the work
- tender_url: the direct URL/link to this specific tender listing page (not the portal homepage)

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
      "description": "...",
      "tender_url": "https://..."
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


async def scan_portal(
    portal_key: str,
    keywords: str,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    location: Optional[str] = None,
) -> list[dict]:
    """
    Runs a TinyFish agent against one portal. Returns a list of tender dicts.
    Retries up to MAX_RETRIES times on failure.
    """
    portal = PORTALS.get(portal_key)
    if not portal:
        raise ValueError(f"Unknown portal: {portal_key}")

    # ── Demo / no-key mode ────────────────────────────
    if DEMO_MODE or not TINYFISH_API_KEY:
        await asyncio.sleep(1.5)  # simulate network latency
        return [t for t in MOCK_TENDERS if t.get("portal") == portal_key]

    goal = build_goal(keywords, min_value, max_value, location)
    payload = {
        "url": portal["url"],
        "goal": goal,
        "proxy_config": {"enabled": True},
    }
    headers = {
        "X-API-Key": TINYFISH_API_KEY,
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
    }

    for attempt in range(MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=AGENT_TIMEOUT) as client:
                async with client.stream(
                    "POST", TINYFISH_BASE_URL, json=payload, headers=headers
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        raw = line[5:].strip()
                        if not raw:
                            continue
                        try:
                            event = json.loads(raw)
                        except json.JSONDecodeError:
                            continue

                        if event.get("type") == "COMPLETE":
                            result_json = event.get("resultJson", {})
                            if isinstance(result_json, str):
                                result_json = json.loads(result_json)
                            tenders = result_json.get("tenders", [])
                            # Annotate portal source
                            for t in tenders:
                                t["portal"] = portal_key
                                t["source_url"] = portal["url"]
                            return tenders

            return []  # COMPLETE event never arrived

        except (httpx.HTTPError, httpx.TimeoutException) as e:
            logger.warning(
                f"Portal {portal_key} attempt {attempt + 1} failed: {e}"
            )
            if attempt < MAX_RETRIES:
                await asyncio.sleep(2 ** attempt)  # exponential backoff
            else:
                raise RuntimeError(
                    f"Portal {portal_key} failed after {MAX_RETRIES + 1} attempts: {e}"
                )

    return []


async def scan_all_portals(
    portals: list[str],
    keywords: str,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    location: Optional[str] = None,
) -> dict[str, list[dict] | Exception]:
    """
    Runs all requested portal scans concurrently.
    Returns a dict: portal_key → [tenders] | Exception
    """
    tasks = {
        portal_key: scan_portal(portal_key, keywords, min_value, max_value, location)
        for portal_key in portals
    }
    results = await asyncio.gather(*tasks.values(), return_exceptions=True)
    return dict(zip(tasks.keys(), results))
