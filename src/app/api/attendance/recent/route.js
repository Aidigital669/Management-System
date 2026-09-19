import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');

    if (!since) {
      return NextResponse.json({ error: 'Missing since parameter' }, { status: 400 });
    }

    const recentLogs = await prisma.attendance.findMany({
      where: {
        createdAt: {
          gt: new Date(since),
        },
      },
      include: {
        user: {
          select: {
            name: true,
            avatar: true,
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return NextResponse.json({ logs: recentLogs }, { status: 200 });
  } catch (error) {
    console.warn('Attendance polling notice (database busy or transient connection):', error?.message || error);
    // Return empty logs array gracefully so polling does not crash or spam 500 errors
    return NextResponse.json({ logs: [], temporaryUnavailable: true }, { status: 200 });
  }
}
