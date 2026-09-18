import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(request, { params }) {
  try {
    const { id: idParam } = await params;
    const requestId = parseInt(idParam, 10);

    const cookieStore = await cookies();
    const userIdStr = cookieStore.get('userId')?.value;
    if (!userIdStr) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reviewer = await prisma.user.findUnique({
      where: { id: parseInt(userIdStr) }
    });

    if (!reviewer || (reviewer.role !== 'ADMIN' && reviewer.role !== 'CEO')) {
      return NextResponse.json({ error: 'Unauthorized: Only Admin or CEO can reject requests.' }, { status: 403 });
    }

    const reqRecord = await prisma.renewalRequest.findUnique({
      where: { id: requestId }
    });

    if (!reqRecord) {
      return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
    }

    if (reqRecord.status !== 'PENDING') {
      return NextResponse.json({ error: `Request has already been ${reqRecord.status.toLowerCase()}.` }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { adminNote } = body;

    const updated = await prisma.renewalRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        approvedById: reviewer.id,
        approvedByName: reviewer.name,
        adminNote: adminNote ? adminNote.trim() : 'Rejected by Admin.'
      }
    });

    try {
      await prisma.auditLog.create({
        data: {
          action: `${reqRecord.requestType}_REJECTED: ${reviewer.name} rejected ${reqRecord.requestType.toLowerCase()} request for client "${reqRecord.businessName}". Reason: ${adminNote || 'No notes provided'}.`,
          performedByName: reviewer.name,
          performedByRole: reviewer.role
        }
      });
    } catch (auditErr) {}

    return NextResponse.json({
      success: true,
      message: `${reqRecord.requestType === 'RENEWAL' ? 'Renewal' : 'Extension'} request rejected.`,
      request: updated
    });

  } catch (error) {
    console.error('Error rejecting request:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
