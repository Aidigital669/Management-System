import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { checkAndDeactivateExpiredClients } from '@/lib/planUtils';

// GET /api/renewal-requests - Fetch all renewal and extension requests
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Lazily evaluate and auto-deactivate expired client packages if needed
    try {
      await checkAndDeactivateExpiredClients(prisma);
    } catch (e) {
      console.warn('Deactivation check warning:', e.message);
    }

    const where = {};
    if (status) {
      where.status = status;
    }

    const requests = await prisma.renewalRequest.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            clientId: true,
            businessName: true,
            clientName: true,
            packageName: true,
            packageAmount: true,
            joiningDate: true,
            active: true,
            extensionDays: true,
            extensionExpiryDate: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error('Error fetching renewal requests:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/renewal-requests - Create a renewal or extension request (TL/Admin/CEO)
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const userIdStr = cookieStore.get('userId')?.value;
    if (!userIdStr) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userIdStr) }
    });

    if (!user || (user.role !== 'TL' && user.role !== 'ADMIN' && user.role !== 'CEO')) {
      return NextResponse.json({ error: 'Unauthorized: Only Team Leaders and Admins can create renewal/extension requests.' }, { status: 403 });
    }

    const body = await request.json();
    const { clientDbId, requestType, requestedDays, reason } = body;

    if (!clientDbId || !requestType) {
      return NextResponse.json({ error: 'Client ID and request type are required.' }, { status: 400 });
    }

    if (!['RENEWAL', 'EXTENSION'].includes(requestType)) {
      return NextResponse.json({ error: 'Invalid request type. Must be RENEWAL or EXTENSION.' }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: parseInt(clientDbId) }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }

    // Strict validation for Extension requests:
    let parsedDays = null;
    if (requestType === 'EXTENSION') {
      parsedDays = parseInt(requestedDays, 10);
      if (isNaN(parsedDays) || parsedDays < 1) {
        return NextResponse.json({ error: 'Please specify a valid number of extension days (minimum 1 day).' }, { status: 400 });
      }
      // Compulsory constraint: TL can request MAX 7 days
      if (parsedDays > 7) {
        return NextResponse.json({
          error: 'Team Leader can request a maximum of 7 days extension. Please specify between 1 and 7 days.'
        }, { status: 400 });
      }

      if (!reason || !reason.trim()) {
        return NextResponse.json({ error: 'A reason/justification is compulsory when requesting an extension.' }, { status: 400 });
      }
    }

    // Check if there is already a PENDING request for this client of the same type
    const existingPending = await prisma.renewalRequest.findFirst({
      where: {
        clientDbId: client.id,
        requestType,
        status: 'PENDING'
      }
    });

    if (existingPending) {
      return NextResponse.json({
        error: `A pending ${requestType.toLowerCase()} request for "${client.businessName}" is already awaiting Admin approval.`
      }, { status: 400 });
    }

    // Create the request
    const newRequest = await prisma.renewalRequest.create({
      data: {
        clientId: client.clientId,
        clientDbId: client.id,
        businessName: client.businessName,
        requestType,
        status: 'PENDING',
        requestedDays: parsedDays,
        reason: reason ? reason.trim() : null,
        requestedById: user.id,
        requestedByName: user.name,
        requestedByRole: user.role
      }
    });

    // Record audit log
    try {
      await prisma.auditLog.create({
        data: {
          action: `${requestType}_REQUEST_RAISED: ${user.name} (${user.role}) requested ${requestType}${parsedDays ? ` for ${parsedDays} days` : ''} for client "${client.businessName}". Pending Admin approval.`,
          performedByName: user.name,
          performedByRole: user.role
        }
      });
    } catch (auditErr) {}

    return NextResponse.json({
      success: true,
      message: `${requestType === 'RENEWAL' ? 'Renewal' : 'Extension'} request submitted successfully and is awaiting Admin approval.`,
      request: newRequest
    });

  } catch (error) {
    console.error('Error creating renewal request:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
