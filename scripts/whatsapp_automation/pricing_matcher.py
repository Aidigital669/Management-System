"""
Plan and Pricing Matcher Engine for AI Digital.
Fed directly from the Master Google Sheet:
https://docs.google.com/spreadsheets/d/1J40J61imkWqKgu09qXW_wIEVikzAEjIf1AkW5UonRTM/edit

Maps client's registered services, package name, and package amount
to the exact plan, deliverables, and anchor link on https://www.aidigital.biz/pricing.
"""

import csv
import re
import urllib.request
from pathlib import Path

GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1J40J61imkWqKgu09qXW_wIEVikzAEjIf1AkW5UonRTM/export?format=csv"
LOCAL_CSV_PATH = Path(__file__).resolve().parent / "pricing_plans.csv"
WEBSITE_PRICING_BASE_URL = "https://www.aidigital.biz/pricing"

# Anchor mapping per Service category
CATEGORY_ANCHORS = {
    "meta ads": "#facebook",
    "google ads": "#google",
    "meta + google ads": "#combine",
    "website development": "#websites",
    "creative design": "#creative",
    "ai video": "#aivideo",
    "real estate": "#realestate"
}


def clean_price_to_float(raw_price: str) -> float:
    """Converts '₹3,499' or '4999' to 3499.0."""
    if not raw_price:
        return 0.0
    digits = re.sub(r"[^\d.]", "", str(raw_price))
    try:
        return float(digits)
    except ValueError:
        return 0.0


def load_master_plans(force_live_sync: bool = False) -> list:
    """
    Loads all plans from the Google Sheet CSV (or falls back to local CSV).
    """
    rows = []

    # 1. Optionally sync live from Google Sheet if accessible
    if force_live_sync:
        try:
            req = urllib.request.Request(
                GOOGLE_SHEET_CSV_URL,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            with urllib.request.urlopen(req, timeout=5) as res:
                content = res.read().decode("utf-8")
                # Update local cache
                with open(LOCAL_CSV_PATH, "w", encoding="utf-8") as f:
                    f.write(content)
        except Exception as e:
            # Fall back to local file if offline or network error
            pass

    # 2. Read from local CSV file
    if LOCAL_CSV_PATH.exists():
        with open(LOCAL_CSV_PATH, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                plan_price = clean_price_to_float(r.get("Price_INR", "0"))
                service = (r.get("Service") or "").strip()
                service_key = service.lower()

                anchor = CATEGORY_ANCHORS.get(service_key, "#facebook")
                if "real estate" in service_key:
                    anchor = "#realestate"
                elif "meta" in service_key and "google" in service_key:
                    anchor = "#combine"
                elif "google" in service_key:
                    anchor = "#google"
                elif "video" in service_key:
                    anchor = "#aivideo"
                elif "website" in service_key:
                    anchor = "#websites"
                elif "creative" in service_key:
                    anchor = "#creative"
                elif "meta" in service_key:
                    anchor = "#facebook"

                rows.append({
                    "plan_id": r.get("Plan_ID", ""),
                    "service": service,
                    "service_key": service_key,
                    "plan_name": (r.get("Plan_Name") or "").strip(),
                    "price_inr": plan_price,
                    "raw_price": r.get("Price_INR", ""),
                    "billing_period": r.get("Billing_Period", "Per Month"),
                    "creatives": r.get("Creatives", "N/A"),
                    "ai_videos": r.get("AI_Videos", "N/A"),
                    "reels_shorts": r.get("Reels_Shorts", "N/A"),
                    "features": r.get("Features", ""),
                    "status": r.get("Status", "Active"),
                    "anchor": anchor,
                    "pricing_url": f"{WEBSITE_PRICING_BASE_URL}{anchor}"
                })

    return rows


# Cache in memory
_CACHED_PLANS = None

def get_all_plans() -> list:
    global _CACHED_PLANS
    if _CACHED_PLANS is None or len(_CACHED_PLANS) == 0:
        _CACHED_PLANS = load_master_plans()
    return _CACHED_PLANS


def match_client_plan(services: str = "", package_name: str = "", package_amount: float = 0.0) -> dict:
    """
    Matches client's contract against the Google Sheet Master Catalog.
    Returns exact plan name, deliverables summary, pricing link, and amount.
    """
    plans = get_all_plans()
    if not plans:
        # Fallback if no plans loaded
        return {
            "plan_id": "DEFAULT",
            "category_name": "Digital Marketing",
            "plan_name": package_name or "Custom Plan",
            "plan_features": "Meta Ads / Google Ads, Creatives, AI Videos, Weekly Reports",
            "plan_duration": "1 month",
            "pricing_url": WEBSITE_PRICING_BASE_URL,
            "renewal_amount": package_amount or 3499.0,
            "deliverables_summary": "Full Campaign Management & Optimization"
        }

    s_lower = (services or "").lower()
    p_lower = (package_name or "").lower()
    text = f"{s_lower} {p_lower}"

    # 1. Filter candidates by category
    target_service_key = None
    if "real estate" in text or "property" in text:
        target_service_key = "real estate"
    elif ("meta" in text or "facebook" in text) and "google" in text:
        target_service_key = "meta + google ads"
    elif "google" in text or "adwords" in text:
        target_service_key = "google ads"
    elif "video" in text or "ai video" in text:
        target_service_key = "ai video"
    elif "website" in text or "web" in text:
        target_service_key = "website development"
    elif "creative" in text or "design" in text:
        target_service_key = "creative design"
    elif "facebook" in text or "meta" in text or "insta" in text:
        target_service_key = "meta ads"

    candidates = [p for p in plans if p["service_key"] == target_service_key] if target_service_key else plans
    if not candidates:
        candidates = plans

    # 2. Match exact price or closest price in candidates
    best_match = None
    if package_amount > 0:
        for p in candidates:
            if abs(p["price_inr"] - package_amount) < 1:
                best_match = p
                break

    # 3. If price didn't match exactly, check plan name in candidate
    if not best_match:
        for p in candidates:
            if p["plan_name"].lower() in p_lower or p["plan_name"].lower() in s_lower:
                best_match = p
                break

    # 4. Fallback: closest price in candidate category
    if not best_match:
        best_match = min(candidates, key=lambda p: abs(p["price_inr"] - package_amount))

    # Format deliverables summary
    parts = []
    if best_match["creatives"] and best_match["creatives"] != "N/A":
        parts.append(f"{best_match['creatives']} Creatives")
    if best_match["ai_videos"] and best_match["ai_videos"] != "N/A":
        parts.append(f"{best_match['ai_videos']} AI Videos")
    if best_match["reels_shorts"] and best_match["reels_shorts"] != "N/A":
        parts.append(f"{best_match['reels_shorts']} Reels/Shorts")
    if best_match["features"]:
        parts.append(best_match["features"].replace(";", ","))

    deliverables_str = " • ".join(parts) if parts else best_match["features"]

    renewal_amount = package_amount if package_amount > 0 else best_match["price_inr"]

    return {
        "plan_id": best_match["plan_id"],
        "category_name": best_match["service"],
        "plan_name": f"{best_match['service']} ({best_match['plan_name']})",
        "plan_tier": best_match["plan_name"],
        "plan_features": best_match["features"],
        "deliverables_summary": deliverables_str,
        "plan_duration": best_match["billing_period"],
        "pricing_url": best_match["pricing_url"],
        "renewal_amount": renewal_amount,
        "official_amount": best_match["price_inr"]
    }
