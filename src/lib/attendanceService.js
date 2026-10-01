import { prisma } from './db.js';

/**
 * Returns the current date and time components in Indian Standard Time (IST).
 */
export function getISTDateTime(dateObj = new Date()) {
  const istDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(dateObj); // YYYY-MM-DD

  const istTimeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(dateObj); // HH:mm:ss

  const [hour, minute, second] = istTimeStr.split(':').map(Number);

  return {
    dateStr: istDateStr,
    timeStr: istTimeStr,
    hour,
    minute,
    second
  };
}

/**
 * Automatically clocks out any unclosed attendance sessions whose shift has ended:
 * 1. Any attendance from past dates (date < today in IST) that never clocked out.
 * 2. Any attendance from today (date == today in IST) if the current IST time is 6:30 PM (18:30) or later.
 * 
 * In both cases, the clockOut time is set to 6:30 PM (18:30:00 IST) of that attendance date.
 */
export async function autoCloseExpiredAttendance() {
  try {
    const { dateStr: todayIST, hour: currentHour, minute: currentMinute } = getISTDateTime();
    const isPast630Today = currentHour > 18 || (currentHour === 18 && currentMinute >= 30);

    // Find all attendance records with no clockOut
    const unclosedRecords = await prisma.attendance.findMany({
      where: {
        clockOut: null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    if (!unclosedRecords || unclosedRecords.length === 0) {
      return { closedCount: 0, closedIds: [] };
    }

    const recordsToClose = [];

    for (const record of unclosedRecords) {
      const recDate = record.date; // Format: 'YYYY-MM-DD'
      
      // Case 1: Past date (recDate < todayIST)
      // Case 2: Today (recDate === todayIST) AND it is already 6:30 PM or later
      if (recDate < todayIST || (recDate === todayIST && isPast630Today)) {
        recordsToClose.push(record);
      }
    }

    if (recordsToClose.length === 0) {
      return { closedCount: 0, closedIds: [] };
    }

    const closedIds = [];

    for (const record of recordsToClose) {
      // Calculate 6:30 PM IST (18:30:00+05:30) for this attendance record's date
      const autoClockOutTime = new Date(`${record.date}T18:30:00+05:30`);
      
      // Ensure clockOut is never before clockIn (if someone clocked in after 18:30, use clockIn + 1 hour or record.clockIn)
      let finalClockOut = autoClockOutTime;
      if (record.clockIn && new Date(record.clockIn) > autoClockOutTime) {
        finalClockOut = new Date(new Date(record.clockIn).getTime() + 60 * 60 * 1000);
      }

      await prisma.attendance.update({
        where: { id: record.id },
        data: {
          clockOut: finalClockOut
        }
      });

      // Audit log entry for tracking
      try {
        await prisma.auditLog.create({
          data: {
            action: `Auto clocked out at 6:30 PM shift end (Date: ${record.date})`,
            performedByName: record.user?.name || 'System Auto-Shift',
            performedByRole: record.user?.role || 'SYSTEM'
          }
        });
      } catch (auditErr) {
        // Non-blocking
      }

      closedIds.push(record.id);
    }

    console.log(`[Attendance Auto-Logout] Successfully auto-closed ${closedIds.length} expired session(s) at 6:30 PM shift end.`);
    return { closedCount: closedIds.length, closedIds };
  } catch (error) {
    console.error('[Attendance Auto-Logout] Error auto-closing expired attendance:', error);
    return { closedCount: 0, closedIds: [], error: error.message };
  }
}
