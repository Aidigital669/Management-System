import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getClientPlanInfo, isClientPlanActive } from '@/lib/planUtils';
import { sendWhatsAppMessage, sanitizePhoneNumber } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

const PRICING_ANCHORS = {
  facebook: 'https://www.aidigital.biz/pricing#facebook',
  google: 'https://www.aidigital.biz/pricing#google',
  combine: 'https://www.aidigital.biz/pricing#combine',
  websites: 'https://www.aidigital.biz/pricing#websites',
  creative: 'https://www.aidigital.biz/pricing#creative',
  aivideo: 'https://www.aidigital.biz/pricing#aivideo',
  realestate: 'https://www.aidigital.biz/pricing#realestate'
};

function matchPlanUrl(services = '', packageName = '') {
  const text = `${services} ${packageName}`.toLowerCase();
  if (text.includes('real estate') || text.includes('property')) return PRICING_ANCHORS.realestate;
  if ((text.includes('meta') || text.includes('facebook')) && text.includes('google')) return PRICING_ANCHORS.combine;
  if (text.includes('google') || text.includes('adwords')) return PRICING_ANCHORS.google;
  if (text.includes('video') || text.includes('ai video')) return PRICING_ANCHORS.aivideo;
  if (text.includes('website') || text.includes('web design') || text.includes('development')) return PRICING_ANCHORS.websites;
  if (text.includes('creative') || text.includes('graphic') || text.includes('post')) return PRICING_ANCHORS.creative;
  return PRICING_ANCHORS.facebook;
}

function buildUpiPaymentLink(clientId, clientName, amount) {
  const note = encodeURIComponent(`Renewal ${clientId} ${clientName}`.slice(0, 50));
  return `upi://pay?pa=aidigitalbiz01@okaxis&pn=AI%20Digital&am=${Number(amount).toFixed(2)}&cu=INR&tn=${note}`;
}

/**
 * GET /api/automation/whatsapp-reminders
 * Returns clients expiring within 7 days with matched plan and payment links.
 */
export async function GET(request) {
  try {
    const clients = await prisma.client.findMany({
      where: { active: true }
    });

    const expiringClients = [];

    for (const c of clients) {
      if (!isClientPlanActive(c)) continue;
      const info = getClientPlanInfo(c);

      // Only include clients with 7 or fewer days remaining
      if (info.daysRemaining >= 0 && info.daysRemaining <= 7) {
        const pricingUrl = matchPlanUrl(c.services, c.packageName);
        const upiLink = buildUpiPaymentLink(c.clientId, c.clientName || c.businessName, c.packageAmount);

        expiringClients.push({
          id: c.id,
          clientId: c.clientId,
          businessName: c.businessName,
          clientName: c.clientName,
          contact: c.contact,
          cleanPhone: sanitizePhoneNumber(c.contact),
          packageName: c.packageName,
          packageAmount: c.packageAmount,
          expiryDate: info.expiryDate,
          daysRemaining: info.daysRemaining,
          durationLabel: info.durationLabel,
          status: info.status,
          pricingUrl,
          upiLink
        });
      }
    }

    // Sort by urgency
    expiringClients.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return NextResponse.json({
      success: true,
      totalExpiring: expiringClients.length,
      clients: expiringClients
    });
  } catch (error) {
    console.error('Error fetching expiring clients for reminders:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/automation/whatsapp-reminders
 * Dispatches WhatsApp reminder messages to expiring clients.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { dryRun = false, clientId = null } = body;

    const clients = await prisma.client.findMany({
      where: { active: true }
    });

    const dispatched = [];
    const failed = [];

    for (const c of clients) {
      if (!isClientPlanActive(c)) continue;
      if (clientId && c.clientId !== clientId) continue;

      const info = getClientPlanInfo(c);

      if (clientId || (info.daysRemaining >= 0 && info.daysRemaining <= 7)) {
        const pricingUrl = matchPlanUrl(c.services, c.packageName);
        const upiLink = buildUpiPaymentLink(c.clientId, c.clientName || c.businessName, c.packageAmount);
        const cleanPhone = sanitizePhoneNumber(c.contact);

        if (!cleanPhone) {
          failed.push({ clientId: c.clientId, businessName: c.businessName, error: 'No valid phone number found' });
          continue;
        }

        const salutation = (c.clientName || c.businessName || 'Valued Client').trim();
        const daysLeftText = info.daysRemaining === 0 
          ? 'expires TODAY' 
          : (info.daysRemaining === 1 ? 'expires TOMORROW' : `is ending in ${info.daysRemaining} days`);

        const messageText = `👋 *Hello ${salutation}*,

Greetings from *AI Digital*! 🚀

⏳ Your active marketing package *${daysLeftText}* (Valid until ${info.expiryDate}).

To ensure uninterrupted campaign deliveries, creative graphic designing, and ad optimization, please complete your renewal before expiry.

📋 *Plan Summary:*
• *Package:* ${c.packageName}
• *Duration:* ${info.durationLabel}
• *Renewal Amount:* ₹${Number(c.packageAmount).toLocaleString('en-IN')}

🌐 *View Package Details:*
${pricingUrl}

💳 *Instant Renewal UPI Pay Link:*
${upiLink}

Once paid, please reply with a payment screenshot, and we will activate your next cycle immediately.

Need assistance? Call us at +91-9096090701.

Thank you!
*AI Digital Team* | www.aidigital.biz`.trim();

        if (dryRun) {
          dispatched.push({
            clientId: c.clientId,
            businessName: c.businessName,
            phone: cleanPhone,
            daysRemaining: info.daysRemaining,
            dryRun: true,
            preview: messageText
          });
        } else {
          const res = await sendWhatsAppMessage({
            to: cleanPhone,
            message: messageText
          });

          if (res.success) {
            dispatched.push({
              clientId: c.clientId,
              businessName: c.businessName,
              phone: cleanPhone,
              messageId: res.messageId
            });
          } else {
            failed.push({
              clientId: c.clientId,
              businessName: c.businessName,
              phone: cleanPhone,
              error: res.error
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      mode: dryRun ? 'DRY_RUN' : 'LIVE',
      dispatchedCount: dispatched.length,
      failedCount: failed.length,
      dispatched,
      failed
    });
  } catch (error) {
    console.error('Error dispatching WhatsApp renewal reminders:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
