"""
WhatsApp Message Dispatcher for AI Digital.
Interacts with the official Meta WhatsApp Cloud API.
"""

import json
import re
import urllib.request
import urllib.error
from config import (
    WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID,
    AGENCY_NAME,
    AGENCY_PHONE
)


def sanitize_phone_number(raw_phone: str) -> str:
    """
    Cleans raw input and returns standard E.164 without leading plus for Meta API.
    Converts 10-digit Indian numbers into '91XXXXXXXXXX'.
    """
    if not raw_phone:
        return ""
    digits = re.sub(r"\D", "", str(raw_phone))
    if len(digits) == 10:
        return f"91{digits}"
    if len(digits) == 11 and digits.startswith("0"):
        return f"91{digits[1:]}"
    if len(digits) == 12 and digits.startswith("91"):
        return digits
    return digits


def build_renewal_reminder_message(
    client_name: str,
    business_name: str,
    package_name: str,
    duration_label: str,
    expiry_date_str: str,
    days_remaining: int,
    amount: float,
    plan_info: dict,
    payment_info: dict
) -> str:
    """
    Constructs a high-converting, professional WhatsApp renewal reminder.
    """
    salutation_name = (client_name or business_name or "Client").strip()
    biz_label = f" ({business_name})" if business_name and business_name.strip() != salutation_name else ""
    
    if days_remaining == 0:
        urgency_line = "⚠️ *Your marketing plan expires TODAY!*"
    elif days_remaining == 1:
        urgency_line = "⏳ *Your marketing plan expires TOMORROW!*"
    else:
        urgency_line = f"⏳ *Your marketing plan is ending in {days_remaining} days.*"

    msg = f"""👋 *Hello {salutation_name}{biz_label}*,

Greetings from *{AGENCY_NAME}*! 🚀

{urgency_line}
To prevent any interruption in your active ad campaigns, creative graphic designs, AI video production, and weekly performance reporting, please complete your package renewal.

━━━━━━━━━━━━━━━━━━━━━
📋 *CURRENT PLAN SUMMARY*
• *Package:* {package_name}
• *Plan ID:* {plan_info.get('plan_id', 'N/A')}
• *Duration:* {duration_label}
• *Valid Until:* {expiry_date_str}
• *Renewal Amount:* ₹{amount:,.0f}
• *Deliverables:* {plan_info.get('deliverables_summary', plan_info.get('plan_features', 'Full Campaign Management'))}
━━━━━━━━━━━━━━━━━━━━━

💳 *Direct Renewal Checkout Link:*
👉 {payment_info.get('checkout_link', 'https://www.aidigital.biz/checkout')}

To renew your plan or for any assistance, please reply directly to this message or call our team at {AGENCY_PHONE}.

Best regards,
*The {AGENCY_NAME} Team*
www.aidigital.biz
"""
    return msg.strip()


def send_whatsapp_text_message(to_phone: str, message_text: str, dry_run: bool = False) -> dict:
    """
    Dispatches a text message using Meta WhatsApp Cloud API.
    """
    clean_phone = sanitize_phone_number(to_phone)
    if not clean_phone or len(clean_phone) < 10:
        return {"success": False, "error": f"Invalid phone number: '{to_phone}'"}

    if dry_run:
        print(f"\n[DRY RUN - WhatsApp Message to {clean_phone}]:")
        print("--------------------------------------------------")
        print(message_text)
        print("--------------------------------------------------\n")
        return {"success": True, "dry_run": True, "recipient": clean_phone}

    if not WHATSAPP_ACCESS_TOKEN:
        return {
            "success": False,
            "error": "WHATSAPP_ACCESS_TOKEN is missing in .env. Please configure your Meta WhatsApp Cloud API credentials."
        }

    url = f"https://graph.facebook.com/v21.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": clean_phone,
        "type": "text",
        "text": {
            "preview_url": True,
            "body": message_text
        }
    }

    req_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=req_data,
        headers={
            "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            res_body = response.read().decode("utf-8")
            res_json = json.loads(res_body)
            message_id = res_json.get("messages", [{}])[0].get("id", "")
            return {
                "success": True,
                "recipient": clean_phone,
                "message_id": message_id,
                "response": res_json
            }
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(err_body)
            err_msg = err_json.get("error", {}).get("message", str(e))
        except Exception:
            err_msg = err_body or str(e)
        return {"success": False, "error": f"HTTP {e.code}: {err_msg}", "recipient": clean_phone}
    except Exception as e:
        return {"success": False, "error": str(e), "recipient": clean_phone}
