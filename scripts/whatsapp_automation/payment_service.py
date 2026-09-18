"""
Payment Link Generator for AI Digital Client Renewals.
Generates clean, official Razorpay payment links for client renewals.
"""

import base64
import json
import urllib.request
import urllib.error
from config import (
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET,
    RAZORPAY_PAYMENT_URL
)


def create_razorpay_payment_link(
    client_id: str,
    client_name: str,
    client_phone: str,
    amount: float,
    plan_name: str = "Marketing Plan Renewal"
) -> str:
    """
    Creates a dedicated Razorpay payment link using Razorpay API
    (returns https://rzp.io/i/XXXXX) or falls back to configured Razorpay Payment URL.
    """
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        # Fallback to configured Razorpay payment page URL
        return RAZORPAY_PAYMENT_URL

    url = "https://api.razorpay.com/v1/payment_links"
    amount_in_paise = int(round(amount * 100))

    payload = {
        "amount": amount_in_paise,
        "currency": "INR",
        "accept_partial": False,
        "description": f"AI Digital Plan Renewal - {plan_name} ({client_id})",
        "customer": {
            "name": client_name or "Valued Client",
            "contact": client_phone or ""
        },
        "notify": {
            "sms": False,
            "email": False,
            "whatsapp": False
        },
        "reminder_enable": False,
        "notes": {
            "clientId": client_id,
            "planName": plan_name
        }
    }

    credentials = f"{RAZORPAY_KEY_ID}:{RAZORPAY_KEY_SECRET}"
    auth_header = "Basic " + base64.b64encode(credentials.encode()).decode()

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": auth_header,
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode("utf-8"))
            short_url = data.get("short_url")
            if short_url:
                return short_url
    except Exception as e:
        print(f"[Razorpay Notice] Could not create dynamic link: {e}. Using standard Razorpay URL.")

    return RAZORPAY_PAYMENT_URL


def build_payment_details(
    client_id: str,
    client_name: str,
    amount: float,
    plan_info: dict,
    client_phone: str = ""
) -> dict:
    """
    Assembles clean payment details containing exclusively the Razorpay payment link.
    """
    razorpay_link = create_razorpay_payment_link(
        client_id=client_id,
        client_name=client_name,
        client_phone=client_phone,
        amount=amount,
        plan_name=plan_info.get("plan_name", "Plan Renewal")
    )

    # Direct checkout link that automatically loads the plan & price on aidigital.biz/checkout
    import urllib.parse
    target_plan_name = plan_info.get("plan_name", "Marketing Plan")
    query_str = urllib.parse.urlencode({
        "plan": target_plan_name,
        "price": int(round(amount))
    })
    checkout_link = f"https://www.aidigital.biz/checkout?{query_str}"

    return {
        "amount": amount,
        "formatted_amount": f"₹{amount:,.0f}",
        "checkout_link": checkout_link,
        "razorpay_link": razorpay_link,
        "plan_name": target_plan_name,
        "plan_duration": plan_info.get("plan_duration", "1 month")
    }
