import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { calculateEmployeePerformance } from '@/lib/performanceUtils';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const userIdStr = cookieStore.get('userId')?.value;
    if (!userIdStr) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const requester = await prisma.user.findUnique({
      where: { id: parseInt(userIdStr) }
    });

    if (!requester || !['ADMIN', 'CEO', 'MANAGER'].includes(requester.role)) {
      return NextResponse.json({ error: 'Access denied: Admin/CEO privileges required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || 'this_month';

    const [employees, clientTasks, clientDeliveries, internalTasks, attendanceLogs, feedbacks] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: { in: ['EMPLOYEE', 'SALES'] },
          status: { not: 'INACTIVE' }
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          designation: true,
          status: true,
          avatar: true,
          dateOfJoining: true
        }
      }),
      prisma.clientTask.findMany({
        orderBy: { date: 'desc' }
      }),
      prisma.clientDelivery.findMany({
        orderBy: { postDate: 'desc' }
      }),
      prisma.task.findMany({
        orderBy: { createdAt: 'desc' }
      }),
      prisma.attendance.findMany({
        include: {
          user: {
            select: { name: true, department: true }
          }
        },
        orderBy: { date: 'desc' },
        take: 500
      }),
      prisma.clientFeedback.findMany({
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const performanceData = calculateEmployeePerformance({
      employees,
      clientTasks,
      clientDeliveries,
      internalTasks,
      attendanceLogs,
      feedbacks,
      timeRange
    });

    return NextResponse.json({
      success: true,
      timeRange,
      ...performanceData
    });
  } catch (error) {
    console.error('Error fetching employee performance data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
