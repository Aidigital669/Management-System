import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const userIdStr = cookieStore.get('userId')?.value;
    const originalAdminIdStr = cookieStore.get('originalAdminId')?.value;

    const body = await request.json();
    const { userId: targetUserId, revert, targetUrl } = body;

    // 1. REVERT BACK TO ORIGINAL ADMIN SESSION
    if (revert) {
      if (!originalAdminIdStr) {
        return NextResponse.json({ error: 'No active admin session found' }, { status: 400 });
      }

      const adminUser = await prisma.user.findUnique({
        where: { id: parseInt(originalAdminIdStr, 10) }
      });

      if (!adminUser || (adminUser.role !== 'ADMIN' && adminUser.role !== 'CEO')) {
        return NextResponse.json({ error: 'Original admin account not found' }, { status: 404 });
      }

      cookieStore.set('userId', adminUser.id.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7,
        path: '/'
      });
      cookieStore.delete('originalAdminId');
      cookieStore.delete('originalAdminName');

      return NextResponse.json({
        success: true,
        redirectUrl: adminUser.role === 'CEO' ? '/dashboard/ceo' : '/dashboard/admin'
      });
    }

    // 2. IMPERSONATE / SWITCH TO EMPLOYEE DASHBOARD
    if (!userIdStr) {
      return NextResponse.json({ error: 'Unauthorized: Not logged in' }, { status: 401 });
    }

    const currentCallerId = originalAdminIdStr || userIdStr;
    const caller = await prisma.user.findUnique({
      where: { id: parseInt(currentCallerId, 10) }
    });

    if (!caller || (caller.role !== 'ADMIN' && caller.role !== 'CEO')) {
      return NextResponse.json({ error: 'Unauthorized: Only Admin or CEO can access employee dashboards' }, { status: 403 });
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: parseInt(targetUserId, 10) }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Preserve original admin ID if not already impersonating
    if (!originalAdminIdStr) {
      cookieStore.set('originalAdminId', caller.id.toString(), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7,
        path: '/'
      });
      cookieStore.set('originalAdminName', caller.name, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7,
        path: '/'
      });
    }

    // Switch userId cookie to target user
    cookieStore.set('userId', targetUser.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });
    cookieStore.delete('clientId');

    const defaultRedirect = targetUser.role === 'SALES' 
      ? '/dashboard/sales' 
      : targetUser.role === 'TL' 
        ? '/dashboard/tl' 
        : '/dashboard/employee';

    const redirectUrl = targetUrl || defaultRedirect;

    return NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        department: targetUser.department
      },
      redirectUrl
    });
  } catch (error) {
    console.error('Impersonation error:', error);
    return NextResponse.json({ error: 'Failed to access employee dashboard' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const originalAdminId = cookieStore.get('originalAdminId')?.value;
    const originalAdminName = cookieStore.get('originalAdminName')?.value;

    return NextResponse.json({
      isImpersonating: Boolean(originalAdminId),
      adminId: originalAdminId || null,
      adminName: originalAdminName || null
    });
  } catch (err) {
    return NextResponse.json({ isImpersonating: false });
  }
}
