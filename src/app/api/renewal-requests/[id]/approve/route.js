import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { executeClientRenewal } from '@/lib/renewalService';
import { parseDbDate, formatDateToDb, getPlanDurationDays } from '@/lib/planUtils';

export async function POST(request, { params }) {
  try {
    const { id: idParam } = await params;
    const requestId = parseInt(idParam, 10);

    const cookieStore = await cookies();
    const userIdStr = cookieStore.get('userId')?.value;
    if (!userIdStr) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const approver = await prisma.user.findUnique({
      where: { id: parseInt(userIdStr) }
    });

    if (!approver || (approver.role !== 'ADMIN' && approver.role !== 'CEO')) {
      return NextResponse.json({ error: 'Unauthorized: Only Admin or CEO can approve renewal/extension requests.' }, { status: 403 });
    }

    const reqRecord = await prisma.renewalRequest.findUnique({
      where: { id: requestId },
      include: { client: true }
    });

    if (!reqRecord) {
      return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
    }

    if (reqRecord.status !== 'PENDING') {
      return NextResponse.json({ error: `Request has already been ${reqRecord.status.toLowerCase()}.` }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { approvedDays: customApprovedDays, adminNote } = body;

    // --- CASE 1: RENEWAL APPROVAL ---
    if (reqRecord.requestType === 'RENEWAL') {
      const renewalResult = await executeClientRenewal(reqRecord.clientDbId, approver, body);

      await prisma.renewalRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          approvedById: approver.id,
          approvedByName: approver.name,
          adminNote: adminNote ? adminNote.trim() : 'Renewal request approved by Admin.'
        }
      });

      return NextResponse.json({
        success: true,
        message: `Plan successfully renewed for "${reqRecord.businessName}"! New contract cycle active.`,
        renewalResult
      });
    }

    // --- CASE 2: EXTENSION APPROVAL ---
    if (reqRecord.requestType === 'EXTENSION') {
      let finalApprovedDays = customApprovedDays !== undefined ? parseInt(customApprovedDays, 10) : reqRecord.requestedDays;

      if (isNaN(finalApprovedDays) || finalApprovedDays < 1) {
        return NextResponse.json({ error: 'Extension must be at least 1 day.' }, { status: 400 });
      }

      // Compulsory constraint: Admin can grant MAX 10 days extension
      if (finalApprovedDays > 10) {
        return NextResponse.json({
          error: 'Admin can grant a maximum extension of 10 days. Please specify between 1 and 10 days.'
        }, { status: 400 });
      }

      const client = reqRecord.client;
      const start = parseDbDate(client.joiningDate) || new Date();
      const planDuration = getPlanDurationDays(client.packageName, client.requirement, client.services);

      const baseExpiry = new Date(start);
      baseExpiry.setDate(baseExpiry.getDate() + planDuration);

      const extendedExpiry = new Date(baseExpiry);
      extendedExpiry.setDate(extendedExpiry.getDate() + finalApprovedDays);
      const extendedExpiryStr = formatDateToDb(extendedExpiry);

      // Update client: set extensionDays, extendedExpiryDate, and ensure active is true
      await prisma.client.update({
        where: { id: client.id },
        data: {
          extensionDays: finalApprovedDays,
          extensionExpiryDate: extendedExpiryStr,
          active: true
        }
      });

      // Update the request record
      await prisma.renewalRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          approvedDays: finalApprovedDays,
          approvedById: approver.id,
          approvedByName: approver.name,
          adminNote: adminNote ? adminNote.trim() : `Approved ${finalApprovedDays} days extension until ${extendedExpiryStr}.`
        }
      });

      // Audit Log
      try {
        await prisma.auditLog.create({
          data: {
            action: `EXTENSION_APPROVED: ${approver.name} approved ${finalApprovedDays} days extension for client "${client.businessName}". Valid until ${extendedExpiryStr}. Note: After ${finalApprovedDays} days without renewal, pack will expire and deactivate.`,
            performedByName: approver.name,
            performedByRole: approver.role
          }
        });
      } catch (auditErr) {}

      return NextResponse.json({
        success: true,
        message: `Successfully approved ${finalApprovedDays} days extension for "${client.businessName}". Valid until ${extendedExpiryStr}.`,
        extensionDays: finalApprovedDays,
        extendedExpiryDate: extendedExpiryStr
      });
    }

    return NextResponse.json({ error: 'Unsupported request type.' }, { status: 400 });

  } catch (error) {
    console.error('Error approving renewal/extension request:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
