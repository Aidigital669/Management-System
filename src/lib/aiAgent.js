/**
 * Autonomous AI WhatsApp CRM Agent
 * Powered by Google Gemini & PostgreSQL Database Context (RAG)
 */

import { prisma } from './db.js';
import { sendWhatsAppMessage } from './whatsapp.js';

/**
 * Gather complete real-time database context for a phone number
 */
export async function getClientDatabaseContext(rawPhone) {
  if (!rawPhone) return null;
  const digits = rawPhone.toString().replace(/\D/g, '');
  const localDigits = digits.length > 10 ? digits.slice(-10) : digits;

  // 1. Check in Clients table
  const client = await prisma.client.findFirst({
    where: {
      OR: [
        { contact: { contains: localDigits } },
        { contact: { contains: digits } },
      ],
    },
    include: {
      ClientDelivery: {
        take: 10,
        orderBy: { id: 'desc' },
      },
      ClientTask: {
        take: 10,
        orderBy: { id: 'desc' },
      },
    },
  });

  // 2. Check in CallRecord (Leads / Sales)
  const leads = await prisma.callRecord.findMany({
    where: {
      OR: [
        { phoneNumber: { contains: localDigits } },
        { phoneNumber: { contains: digits } },
      ],
    },
    include: {
      salesPerson: {
        select: { id: true, name: true, email: true, designation: true },
      },
    },
    orderBy: { id: 'desc' },
    take: 5,
  });

  // 3. Get Agency Service Plans for reference
  const plans = await prisma.plan.findMany({
    take: 10,
    select: { name: true, category: true, price: true, billingCycle: true },
  });

  return {
    client,
    leads,
    plans,
    phone: digits,
  };
}

/**
 * Process an incoming WhatsApp message through Gemini AI with full database context
 */
