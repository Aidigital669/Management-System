import { NextResponse } from 'next/server';
import { processAutonomousWhatsAppMessage } from '@/lib/aiAgent';

export const dynamic = 'force-dynamic';

/**
 * GET: Meta Webhook Handshake Verification
 */
export async function GET(req) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'aidigitals_secure_verify_token_2026';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ WhatsApp Webhook successfully verified with Meta');
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

/**
 * POST: Handles incoming WhatsApp messages from customers
 * Powered by Autonomous Gemini Agent + Real-Time Database RAG
 */
export async function POST(req) {
  try {
    const body = await req.json();

    // Meta sends webhook events in entry[].changes[].value
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    const messages = changes?.messages;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ status: 'ignored_no_messages' }, { status: 200 });
    }

    const incomingMsg = messages[0];
    const senderPhone = incomingMsg.from; // e.g. "916375787368"
    const messageText = incomingMsg.text?.body;

    if (!messageText) {
      return NextResponse.json({ status: 'non_text_message' }, { status: 200 });
    }

    console.log(`\n📥 Incoming WhatsApp Message from ${senderPhone}: "${messageText}"`);

    // Process through Autonomous AI Agent with live Database Context
    const result = await processAutonomousWhatsAppMessage({
      senderPhone,
      messageText,
    });

    return NextResponse.json({
      status: 'success',
      senderPhone,
      result,
    }, { status: 200 });

  } catch (error) {
    console.error('WhatsApp webhook processing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
