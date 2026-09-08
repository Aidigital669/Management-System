import fs from 'fs';
import path from 'path';

// Read .env file manually so it works stand-alone
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=["']?(.*?)["']?$`, 'm'));
  return match ? match[1].trim() : process.env[key] || '';
};

const token = getEnv('META_ACCESS_TOKEN');
const adAccountId = getEnv('META_AD_ACCOUNT_ID');
const appSecret = getEnv('META_APP_SECRET');
const GRAPH_VERSION = 'v20.0';

console.log('\n======================================================');
console.log('       FACEBOOK (META) MARKETING API TEST SUITE        ');
console.log('======================================================\n');

async function runTests() {
  let passedCount = 0;
  let totalTests = 4;

  // TEST 1: Config Check
  console.log('▶ [TEST 1/4] Checking Environment Configuration...');
  if (!token || !adAccountId) {
    console.error('❌ FAIL: META_ACCESS_TOKEN or META_AD_ACCOUNT_ID is missing in .env');
    console.log(`   Token: ${token ? 'Present' : 'MISSING'}`);
    console.log(`   Ad Account ID: ${adAccountId || 'MISSING'}`);
    return;
  }
  console.log(`✔ PASS: Token found (${token.slice(0, 10)}...${token.slice(-4)})`);
  console.log(`✔ PASS: Ad Account ID: ${adAccountId}`);
  passedCount++;

  const formattedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

  // TEST 2: Ad Account Verification
  console.log('\n▶ [TEST 2/4] Verifying Ad Account Access with Meta...');
  try {
    const accUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${formattedId}?fields=id,name,account_status,currency,amount_spent,timezone_name&access_token=${token}`;
    const accRes = await fetch(accUrl);
    const accData = await accRes.json();

    if (accData.error) {
      console.error(`❌ FAIL: Meta Ad Account query returned error:`);
      console.error(`   Code: ${accData.error.code} (${accData.error.type})`);
      console.error(`   Message: ${accData.error.message}`);
      if (accData.error.error_user_title) console.error(`   User Title: ${accData.error.error_user_title}`);
      if (accData.error.error_user_msg) console.error(`   User Msg: ${accData.error.error_user_msg}`);
    } else {
      console.log(`✔ PASS: Successfully connected to Ad Account: "${accData.name || accData.id}"`);
      console.log(`   Account ID: ${accData.id}`);
      console.log(`   Status: ${accData.account_status === 1 ? 'ACTIVE (1)' : `Status Code ${accData.account_status}`}`);
      console.log(`   Currency: ${accData.currency || 'N/A'}`);
      console.log(`   Total Historical Spend: ${accData.currency || ''} ${accData.amount_spent ? (accData.amount_spent / 100).toFixed(2) : '0.00'}`);
      passedCount++;
    }
  } catch (err) {
    console.error(`❌ FAIL: Network error querying Ad Account: ${err.message}`);
  }

  // TEST 3: Fetching Live Campaigns
  console.log('\n▶ [TEST 3/4] Fetching Live Campaigns from Meta...');
  let campaigns = [];
  try {
    const campUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${formattedId}/campaigns?fields=id,name,status,objective,effective_status,start_time,stop_time&access_token=${token}`;
    const campRes = await fetch(campUrl);
    const campData = await campRes.json();

    if (campData.error) {
      console.error(`❌ FAIL: Campaigns query returned error: ${campData.error.message}`);
    } else {
      campaigns = campData.data || [];
      console.log(`✔ PASS: Successfully retrieved ${campaigns.length} campaigns from Facebook.`);
      if (campaigns.length > 0) {
        campaigns.forEach((c, idx) => {
          console.log(`   [${idx + 1}] ID: ${c.id} | Name: "${c.name}" | Status: ${c.status} (${c.effective_status}) | Objective: ${c.objective}`);
        });
      } else {
        console.log('   ℹ Info: No active/paused campaigns found inside this ad account.');
      }
      passedCount++;
    }
  } catch (err) {
    console.error(`❌ FAIL: Network error querying campaigns: ${err.message}`);
  }

  // TEST 4: Fetching Insights for First Campaign (if any)
  console.log('\n▶ [TEST 4/4] Testing Campaign Insights / Analytics...');
  if (campaigns.length > 0) {
    const targetCamp = campaigns[0];
    try {
      const insightUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${targetCamp.id}/insights?fields=spend,impressions,clicks,reach,cpc,cpm,ctr&date_preset=maximum&access_token=${token}`;
      const insightRes = await fetch(insightUrl);
      const insightData = await insightRes.json();

      if (insightData.error) {
        console.error(`❌ FAIL: Insights query for campaign ${targetCamp.id} returned error: ${insightData.error.message}`);
      } else {
        const metrics = insightData.data?.[0] || { spend: '0', impressions: '0', clicks: '0', reach: '0' };
        console.log(`✔ PASS: Successfully retrieved insights for campaign "${targetCamp.name}":`);
        console.log(`   • Spend: ₹${metrics.spend || 0}`);
        console.log(`   • Reach: ${metrics.reach || 0}`);
        console.log(`   • Impressions: ${metrics.impressions || 0}`);
        console.log(`   • Clicks: ${metrics.clicks || 0}`);
        if (metrics.ctr) console.log(`   • CTR: ${parseFloat(metrics.ctr).toFixed(2)}%`);
        passedCount++;
      }
    } catch (err) {
      console.error(`❌ FAIL: Network error querying insights: ${err.message}`);
    }
  } else {
    console.log('✔ PASS: Skipped (no campaigns in ad account to query metrics for).');
    passedCount++;
  }

  console.log('\n======================================================');
  console.log(`RESULT: ${passedCount}/${totalTests} Tests Passed`);
  console.log('======================================================\n');
}

runTests();