export async function processAutonomousWhatsAppMessage({ senderPhone, messageText }) {
  const context = await getClientDatabaseContext(senderPhone);
  const geminiApiKey = process.env.GEMINI_API_KEY;

  const clientName = context?.client?.clientName || context?.client?.businessName || context?.leads?.[0]?.clientName || 'Valued Client';
  const isExistingClient = Boolean(context?.client);
  const isSalesLead = Boolean(context?.leads?.length > 0);

  // Summarize database state for Gemini's system context
  const dbSummary = {
    contactPhone: senderPhone,
    clientProfile: context?.client ? {
      businessName: context.client.businessName,
      clientName: context.client.clientName,
      packageName: context.client.packageName,
      packageAmount: context.client.packageAmount,
      services: context.client.services,
      joiningDate: context.client.joiningDate,
      active: context.client.active,
      recentDeliveries: context.client.ClientDelivery.map(d => ({
        postType: d.postType,
        postDate: d.postDate,
        status: d.status,
        workingOn: d.workingOn,
      })),
      recentTasks: context.client.ClientTask.map(t => ({
        taskTitle: t.taskTitle,
        date: t.date,
        status: t.status,
        assignTo: t.assignTo,
      })),
    } : null,
    salesLeadProfile: context?.leads?.length > 0 ? context.leads.map(l => ({
      id: l.id,
      clientName: l.clientName,
      status: l.status,
      notes: l.notes,
      followUpDate: l.followUpDate,
      assignedRepresentative: l.salesPerson?.name,
    })) : null,
    availableAgencyPlans: context?.plans || [],
  };

  // If no Gemini API key, use smart rule-based handler with database context
  if (!geminiApiKey || geminiApiKey.trim() === '') {
    return await handleRuleBasedResponse({
      messageText,
      senderPhone,
      clientName,
      context,
      dbSummary,
    });
  }

  // --- GEMINI AUTONOMOUS REASONING & FUNCTION CALLING ---
  const systemPrompt = `
You are the 24/7 Official Autonomous AI Client Executive for "AiDigitals" (a premier Digital Marketing, Video Production & Ads Agency).
You are replying directly to a client on WhatsApp.

CRITICAL INSTRUCTIONS:
1. Speak warmly, professionally, and concisely in WhatsApp conversational style. Use emojis and *bold* formatting where helpful.
2. Rely STRICTLY on the real-time Database Facts provided below. Do NOT invent prices, staff names, or statuses not present in the data.
3. If the client asks about their package, plan expiration, or renewal: use their exact active packageName, packageAmount, and dates from the data.
4. If the client asks about deliverables, post status, or reels: give them the exact status and assignees from recentDeliveries or recentTasks.
5. If the client wants to reschedule a call: extract the new date/time clearly and acknowledge it politely.
6. If the client is upset or has an urgent custom request: reassure them politely and note that their dedicated manager has been notified.

LIVE DATABASE FACTS FOR THIS CUSTOMER:
${JSON.stringify(dbSummary, null, 2)}

Incoming WhatsApp message from client:
"${messageText}"

Provide your output in strict JSON format:
{
  "replyMessage": "The exact message to send to the client on WhatsApp",
  "action": "NONE" | "RESCHEDULE" | "ESCALATE_FEEDBACK",
  "actionDetails": {
    "rescheduleTime": "extracted ISO or human readable time if applicable",
    "feedbackSummary": "summary if urgent escalation"
  }
}
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(text);

      // Execute autonomous database actions
      await executeAutonomousAction(parsed, context, senderPhone, messageText);

      // Send the AI reply back via WhatsApp Cloud API
      if (parsed.replyMessage) {
        await sendWhatsAppMessage({
          to: senderPhone,
          message: parsed.replyMessage,
        });
      }

      return { success: true, aiResponse: parsed };
    }
  } catch (err) {
    console.error('Gemini autonomous processing error:', err);
  }

  // Fallback if Gemini fails
  return await handleRuleBasedResponse({
    messageText,
    senderPhone,
    clientName,
    context,
    dbSummary,
  });
}

/**
 * Execute DB updates based on AI intent (reschedule, notes logging, feedback)
 */
async function executeAutonomousAction(aiDecision, context, senderPhone, originalMsg) {
  const { action, actionDetails } = aiDecision || {};

  // 1. Reschedule action
  if (action === 'RESCHEDULE' && context?.leads?.[0]) {
    const latestLead = context.leads[0];
    await prisma.callRecord.update({
      where: { id: latestLead.id },
      data: {
        notes: (latestLead.notes || '') + `\n[AI Reschedule via WhatsApp]: "${originalMsg}" -> New Time: ${actionDetails?.rescheduleTime || 'Requested'}`,
        status: 'CALLBACK',
      },
    });
  }

  // 2. Feedback / Concern escalation
  if (action === 'ESCALATE_FEEDBACK' && context?.client) {
    await prisma.clientFeedback.create({
      data: {
        clientId: context.client.clientId,
        businessName: context.client.businessName,
        clientName: context.client.clientName,
        type: 'Concern',
        message: `WhatsApp Auto-Escalation: "${originalMsg}" - ${actionDetails?.feedbackSummary || ''}`,
        status: 'Pending',
      },
    });
  }

  // Always log incoming message to CRM notes
  if (context?.leads?.[0]) {
    await prisma.callRecord.update({
      where: { id: context.leads[0].id },
      data: {
        notes: (context.leads[0].notes || '') + `\n[Client WhatsApp]: "${originalMsg}"`,
      },
    });
  }
}

/**
 * Rule-based fallback with full database awareness when Gemini API key is not active
 */
async function handleRuleBasedResponse({ messageText, senderPhone, clientName, context }) {
  const lower = (messageText || '').toLowerCase();
  let reply = '';

  if (lower.includes('reschedule') || lower.includes('call later') || lower.includes('tomorrow') || lower.includes('busy')) {
    reply = `Hello ${clientName}! 👋\n\nUnderstood! We have noted your request to reschedule. Our representative will connect with you at your preferred time. Thank you for letting us know!\n\n— *AiDigitals Team*`;
    if (context?.leads?.[0]) {
      await prisma.callRecord.update({
        where: { id: context.leads[0].id },
        data: {
          notes: (context.leads[0].notes || '') + `\n[Client Reschedule Request]: "${messageText}"`,
          status: 'CALLBACK',
        },
      });
    }
  } else if (lower.includes('plan') || lower.includes('renew') || lower.includes('package') || lower.includes('price')) {
    const pkg = context?.client?.packageName || 'Digital Marketing & Ads Growth Plan';
    const amt = context?.client?.packageAmount ? `₹${context.client.packageAmount.toLocaleString('en-IN')}` : 'competitive agency rates';
    reply = `Hello ${clientName}! 👋\n\nYour active package is *${pkg}* (${amt}). Our account manager is available to process your renewal or upgrade. Would you like us to generate your renewal invoice today?\n\n— *AiDigitals Team*`;
  } else if (lower.includes('reel') || lower.includes('post') || lower.includes('task') || lower.includes('status')) {
    const recentDelivery = context?.client?.ClientDelivery?.[0];
    if (recentDelivery) {
      reply = `Hello ${clientName}! 👋\n\nYour recent ${recentDelivery.postType} scheduled for ${recentDelivery.postDate} is currently marked as *${recentDelivery.status}*${recentDelivery.workingOn ? ` with ${recentDelivery.workingOn}` : ''}.\n\n— *AiDigitals Team*`;
    } else {
      reply = `Hello ${clientName}! 👋\n\nAll your scheduled deliverables are actively in progress with our creative team. We will notify you as soon as the next asset goes live!\n\n— *AiDigitals Team*`;
    }
  } else {
    reply = `Hello ${clientName}! 👋\n\nThank you for messaging *AiDigitals*. We have received your message: "${messageText}".\n\nOur team is reviewing your request and will assist you shortly! 🚀\n\n— *AiDigitals Team*`;
  }

  // Send reply on WhatsApp
  await sendWhatsAppMessage({
    to: senderPhone,
    message: reply,
  });

  return { success: true, ruleBasedReply: reply };
}
