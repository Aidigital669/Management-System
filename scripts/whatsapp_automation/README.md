# AI Digital WhatsApp Renewal Reminder Automation

Fully automated system to detect clients with packages expiring in **<= 7 days**, map their package to the official [AI Digital Pricing Page](https://www.aidigital.biz/pricing), generate instant renewal payment links, and dispatch personalized WhatsApp messages.

---

## 📁 Directory Structure

```text
scripts/whatsapp_automation/
├── config.py              # Environment & credentials loader (.env)
├── pricing_matcher.py     # Maps services/package to aidigital.biz/pricing anchors
├── payment_service.py     # UPI deep-link & QR code generator
├── whatsapp_sender.py     # Meta WhatsApp Cloud API dispatcher
├── reminder_engine.py     # Core logic (queries DB, filters <=7 days, prevents duplicates)
├── scheduler.py           # CLI runner and continuous daily schedule loop
├── run_reminder.bat       # Windows 1-click batch runner
├── reminder_log.json      # Logs dispatched messages to prevent duplicate sends
└── requirements.txt       # Python dependencies
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd scripts/whatsapp_automation
pip install -r requirements.txt
```

### 2. Preview Expiring Clients (Dry Run)
Check which clients are expiring in the next 7 days without sending any real messages:
```bash
python scheduler.py --list-expiring
```

### 3. Test Message Generation (Dry Run Preview)
Simulates the entire workflow and prints the exact formatted WhatsApp messages to the terminal:
```bash
python scheduler.py --dry-run
```

### 4. Send Reminders to Expiring Clients
Runs the live dispatch for all clients expiring in <= 7 days:
```bash
python scheduler.py --send-now
```

### 5. Test on a Single Client
```bash
python scheduler.py --client-id AID-0038 --dry-run
```

### 6. Run Continuous Daily Background Scheduler
Runs a persistent daemon that triggers automatically every day at 10:00 AM IST:
```bash
python scheduler.py --schedule 10:00
```

---

## ⏰ Windows Task Scheduler Setup (Zero Maintenance)

To run this completely automatically in the background every morning without touching any terminal:

1. Open **Windows Task Scheduler** (`taskschd.msc`).
2. Click **Create Basic Task...**
3. Name it: `AIDigital_WhatsApp_Renewal_Reminder`.
4. Trigger: **Daily** at `10:00 AM`.
5. Action: **Start a program**.
6. Program/script: Select `run_reminder.bat` (located at `d:\AiDigitals_Projects\Management-System\scripts\whatsapp_automation\run_reminder.bat`).
7. Save the task.

Windows will now automatically run the reminder check every morning.

---

## 🌐 Web Dashboard Integration

You can also preview and trigger WhatsApp reminders via HTTP from the Next.js app:

- **Check Expiring Clients**: `GET http://localhost:3000/api/automation/whatsapp-reminders`
- **Trigger Dry-Run**: `POST http://localhost:3000/api/automation/whatsapp-reminders` with `{"dryRun": true}`
- **Trigger Live Send**: `POST http://localhost:3000/api/automation/whatsapp-reminders` with `{"dryRun": false}`
