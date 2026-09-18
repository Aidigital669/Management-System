"""
Direct test script to send a WhatsApp Renewal Reminder to a specific phone number.
"""

import os
import sys
from pathlib import Path

# Add directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

# Ensure Windows terminal can print emojis cleanly
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from config import AGENCY_NAME, AGENCY_PHONE
from pricing_matcher import match_client_plan
from payment_service import build_payment_details
from whatsapp_sender import build_renewal_reminder_message, send_whatsapp_text_message

TARGET_PHONE = "6375787368"

# Sample client test profile (Combine Plan)
CLIENT_NAME = "Prem Sharma"
BUSINESS_NAME = "Sharma Global Enterprises"
SERVICES = "Meta + Google Ads"
PACKAGE_NAME = "Combine Standard"
PACKAGE_AMOUNT = 19499.0
EXPIRY_DATE = "23 Sep 2026"
DAYS_REMAINING = 5
DURATION_LABEL = "3 Months"

print(f"\n=======================================================")
print(f" TESTING WHATSAPP RENEWAL REMINDER TO: {TARGET_PHONE}")
print(f"=======================================================\n")

# 1. Match with Google Sheet Plan Catalog
plan_info = match_client_plan(
    services=SERVICES,
    package_name=PACKAGE_NAME,
    package_amount=PACKAGE_AMOUNT
)

print(f"Matched Plan ID: {plan_info.get('plan_id')}")
print(f"Plan Tier: {plan_info.get('plan_name')}")
print(f"Deliverables: {plan_info.get('deliverables_summary')}")

# 2. Build Payment Details
payment_info = build_payment_details(
    client_id="AID-TEST",
    client_name=CLIENT_NAME,
    amount=plan_info["renewal_amount"],
    plan_info=plan_info,
    client_phone=TARGET_PHONE
)

print(f"Razorpay Link: {payment_info.get('razorpay_link')}\n")

# 3. Build Full Message
message_text = build_renewal_reminder_message(
    client_name=CLIENT_NAME,
    business_name=BUSINESS_NAME,
    package_name=PACKAGE_NAME,
    duration_label=DURATION_LABEL,
    expiry_date_str=EXPIRY_DATE,
    days_remaining=DAYS_REMAINING,
    amount=plan_info["renewal_amount"],
    plan_info=plan_info,
    payment_info=payment_info
)

print("--- MESSAGE CONTENT ---")
print(message_text)
print("------------------------\n")

# 4. Dispatch live message via Meta WhatsApp Cloud API
print(f"Sending live message to {TARGET_PHONE} via Meta WhatsApp Cloud API...")
result = send_whatsapp_text_message(
    to_phone=TARGET_PHONE,
    message_text=message_text,
    dry_run=False
)

print("\n--- DISPATCH RESULT ---")
print(result)
print("------------------------\n")
