import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendWhatsAppMessage, sendLeadFollowUpReminder, sanitizePhoneNumber } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * POST /api/whatsapp/reminder
 * Trigger WhatsApp reminder for a specific lead or custom payload
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { 
      leadId, 
      phone, 
      clientName, 
      scheduledTime, 
      notes, 
      salesPersonName, 
      customMessage,
      templateName 
    } = body;

    let targetPhone = phone;
    let targetName = clientName;
    let targetTime = scheduledTime;
    let targetNotes = notes;
    let repName = salesPersonName;

    // If a leadId is provided, pull fresh lead information from database
    if (leadId) {
      const lead = await prisma.callRecord.findUnique({
        where: { id: parseInt(leadId) },
        include: { salesPerson: true },
      });

      if (!lead) {
        return NextResponse.json({ error: 'Lead record not found' }, { status: 404 });
      }

      targetPhone = targetPhone || lead.phoneNumber;
      targetName = targetName || lead.clientName;
      targetTime = targetTime || lead.followUpDate;
      targetNotes = targetNotes || lead.notes;
      repName = repName || lead.salesPerson?.name;
    }

    if (!targetPhone) {
      return NextResponse.json({ error: 'Recipient phone number is required' }, { status: 400 });
    }

    let result;
    if (customMessage) {
      result = await sendWhatsAppMessage({
        to: targetPhone,
        message: customMessage,
        templateName,
      });
    } else {
      result = await sendLeadFollowUpReminder({
        phone: targetPhone,
        clientName: targetName,
        scheduledTime: targetTime,
        salesPersonName: repName,
        notes: targetNotes,
        templateName,
      });
    }

    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error, 
        code: result.code,
        details: result.raw 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp reminder sent successfully!',
      recipient: result.recipient,
      messageId: result.messageId,
    });

  } catch (error) {
    console.error('API WhatsApp reminder error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error sending reminder' 
    }, { status: 500 });
  }
}

/**
 * GET /api/whatsapp/reminder
 * Query follow-ups due today or run batch reminder dispatch (?send=true)
 */
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const shouldSend = url.searchParams.get('send') === 'true';

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Find all leads with follow-up scheduled for today
    const dueLeads = await prisma.callRecord.findMany({
      where: {
        followUpDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        salesPerson: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        followUpDate: 'asc',
      },
    });

    if (!shouldSend) {
      return NextResponse.json({
        totalDueToday: dueLeads.length,
        leads: dueLeads,
      });
    }

    // Automated batch dispatch
    const results = [];
    for (const lead of dueLeads) {
      if (!lead.phoneNumber) continue;
      const res = await sendLeadFollowUpReminder({
        phone: lead.phoneNumber,
        clientName: lead.clientName,
        scheduledTime: lead.followUpDate,
        salesPersonName: lead.salesPerson?.name,
        notes: lead.notes,
      });
      results.push({
        leadId: lead.id,
        clientName: lead.clientName,
        phone: lead.phoneNumber,
        status: res.success ? 'SENT' : 'FAILED',
        error: res.error || null,
      });
    }

    return NextResponse.json({
      processed: results.length,
      results,
    });

  } catch (error) {
    console.error('Error fetching/running due reminders:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
