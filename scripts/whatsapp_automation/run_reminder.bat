@echo off
REM AI Digital WhatsApp Automated Renewal Reminder Runner
cd /d "%~dp0"
echo Running AI Digital WhatsApp Renewal Reminders...
python scheduler.py --send-now
pause
