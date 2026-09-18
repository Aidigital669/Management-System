"""
Core Reminder Engine for AI Digital.
Connects to the database, determines which active clients are expiring
within 7 days, matches their plan, and dispatches WhatsApp reminders.
"""

import json
import os
import re
from datetime import datetime, timedelta
from pathlib import Path
import urllib.parse

from config import (
    DATABASE_URL,
    EXPIRY_WINDOW_DAYS,
    REMINDER_DAYS_MILESTONES
)
from pricing_matcher import match_client_plan
from payment_service import build_payment_details
from whatsapp_sender import (
    build_renewal_reminder_message,
    send_whatsapp_text_message
)

LOG_FILE = Path(__file__).resolve().parent / "reminder_log.json"


def parse_date(date_str: str):
    """
    Parses various date string formats commonly found in the database.
    """
    if not date_str:
        return None
    cleaned = str(date_str).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%d.%m.%Y"):
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            pass
    try:
        # ISO format fallback
        return datetime.fromisoformat(cleaned.replace("Z", "+00:00")).date()
    except Exception:
        return None


def get_plan_duration_days(client: dict) -> tuple:
    """
    Computes duration in days and label for a client record.
    """
    pkg_name = (client.get("packageName") or "").lower()
    services = (client.get("services") or "").lower()
    notes = str(client.get("notes") or "")

    # 1. Check custom notes
    if notes.strip().startswith("{"):
        try:
            parsed = json.loads(notes)
            if "planDurationDays" in parsed and int(parsed["planDurationDays"]) > 0:
                days = int(parsed["planDurationDays"])
                months = round(days / 30)
                label = f"{months}-Month" if months > 1 else "1-Month"
                return days, label
        except Exception:
            pass

    # 2. Check package name or services
    text = f"{pkg_name} {services}"
    if "12-month" in text or "12 month" in text or "yearly" in text or "annual" in text:
        return 365, "12-Month (Annual)"
    if "6-month" in text or "6 month" in text or "half yearly" in text:
        return 180, "6-Month"
    if "3-month" in text or "3 month" in text or "quarterly" in text:
        return 90, "3-Month"
    if "2-month" in text or "2 month" in text:
        return 60, "2-Month"

    return 30, "1-Month"


