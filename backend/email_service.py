"""Resend email service for tender alert digests."""

import logging
from config import RESEND_API_KEY, FROM_EMAIL, DEMO_MODE

logger = logging.getLogger(__name__)


def _format_value(value: int | None) -> str:
    if not value:
        return "N/A"
    if value >= 1e7:
        return f"₹{value/1e7:.1f}Cr"
    if value >= 1e5:
        return f"₹{value/1e5:.1f}L"
    return f"₹{value:,.0f}"


def send_tender_digest(
    to_email: str,
    tenders: list[dict],
    watchlist_name: str,
    user_name: str = "there",
):
    """
    Sends a tender digest email via Resend API.
    In demo mode logs instead of sending.
    """
    if DEMO_MODE or not RESEND_API_KEY:
        logger.info(
            f"[DEMO] Would send digest to {to_email}: "
            f"{len(tenders)} tenders from watchlist '{watchlist_name}'"
        )
        return {"id": "demo-email-id", "status": "simulated"}

    urgent = [t for t in tenders if _days_until(t.get("deadline")) is not None and _days_until(t.get("deadline")) < 3]
    medium = [t for t in tenders if _days_until(t.get("deadline")) is not None and 3 <= _days_until(t.get("deadline")) < 10]
    top3 = tenders[:3]

    top3_html = "".join([
        f"""
        <div style="background:#161d1b;border-radius:8px;padding:16px;margin-bottom:12px;border-left:3px solid #00e09e;">
          <div style="color:#e8f0ee;font-weight:600;font-size:14px;">{t.get('title','Untitled')}</div>
          <div style="color:#7a9490;font-size:12px;margin-top:4px;">{t.get('department','')}</div>
          <div style="color:#00e09e;font-family:monospace;font-size:13px;margin-top:8px;">
            {_format_value(t.get('value'))} • Deadline: {t.get('deadline','TBD')}
          </div>
        </div>
        """ for t in top3
    ])

    html = f"""
    <div style="background:#0b0f0e;color:#e8f0ee;padding:32px;font-family:'DM Sans',sans-serif;max-width:600px;">
      <h1 style="color:#00e09e;font-size:24px;font-family:serif;">TenderWatch Alert</h1>
      <p style="color:#7a9490;">Hi {user_name}, your watchlist <strong style="color:#e8f0ee;">{watchlist_name}</strong> found new tenders.</p>

      <div style="background:#111615;border-radius:8px;padding:16px;margin:20px 0;display:flex;gap:24px;">
        <div><div style="color:#00e09e;font-size:28px;font-weight:700;">{len(tenders)}</div><div style="color:#7a9490;font-size:12px;">Total Found</div></div>
        <div><div style="color:#ff4d6a;font-size:28px;font-weight:700;">{len(urgent)}</div><div style="color:#7a9490;font-size:12px;">Urgent (&lt;3 days)</div></div>
        <div><div style="color:#ffb547;font-size:28px;font-weight:700;">{len(medium)}</div><div style="color:#7a9490;font-size:12px;">Closing Soon</div></div>
      </div>

      <h2 style="font-size:16px;color:#e8f0ee;margin-top:24px;">Top Results</h2>
      {top3_html}

      <a href="http://localhost:5173/app" style="display:inline-block;background:#00e09e;color:#0b0f0e;padding:12px 24px;border-radius:6px;font-weight:700;text-decoration:none;margin-top:16px;">
        View All Tenders →
      </a>
    </div>
    """

    try:
        import resend
        resend.api_key = RESEND_API_KEY
        response = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": f"[TenderWatch] {len(tenders)} new tenders in '{watchlist_name}'",
            "html": html,
        })
        return response
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        raise


def _days_until(date_str: str | None) -> float | None:
    if not date_str:
        return None
    from datetime import datetime
    try:
        deadline = datetime.strptime(date_str, "%Y-%m-%d")
        return (deadline - datetime.utcnow()).total_seconds() / 86400
    except ValueError:
        return None
