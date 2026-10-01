import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { autoCloseExpiredAttendance, getISTDateTime } from '@/lib/attendanceService';

async function getRequester(cookieStore) {
  const userIdStr = cookieStore.get('userId')?.value;
  if (!userIdStr) return null;
  return await prisma.user.findUnique({ where: { id: parseInt(userIdStr) } });
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const requester = await getRequester(cookieStore);

    if (!requester) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Auto-close any expired sessions from past dates or today after 6:30 PM shift end
    await autoCloseExpiredAttendance();

    const { dateStr: todayStr } = getISTDateTime();

    const todayLog = await prisma.attendance.findFirst({
      where: {
        userId: requester.id,
        date: todayStr
      }
    });

    let logs;
    if (requester.role === 'EMPLOYEE' || requester.role === 'SALES') {
      logs = await prisma.attendance.findMany({
        where: { userId: requester.id },
        include: { user: { select: { name: true, department: true } } },
        orderBy: { id: 'desc' },
        take: 30
      });
    } else {
      logs = await prisma.attendance.findMany({
        include: { user: { select: { name: true, department: true } } },
        orderBy: { id: 'desc' },
        take: 50
      });
    }

    return NextResponse.json({
      todayLog,
      logs
    });
  } catch (error) {
    console.error('Attendance GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const requester = await getRequester(cookieStore);
    const body = await request.json().catch(() => ({}));
    const { location } = body;

    if (!requester) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Auto-close expired sessions first
    await autoCloseExpiredAttendance();

    const { dateStr: todayStr, hour: curHour, minute: curMinute } = getISTDateTime();
    const now = new Date();

    const activeLog = await prisma.attendance.findFirst({
      where: {
        userId: requester.id,
        date: todayStr,
        clockOut: null
      }
    });

    if (activeLog) {
      const updated = await prisma.attendance.update({
        where: { id: activeLog.id },
        data: { clockOut: now }
      });

      await prisma.auditLog.create({
        data: {
          action: `Clocked out`,
          performedByName: requester.name,
          performedByRole: requester.role
        }
      });

      return NextResponse.json({ message: 'Clocked out successfully', log: updated });
    } else {
      // Check if trying to clock in after 6:30 PM (18:30)
      const isPastShiftEnd = curHour > 18 || (curHour === 18 && curMinute >= 30);
      if (isPastShiftEnd) {
        return NextResponse.json({ error: 'Office shift ended at 6:30 PM. Clock-in is closed for today.' }, { status: 400 });
      }

      const alreadyLogged = await prisma.attendance.findFirst({
        where: {
          userId: requester.id,
          date: todayStr
        }
      });

      if (alreadyLogged && alreadyLogged.clockOut !== null) {
        return NextResponse.json({ error: 'You have already clocked in and out for today.' }, { status: 400 });
      }

      let status = 'PRESENT';
      if (curHour > 9 || (curHour === 9 && curMinute > 15)) {
        status = 'LATE';
      }

      let finalLocation = location;
      
      // Server-side IP Geolocation fallback if client-side geolocation was blocked or unavailable
      if (!finalLocation || finalLocation.includes('Blocked') || finalLocation.includes('not supported')) {
        try {
          const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || '';
          
          if (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1') {
            const geoRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,regionName,city,lat,lon`);
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (geoData && geoData.status === 'success') {
                finalLocation = `${geoData.city}, ${geoData.regionName}, ${geoData.country} (IP Map: https://www.google.com/maps?q=${geoData.lat},${geoData.lon})`;
              }
            }
          }
        } catch (ipErr) {
          console.warn('Server-side IP location resolution failed:', ipErr);
        }
      }

      const created = await prisma.attendance.create({
        data: {
          userId: requester.id,
          clockIn: now,
          status,
          date: todayStr,
          location: finalLocation || 'Location Blocked/Unavailable'
        }
      });

      await prisma.auditLog.create({
        data: {
          action: `Clocked in (${status})`,
          performedByName: requester.name,
          performedByRole: requester.role
        }
      });

      return NextResponse.json({ message: 'Clocked in successfully', log: created });
    }
  } catch (error) {
    console.error('Attendance POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