def load_reminder_log() -> dict:
    if LOG_FILE.exists():
        try:
            with open(LOG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_reminder_log(log_data: dict):
    try:
        with open(LOG_FILE, "w", encoding="utf-8") as f:
            json.dump(log_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Warning: Failed to save reminder log: {e}")


def fetch_clients_from_db() -> list:
    """
    Fetches active clients directly from PostgreSQL using psycopg2, pg8000,
    or falls back to local Next.js API.
    """
    # Attempt 1: psycopg2 / psycopg2-binary
    try:
        import psycopg2
        import psycopg2.extras
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT id, "clientId", "businessName", "clientName", "joiningDate",
                   "services", "packageName", "packageAmount", "contact", "email",
                   "active", "notes"
            FROM "Client"
            WHERE active = true;
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [dict(r) for r in rows]
    except ImportError:
        pass
    except Exception as e:
        print(f"[DB Notice] Direct psycopg2 connection failed ({e}). Checking local API fallback...")

    # Attempt 2: Local Management-System API (if running on localhost:3000 or 3001)
    import urllib.request
    for port in (3000, 3001):
        try:
            url = f"http://localhost:{port}/api/clients"
            req = urllib.request.Request(url, headers={"User-Agent": "WhatsAppAutomation/1.0"})
            with urllib.request.urlopen(req, timeout=4) as res:
                data = json.loads(res.read().decode("utf-8"))
                clients = data.get("clients", [])
                if clients:
                    return [c for c in clients if c.get("active") is not False]
        except Exception:
            continue

    raise RuntimeError(
        "Could not fetch clients from database. Please ensure either:\n"
        "1. psycopg2 is installed ('pip install psycopg2-binary')\n"
        "2. Or the Next.js dev server is running on port 3000/3001"
    )


def identify_expiring_clients(reference_date=None) -> list:
    """
    Identifies all active clients whose contract is expiring within EXPIRY_WINDOW_DAYS (default 7 days).
    """
    today = reference_date or datetime.now().date()
    clients = fetch_clients_from_db()
    expiring = []

    for c in clients:
        if c.get("active") is False:
            continue

        start_date = parse_date(c.get("joiningDate"))
        if not start_date:
            continue

        duration_days, duration_label = get_plan_duration_days(c)
        expiry_date = start_date + timedelta(days=duration_days)
        days_remaining = (expiry_date - today).days

        # Only clients expiring in 0 to 7 days
        if 0 <= days_remaining <= EXPIRY_WINDOW_DAYS:
            plan_info = match_client_plan(
                services=c.get("services", ""),
                package_name=c.get("packageName", ""),
                package_amount=float(c.get("packageAmount") or 0)
            )
            payment_info = build_payment_details(
                client_id=c.get("clientId", "AID"),
                client_name=c.get("clientName") or c.get("businessName", "Client"),
                amount=plan_info["renewal_amount"],
                plan_info=plan_info,
                client_phone=c.get("contact", "")
            )

            expiring.append({
                "client": c,
                "start_date": start_date,
                "expiry_date": expiry_date,
                "days_remaining": days_remaining,
                "duration_days": duration_days,
                "duration_label": duration_label,
                "plan_info": plan_info,
                "payment_info": payment_info
            })

    # Sort with highest urgency first (0 days left first)
    expiring.sort(key=lambda x: x["days_remaining"])
    return expiring


def process_renewal_reminders(dry_run: bool = False, force: bool = False, specific_client_id: str = None) -> dict:
    """
    Main execution loop: finds expiring clients, avoids duplicate sends on the same day,
    and dispatches personalized WhatsApp reminders.
    """
    today_str = datetime.now().strftime("%Y-%m-%d")
    expiring_list = identify_expiring_clients()
    logs = load_reminder_log()

    sent_count = 0
    skipped_count = 0
    errors_count = 0
    results = []

    print(f"\n=======================================================")
    print(f" AI DIGITAL WHATSAPP AUTOMATION - PLAN RENEWAL DISPATCH")
    print(f" Reference Date: {today_str} | Mode: {'DRY-RUN' if dry_run else 'LIVE'}")
    print(f" Expiring Clients Found (<= {EXPIRY_WINDOW_DAYS} Days): {len(expiring_list)}")
    print(f"=======================================================\n")

    for item in expiring_list:
        c = item["client"]
        cid = c.get("clientId", "UNKNOWN")
        phone = c.get("contact", "")

        if specific_client_id and cid.upper() != specific_client_id.upper():
            continue

        days_left = item["days_remaining"]
        log_key = f"{cid}_{today_str}"

        # Duplicate check: don't send multiple reminders to the same client on the exact same date unless forced
        if not force and log_key in logs and logs[log_key].get("status") == "SUCCESS":
            print(f"[SKIP] Client {cid} ({c.get('businessName')}) already received a reminder today.")
            skipped_count += 1
            continue

        # Construct personalized message
        message = build_renewal_reminder_message(
            client_name=c.get("clientName", ""),
            business_name=c.get("businessName", ""),
            package_name=c.get("packageName", "Marketing Package"),
            duration_label=item["duration_label"],
            expiry_date_str=item["expiry_date"].strftime("%d %b %Y"),
            days_remaining=days_left,
            amount=item["plan_info"]["renewal_amount"],
            plan_info=item["plan_info"],
            payment_info=item["payment_info"]
        )

        print(f"[{'DISPATCHING' if not dry_run else 'PREVIEW'}] {cid} | {c.get('businessName')} | {phone} | {days_left} days left")
        
        # Dispatch WhatsApp Message
        dispatch_result = send_whatsapp_text_message(
            to_phone=phone,
            message_text=message,
            dry_run=dry_run
        )

        success = dispatch_result.get("success", False)
        
        # Record into execution log
        logs[log_key] = {
            "clientId": cid,
            "businessName": c.get("businessName"),
            "phone": phone,
            "daysRemaining": days_left,
            "expiryDate": item["expiry_date"].strftime("%Y-%m-%d"),
            "sentAt": datetime.now().isoformat(),
            "status": "SUCCESS" if success else "FAILED",
            "error": dispatch_result.get("error"),
            "dryRun": dry_run
        }

        if success:
            sent_count += 1
        else:
            errors_count += 1
            print(f"  --> Failed: {dispatch_result.get('error')}")

        results.append({
            "clientId": cid,
            "businessName": c.get("businessName"),
            "daysRemaining": days_left,
            "phone": phone,
            "success": success,
            "error": dispatch_result.get("error")
        })

    if not dry_run:
        save_reminder_log(logs)

    print(f"\n=======================================================")
    print(f" SUMMARY: Sent: {sent_count} | Skipped: {skipped_count} | Errors: {errors_count}")
    print(f"=======================================================\n")

    return {
        "sent_count": sent_count,
        "skipped_count": skipped_count,
        "errors_count": errors_count,
        "results": results
    }
