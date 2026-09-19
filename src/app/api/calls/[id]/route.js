import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, notes, followUpDate, expectedValue, leadSource, salesPersonId, clientName, phoneNumber, packageName, expectedClosingDate } = body;

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (followUpDate !== undefined) updateData.followUpDate = followUpDate ? new Date(followUpDate) : null;
    if (expectedValue !== undefined) updateData.expectedValue = expectedValue !== '' && expectedValue !== null ? parseFloat(expectedValue) : null;
    if (leadSource !== undefined) updateData.leadSource = leadSource;
    if (salesPersonId !== undefined) updateData.salesPersonId = parseInt(salesPersonId, 10);
    if (clientName !== undefined) updateData.clientName = clientName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (packageName !== undefined) updateData.packageName = packageName;
    if (expectedClosingDate !== undefined) updateData.expectedClosingDate = expectedClosingDate ? new Date(expectedClosingDate) : null;

    const updatedCall = await prisma.callRecord.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
      include: {
        salesPerson: {
          select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
            department: true,
            designation: true,
            avatar: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json({ call: updatedCall });
  } catch (error) {
    console.error('Update call error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    await prisma.callRecord.delete({
      where: { id: parseInt(id, 10) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete call error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}