import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = process.env.META_ACCESS_TOKEN?.trim();
  const adAccountId = process.env.META_AD_ACCOUNT_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  const GRAPH_VERSION = 'v20.0';

  const testReport = {
    timestamp: new Date().toISOString(),
    testsPassed: 0,
    totalTests: 4,
    steps: {
      step1_env_config: { status: 'PENDING', message: '' },
      step2_ad_account_access: { status: 'PENDING', data: null, message: '' },
      step3_campaigns_fetch: { status: 'PENDING', count: 0, campaigns: [], message: '' },
      step4_insights_fetch: { status: 'PENDING', metrics: null, message: '' }
    }
  };

  // STEP 1: Environment Check
  if (!token || !adAccountId) {
    testReport.steps.step1_env_config = {
      status: 'FAILED',
      message: 'META_ACCESS_TOKEN or META_AD_ACCOUNT_ID is missing in .env.'
    };
    return NextResponse.json(testReport, { status: 200 });
  }

  testReport.steps.step1_env_config = {
    status: 'PASSED',
    message: `Credentials found. Token: ${token.slice(0, 10)}...${token.slice(-4)}, Ad Account: ${adAccountId}`
  };
  testReport.testsPassed++;

  const formattedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

  // STEP 2: Ad Account Verification
  try {
    const accUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${formattedId}?fields=id,name,account_status,currency,amount_spent,timezone_name&access_token=${token}`;
    const accRes = await fetch(accUrl, { cache: 'no-store' });
    const accData = await accRes.json();

    if (accData.error) {
      testReport.steps.step2_ad_account_access = {
        status: 'FAILED',
        error: accData.error,
        message: accData.error.message || 'Error querying Ad Account from Meta.'
      };
      return NextResponse.json(testReport, { status: 200 });
    }

    testReport.steps.step2_ad_account_access = {
      status: 'PASSED',
      accountName: accData.name || accData.id,
      currency: accData.currency,
      status: accData.account_status === 1 ? 'ACTIVE' : `Status ${accData.account_status}`,
      historicalSpend: accData.amount_spent ? (accData.amount_spent / 100).toFixed(2) : '0.00',
      message: `Verified Ad Account "${accData.name || accData.id}" successfully.`
    };
    testReport.testsPassed++;
  } catch (err) {
    testReport.steps.step2_ad_account_access = {
      status: 'FAILED',
      message: `Network failure connecting to Meta: ${err.message}`
    };
    return NextResponse.json(testReport, { status: 200 });
  }

  // STEP 3: Campaigns Fetch
  let campaigns = [];
  try {
    const campUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${formattedId}/campaigns?fields=id,name,status,objective,effective_status,start_time,stop_time&access_token=${token}`;
    const campRes = await fetch(campUrl, { cache: 'no-store' });
    const campData = await campRes.json();

    if (campData.error) {
      testReport.steps.step3_campaigns_fetch = {
        status: 'FAILED',
        error: campData.error,
        message: campData.error.message || 'Error querying Campaigns from Meta.'
      };
      return NextResponse.json(testReport, { status: 200 });
    }

    campaigns = campData.data || [];
    testReport.steps.step3_campaigns_fetch = {
      status: 'PASSED',
      count: campaigns.length,
      campaigns: campaigns.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        effective_status: c.effective_status,
        objective: c.objective
      })),
      message: `Successfully fetched ${campaigns.length} campaigns from Meta.`
    };
    testReport.testsPassed++;
  } catch (err) {
    testReport.steps.step3_campaigns_fetch = {
      status: 'FAILED',
      message: `Network error: ${err.message}`
    };
    return NextResponse.json(testReport, { status: 200 });
  }

  // STEP 4: Insights Fetch
  if (campaigns.length > 0) {
    try {
      const targetCamp = campaigns[0];
      const insightUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${targetCamp.id}/insights?fields=spend,impressions,clicks,reach,cpc,cpm,ctr&date_preset=maximum&access_token=${token}`;
      const insightRes = await fetch(insightUrl, { cache: 'no-store' });
      const insightData = await insightRes.json();

      if (insightData.error) {
        testReport.steps.step4_insights_fetch = {
          status: 'FAILED',
          campaignId: targetCamp.id,
          error: insightData.error,
          message: insightData.error.message
        };
      } else {
        const metrics = insightData.data?.[0] || { spend: '0', impressions: '0', clicks: '0', reach: '0' };
        testReport.steps.step4_insights_fetch = {
          status: 'PASSED',
          testedCampaign: targetCamp.name,
          metrics: {
            spend: parseFloat(metrics.spend || 0),
            reach: parseInt(metrics.reach || 0, 10),
            impressions: parseInt(metrics.impressions || 0, 10),
            clicks: parseInt(metrics.clicks || 0, 10)
          },
          message: `Successfully fetched live metrics for campaign "${targetCamp.name}".`
        };
        testReport.testsPassed++;
      }
    } catch (err) {
      testReport.steps.step4_insights_fetch = {
        status: 'FAILED',
        message: err.message
      };
    }
  } else {
    testReport.steps.step4_insights_fetch = {
      status: 'PASSED',
      message: 'Skipped (no campaigns in ad account to test metrics for).'
    };
    testReport.testsPassed++;
  }

  return NextResponse.json(testReport, { status: 200 });
}
