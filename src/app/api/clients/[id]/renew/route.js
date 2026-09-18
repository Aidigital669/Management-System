import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { executeClientRenewal } from '@/lib/renewalService';

export async function POST(request, { params }) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    const cookieStore = await cookies();
    const userIdStr = cookieStore.get('userId')?.value;
    if (!userIdStr) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const requester = await prisma.user.findUnique({ where: { id: parseInt(userIdStr) } });
    if (!requester || (requester.role !== 'CEO' && requester.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Only Admin and CEO can approve and renew plans.' }, { status: 403 });
    }

    const result = await executeClientRenewal(id, requester);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error renewing client plan:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
