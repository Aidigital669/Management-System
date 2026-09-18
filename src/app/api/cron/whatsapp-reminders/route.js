import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendLeadFollowUpReminder } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/whatsapp-reminders
 * Automated cron worker: scans for upcoming follow-ups, crafts Gemini AI reminders,
 * and delivers them via WhatsApp Cloud API.
 */
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const authHeader = req.headers.get('authorization');
    const secret = url.searchParams.get('secret');

    // Optional lightweight secret check to avoid arbitrary crawls
    const expectedSecret = process.env.CRON_SECRET || process.env.CRM_API_KEY;
    if (expectedSecret && secret && secret !== expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
    }

    const now = new Date();
    // Look ahead 35 minutes into the future and 15 minutes in the past
    const windowStart = new Date(now.getTime() - 15 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 35 * 60 * 1000);

    const dueLeads = await prisma.callRecord.findMany({
      where: {
        followUpDate: {
          gte: windowStart,
          lte: windowEnd,
        },
        // Only active/pending statuses
        status: {
          in: ['PENDING', 'CALLBACK', 'INTERESTED', 'SWITCHED_OFF', 'BUSY'],
        },
      },
      include: {
        salesPerson: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const results = [];

    for (const lead of dueLeads) {
      if (!lead.phoneNumber) continue;

      // Duplicate prevention: check if reminder was already sent for this followUpDate
      const reminderTag = `[WhatsApp Reminder Sent]`;
      if (lead.notes && lead.notes.includes(reminderTag)) {
        // Check if sent in the last 2 hours
        results.push({
          leadId: lead.id,
          clientName: lead.clientName,
          status: 'SKIPPED_ALREADY_SENT',
        });
        continue;
      }

      const res = await sendLeadFollowUpReminder({
        phone: lead.phoneNumber,
        clientName: lead.clientName,
        scheduledTime: lead.followUpDate,
        salesPersonName: lead.salesPerson?.name,
        notes: lead.notes,
        requirement: lead.requirement || lead.leadSource,
      });

      if (res.success) {
        // Tag lead notes in DB to prevent re-sending
        const updatedNotes = lead.notes 
          ? `${lead.notes}\n${reminderTag} at ${new Date().toLocaleTimeString('en-IN')}`
          : `${reminderTag} at ${new Date().toLocaleTimeString('en-IN')}`;

        await prisma.callRecord.update({
          where: { id: lead.id },
          data: { notes: updatedNotes },
        });

        results.push({
          leadId: lead.id,
          clientName: lead.clientName,
          phone: lead.phoneNumber,
          status: 'DELIVERED',
          messageId: res.messageId,
        });
      } else {
        results.push({
          leadId: lead.id,
          clientName: lead.clientName,
          phone: lead.phoneNumber,
          status: 'FAILED',
          error: res.error,
        });
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      checkedCount: dueLeads.length,
      processed: results.length,
      results,
    });

  } catch (error) {
    console.error('Cron WhatsApp Reminders Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
