/**
 * Meta WhatsApp Cloud API Service Helper
 * Handles message formatting, phone sanitization, and delivery via Graph API.
 */

export function sanitizePhoneNumber(rawPhone) {
  if (!rawPhone) return null;
  // Remove all non-digit characters
  let digits = rawPhone.toString().replace(/\D/g, '');

  // Handle standard 10-digit Indian numbers
  if (digits.length === 10) {
    digits = `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = `91${digits.slice(1)}`;
  }

  return digits;
}

/**
 * Send a message via Meta WhatsApp Cloud API
 */
export async function sendWhatsAppMessage({
  to,
  message,
  templateName,
  templateLanguage = 'en_US',
  templateComponents = [],
}) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_ALT_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '1413862698466620';

  if (!accessToken) {
    throw new Error('WhatsApp access token is not configured in environment variables');
  }

  const cleanTo = sanitizePhoneNumber(to);
  if (!cleanTo || cleanTo.length < 10) {
    throw new Error(`Invalid recipient phone number: "${to}"`);
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  let payload = {};

  if (templateName) {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'template',
      template: {
        name: templateName,
        language: { code: templateLanguage },
        ...(templateComponents.length > 0 ? { components: templateComponents } : {})
      }
    };
  } else {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'text',
      text: {
        preview_url: false,
        body: message || ''
      }
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error?.message || 'Failed to send WhatsApp message via Meta Cloud API';
      const errorCode = data?.error?.code;
      const errorSubcode = data?.error?.error_subcode;
      
      console.error('Meta WhatsApp API Error:', {
        status: response.status,
        code: errorCode,
        subcode: errorSubcode,
        message: errorMsg,
        details: data?.error?.error_data?.details
      });

      return {
        success: false,
        error: errorMsg,
        code: errorCode,
        subcode: errorSubcode,
        raw: data
      };
    }

    return {
      success: true,
      messageId: data?.messages?.[0]?.id,
      recipient: cleanTo,
      data
    };
  } catch (err) {
    console.error('Network or execution error sending WhatsApp message:', err);
    return {
      success: false,
      error: err.message || 'Unknown network error communicating with WhatsApp Cloud API'
    };
  }
}

import { generateAIFollowUpReminder } from './gemini.js';

/**
 * Send an AI-crafted Follow-up / Appointment reminder to a lead or client
 */
export async function sendLeadFollowUpReminder({
  phone,
  clientName,
  scheduledTime,
  salesPersonName,
  notes,
  requirement,
  templateName = null,
}) {
  const aiMessage = await generateAIFollowUpReminder({
    clientName,
    scheduledTime,
    notes,
    salesPersonName,
    requirement,
  });

  return await sendWhatsAppMessage({
    to: phone,
    message: aiMessage,
    templateName,
  });
}
