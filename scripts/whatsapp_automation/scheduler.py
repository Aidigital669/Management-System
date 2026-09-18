"""
Automated Scheduler & CLI Entry Point for AI Digital WhatsApp Reminders.
Can be executed on-demand, run in a daily schedule loop, or triggered via Windows Task Scheduler.
"""

import argparse
import sys
import time
from datetime import datetime

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
from reminder_engine import process_renewal_reminders, identify_expiring_clients


def run_daily_job(dry_run: bool = False, force: bool = False):
    print(f"\n[CRON TRIGGER] Executing scheduled renewal reminder job at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    try:
        process_renewal_reminders(dry_run=dry_run, force=force)
    except Exception as e:
        print(f"[CRON ERROR] Job execution failed: {e}")


def main():
    parser = argparse.ArgumentParser(description="AI Digital WhatsApp Renewal Reminder Automation")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run without sending real WhatsApp messages (prints message previews to console)"
    )
    parser.add_argument(
        "--send-now",
        action="store_true",
        help="Execute the reminder job immediately once and exit"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Bypass duplicate send check for today and force dispatch"
    )
    parser.add_argument(
        "--client-id",
        type=str,
        help="Target a specific client ID only (e.g. --client-id AID-0038)"
    )
    parser.add_argument(
        "--list-expiring",
        action="store_true",
        help="List all clients currently expiring in <= 7 days without sending messages"
    )
    parser.add_argument(
        "--schedule",
        type=str,
        default=None,
        help="Run continuously and execute every day at specified 24h time (e.g. --schedule 10:00)"
    )

    args = parser.parse_args()

    # Mode 1: List expiring clients
    if args.list_expiring:
        print("\n--- CLIENTS EXPIRING IN <= 7 DAYS ---")
        expiring = identify_expiring_clients()
        if not expiring:
            print("No clients found expiring in the 7-day window.")
        for item in expiring:
            c = item["client"]
            print(f"[{item['days_remaining']} Days Left] {c.get('clientId')} - {c.get('businessName')}")
            print(f"   Contact: {c.get('contact')} | Expiry: {item['expiry_date']} | Duration: {item['duration_label']}")
            print(f"   Package: {c.get('packageName')} (₹{c.get('packageAmount')})")
            print(f"   Website Plan: {item['plan_info']['pricing_url']}")
            print(f"   UPI Link: {item['payment_info']['upi_link']}\n")
        return

    # Mode 2: Immediate execution (Send Now or Dry Run)
    if args.send_now or args.dry_run or args.client_id:
        process_renewal_reminders(
            dry_run=args.dry_run,
            force=args.force,
            specific_client_id=args.client_id
        )
        return

    # Mode 3: Continuous scheduling
    if args.schedule:
        target_time = args.schedule
        print(f"Starting AI Digital WhatsApp Automation Scheduler...")
        print(f"Job scheduled to run everyday at {target_time} (Current time: {datetime.now().strftime('%H:%M:%S')})")
        print("Press Ctrl+C to stop.\n")

        try:
            import schedule
            schedule.every().day.at(target_time).do(run_daily_job, dry_run=False)
            while True:
                schedule.run_pending()
                time.sleep(30)
        except ImportError:
            print("Notice: 'schedule' package not installed. Running standard Python sleep loop...")
            while True:
                now = datetime.now().strftime("%H:%M")
                if now == target_time:
                    run_daily_job(dry_run=False)
                    time.sleep(65) # wait past current minute
                time.sleep(20)
        except KeyboardInterrupt:
            print("\nScheduler stopped by user.")
            sys.exit(0)

    # Default action if no args provided: show help and run dry-run preview
    parser.print_help()
    print("\n--- RUNNING DEFAULT PREVIEW (DRY RUN) ---")
    process_renewal_reminders(dry_run=True)


if __name__ == "__main__":
    main()
