require('dotenv').config();

const cronSecret = process.env.CRON_SECRET || process.env.CRM_API_KEY;
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function runCron() {
  console.log(`[${new Date().toLocaleTimeString()}] Running WhatsApp AI Reminder Cron Check...`);
  try {
    const url = `${baseUrl}/api/cron/whatsapp-reminders?secret=${cronSecret || ''}`;
    const res = await fetch(url);
    const data = await res.json();
    console.log('Cron Execution Result:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error running cron:', err.message);
  }
}

runCron();
