// Meta Graph API Client
const GRAPH_VERSION = 'v20.0';

export async function fetchMetaCampaigns() {
  const token = process.env.META_ACCESS_TOKEN?.trim();
  const adAccountId = process.env.META_AD_ACCOUNT_ID?.trim();

  if (!token || !adAccountId) {
    console.warn('Meta credentials missing in .env. No Facebook campaigns will be loaded.');
    return [];
  }

  try {
    // Format ad account ID to ensure it starts with "act_"
    const formattedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${formattedId}/campaigns?fields=id,name,status,objective,effective_status,created_time,start_time,stop_time&access_token=${token}`;

    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    if (data.error) {
      console.error('Meta Graph API campaigns error:', data.error.message || data.error);
      return [];
    }

    return data.data || [];
  } catch (error) {
    console.error('Error fetching Meta campaigns:', error.message || error);
    return [];
  }
}

export async function fetchCampaignInsights(campaignId) {
  const token = process.env.META_ACCESS_TOKEN?.trim();

  if (!token || !campaignId) {
    return { spend: 0, impressions: 0, clicks: 0, reach: 0 };
  }

  try {
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${campaignId}/insights?fields=spend,impressions,clicks,reach,cpc,cpm,ctr&date_preset=maximum&access_token=${token}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    if (data.error) {
      console.error(`Meta API insights error for campaign ${campaignId}:`, data.error.message || data.error);
      return { spend: 0, impressions: 0, clicks: 0, reach: 0 };
    }

    // Graph API insights returns an array of performance data
    const insights = data.data?.[0] || {};
    return {
      spend: parseFloat(insights.spend || 0),
      impressions: parseInt(insights.impressions || 0, 10),
      clicks: parseInt(insights.clicks || 0, 10),
      reach: parseInt(insights.reach || 0, 10)
    };
  } catch (error) {
    console.error(`Error fetching Meta insights for campaign ${campaignId}:`, error.message || error);
    return { spend: 0, impressions: 0, clicks: 0, reach: 0 };
  }
}
