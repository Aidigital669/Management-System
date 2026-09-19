import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { parseDbDate, formatDateToDb, getPlanDurationDays } from '@/lib/planUtils';

export async function POST(request, { params }) {
  try {
    const { id: idParam } = await params;
    const clientDbId = parseInt(idParam, 10);

    const cookieStore = await cookies();
    const userIdStr = cookieStore.get('userId')?.value;
    if (!userIdStr) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: parseInt(userIdStr, 10) }
    });

    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'CEO')) {
      return NextResponse.json({
        error: 'Unauthorized: Only Admin or CEO has the power to directly grant client pack extensions.'
      }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { extensionDays: inputDays, reason } = body;

    const days = parseInt(inputDays !== undefined ? inputDays : 10, 10);
    if (isNaN(days) || days < 1) {
      return NextResponse.json({ error: 'Extension must be at least 1 day.' }, { status: 400 });
    }

    // Strict rule: Admin has the power to give up to MAX 10 days extension
    if (days > 10) {
      return NextResponse.json({
        error: 'Admin can grant a maximum of 10 days extension of pack. Please select between 1 and 10 days.'
      }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientDbId }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }

    const start = parseDbDate(client.joiningDate) || new Date();
    const planDuration = getPlanDurationDays(client.packageName, client.requirement, client.services);

    const baseExpiry = new Date(start);
    baseExpiry.setDate(baseExpiry.getDate() + planDuration);

    const extendedExpiry = new Date(baseExpiry);
    extendedExpiry.setDate(extendedExpiry.getDate() + days);
    const extendedExpiryStr = formatDateToDb(extendedExpiry);

    // Update client: set extensionDays, extensionExpiryDate, and ensure active
    await prisma.client.update({
      where: { id: client.id },
      data: {
        extensionDays: days,
        extensionExpiryDate: extendedExpiryStr,
        active: true
      }
    });

    // Check if there was an existing pending extension request from TL
    const existingPending = await prisma.renewalRequest.findFirst({
      where: {
        clientDbId: client.id,
        requestType: 'EXTENSION',
        status: 'PENDING'
      }
    });

    if (existingPending) {
      await prisma.renewalRequest.update({
        where: { id: existingPending.id },
        data: {
          status: 'APPROVED',
          approvedDays: days,
          approvedById: admin.id,
          approvedByName: admin.name,
          adminNote: reason ? reason.trim() : `Admin granted ${days} days extension.`
        }
      });
    } else {
      // Create a direct approved record in RenewalRequest history
      await prisma.renewalRequest.create({
        data: {
          clientId: client.clientId,
          clientDbId: client.id,
          businessName: client.businessName,
          requestType: 'EXTENSION',
          status: 'APPROVED',
          requestedDays: days,
          approvedDays: days,
          reason: reason ? reason.trim() : 'Direct extension granted by Admin.',
          adminNote: reason ? reason.trim() : 'Direct extension granted by Admin.',
          requestedById: admin.id,
          requestedByName: admin.name,
          requestedByRole: admin.role,
          approvedById: admin.id,
          approvedByName: admin.name
        }
      });
    }

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          action: `ADMIN_DIRECT_EXTENSION: ${admin.name} (${admin.role}) directly granted ${days} days extension of pack for "${client.businessName}" (${client.clientId}). Valid until ${extendedExpiryStr}. Note: After ${days} days without renewal, pack will expire and deactivate.`,
          performedByName: admin.name,
          performedByRole: admin.role
        }
      });
    } catch (auditErr) {}

    return NextResponse.json({
      success: true,
      message: `Successfully granted ${days} days extension of pack for "${client.businessName}"! Valid until ${extendedExpiryStr}.`,
      extensionDays: days,
      extendedExpiryDate: extendedExpiryStr
    });

  } catch (error) {
    console.error('Error granting admin direct extension:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
