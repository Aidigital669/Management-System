require('dotenv').config();

const token1 = process.env.WHATSAPP_ACCESS_TOKEN;
const token2 = process.env.WHATSAPP_ALT_ACCESS_TOKEN;
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

async function checkToken(label, tok) {
  console.log(`\nTesting ${label} (${tok.substring(0, 30)}...):`);
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}`, {
    headers: { 'Authorization': `Bearer ${tok}` }
  });
  const data = await res.json();
  console.log(`Status: ${res.status}`);
  console.log('Result:', JSON.stringify(data, null, 2));
}

async function run() {
  await checkToken('Token 1 (WHATSAPP_ACCESS_TOKEN)', token1);
  if (token2) {
    await checkToken('Token 2 (WHATSAPP_ALT_ACCESS_TOKEN)', token2);
  }
}

run();
