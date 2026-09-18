"""
Configuration loader for AI Digital WhatsApp Automation.
Reads environment variables from the project .env file.
"""

import os
from pathlib import Path

# Look for .env in the current directory or parent directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BASE_DIR / ".env"

if ENV_FILE.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(ENV_FILE)
    except ImportError:
        # Simple fallback parser if python-dotenv is not installed
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if k not in os.environ:
                        os.environ[k] = v

# Database Configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgres://f23a7ad3bbafa1e8c67732a303e84e5b72964fbacba050e1fe285acf5b293a3b:sk_sUh47CdpY-0ZnNQjWzBuY@db.prisma.io:5432/postgres?sslmode=verify-full"
)

# Meta WhatsApp Cloud API Configuration
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN") or os.getenv("WHATSAPP_ALT_ACCESS_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "1413862698466620")
WHATSAPP_WABA_ID = os.getenv("WHATSAPP_WABA_ID", "2224387878203364")
WHATSAPP_APP_ID = os.getenv("WHATSAPP_APP_ID", "1729671878338672")

# Agency Details
AGENCY_NAME = "AI Digital"
AGENCY_PHONE = "+91-9096090701"
AGENCY_EMAIL = "aidigitalbiz01@gmail.com"
AGENCY_UPI_ID = os.getenv("AGENCY_UPI_ID", "aidigitalbiz01@okaxis")
AGENCY_PAYEE_NAME = "AI Digital"
WEBSITE_URL = "https://www.aidigital.biz"
PRICING_URL = "https://www.aidigital.biz/pricing"

# Razorpay Configuration
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_PAYMENT_URL = os.getenv("RAZORPAY_PAYMENT_URL", "https://pages.razorpay.com/aidigital-renewal")

# Automation Cadence
EXPIRY_WINDOW_DAYS = int(os.getenv("EXPIRY_WINDOW_DAYS", "7"))
REMINDER_DAYS_MILESTONES = [7, 3, 1, 0] # Days before expiry to trigger notifications
