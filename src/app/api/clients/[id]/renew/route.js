import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { getPlanDurationDays } from '@/lib/planUtils';

const parseDbDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const monthName = parts[1];
    const year = parseInt(parts[2]);
    const months = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const month = months[monthName.toLowerCase()];
    if (month !== undefined && !isNaN(day) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

const formatDateToDb = (date) => {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
};

const getMonthYearStr = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[1]}-${parts[2]}`;
    }
  }
  return '';
};

// Parse counts from client requirement text (e.g. "Daily Activity: 5 Creatives, 3 Reels, 2 Ai Videos" or "Meta Ads, Creative - 5, AI Video - 2, Reels/Shorts - 3")
const parseRequirementCounts = (reqStr) => {
  let c = 5, r = 3, a = 2; // defaults
  if (!reqStr) return { c, r, a };
  
  const cMatch = reqStr.match(/Creative\s*-\s*(\d+)/i) || reqStr.match(/(\d+)\s*Creative/i);
  const rMatch = reqStr.match(/Reel[s\/Shorts]*\s*-\s*(\d+)/i) || reqStr.match(/(\d+)\s*Reel/i);
  const aMatch = reqStr.match(/AI\s*Video[s]?\s*-\s*(\d+)/i) || reqStr.match(/(\d+)\s*AI\s*Video/i);
  
  if (cMatch) c = parseInt(cMatch[1]);
  if (rMatch) r = parseInt(rMatch[1]);
  if (aMatch) a = parseInt(aMatch[1]);
  
  return { c, r, a };
};

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // 1. Calculate new cycle start date using plan duration (30, 90, 180, 365 days)
    const today = new Date();
    const currentStart = parseDbDate(client.joiningDate);
    let newStart = new Date(today);
    const planDuration = getPlanDurationDays(client.packageName, client.requirement, client.services);

    if (currentStart) {
      const currentExpiry = new Date(currentStart);
      currentExpiry.setDate(currentExpiry.getDate() + planDuration);
      
      // If previous plan is still active, start new plan the day after expiry
      if (currentExpiry >= today) {
        newStart = new Date(currentExpiry);
        newStart.setDate(newStart.getDate() + 1);
      }
    }

    const newStartStr = formatDateToDb(newStart);

    // 1b. Clean up incomplete future tasks from the old cycle to avoid overlap
    const existingTasks = await prisma.clientTask.findMany({
      where: { clientId: client.clientId }
    });

    const tasksToDelete = existingTasks.filter(t => {
      const taskDate = parseDbDate(t.date);
      if (!taskDate) return false;
      if (t.status === 'Completed' || t.status === 'DONE' || t.status === 'Done') {
        return false;
      }
      return taskDate >= newStart;
    });

    if (tasksToDelete.length > 0) {
      await prisma.clientTask.deleteMany({
        where: {
          id: { in: tasksToDelete.map(t => t.id) }
        }
      });
    }

    // 2. Parse counts of creatives, reels, ai videos
    const { c: cCount, r: rCount, a: aCount } = parseRequirementCounts(client.requirement);

    // 3. Resolve active employees for round-robin assignment
    const activeEmployees = await prisma.user.findMany({
      where: {
        role: { in: ['EMPLOYEE', 'TL'] },
        status: 'ACTIVE'
      },
      orderBy: { id: 'asc' }
    });

    const rotationIndex = {};
    const createdTasks = [];

    const getFormattedDate = (offsetDays) => {
      const d = new Date(newStart);
      if (d.getDay() === 0) {
        d.setDate(d.getDate() + 1);
      }
      
      let count = 0;
      while (count < offsetDays) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0) {
          count++;
        }
      }
      
      if (d.getDay() === 0) {
        d.setDate(d.getDate() + 1);
      }
      
      return formatDateToDb(d);
    };

    const getOrdinal = (n) => {
      const s = ["th", "st", "nd", "rd"], v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    // Build the tasks list to generate (Excludes Onboarding Setup Tasks!)
    const tasksToCreate = [];

    const resolveStaff = (dept) => {
      // Find staff in this department or designation
      const deptEmployees = activeEmployees.filter(e => {
        const userRole = ((e.department || '') + ' ' + (e.designation || '')).toLowerCase();
        const target = (dept || '').toLowerCase();
        if (target.includes('graphic')) return userRole.includes('graphic');
        if (target.includes('video editor')) return userRole.includes('video editor') && !userRole.includes('ai');
        if (target.includes('ai video lead')) return userRole.includes('ai video lead');
        if (target.includes('ai video editor') || target.includes('ai video')) return userRole.includes('ai video');
        if (target.includes('digital marketing') || target.includes('social media')) return userRole.includes('marketing') || userRole.includes('social') || userRole.includes('digital');
        return userRole.includes(target) || target.includes((e.department || '').toLowerCase());
      });
      return deptEmployees.length > 0 ? deptEmployees : null;
    };

    const smStaffList = resolveStaff('Digital Marketing Executive');
    const smStaffName = smStaffList ? smStaffList[0].name : '';

    if (client.services === 'AI Video Plans') {
      const count = aCount || 5;
      for (let i = 1; i <= count; i++) {
        const base = 1 + (i - 1) * 4;

        tasksToCreate.push({
          taskTitle: `AI Video ${i}`,
          assignTo: 'Ai Video Editor',
          postType: 'AI Video',
          offset: base + 1
        });
      }
    } else {
      // Standard plans: create Graphic, Reel, AI Video, Weekly Reports
      // Excludes Setup/Onboarding tasks!
      const items = [];
      for (let i = 1; i <= cCount; i++) items.push({ title: `Graphic ${i}`, category: 'Graphic', num: i, assignTo: 'Graphic Designer', type: 'Graphic' });
      for (let i = 1; i <= rCount; i++) items.push({ title: `Reel ${i}`, category: 'Reels', num: i, assignTo: 'Video Editor', type: 'Reel' });
      for (let i = 1; i <= aCount; i++) items.push({ title: `AI Video ${i}`, category: 'AI Videos', num: i, assignTo: 'Ai Video Editor', type: 'AI Video' });

      // Rotate/balance items distribution
      const pools = {
        'Graphic': items.filter(x => x.category === 'Graphic'),
        'Reels': items.filter(x => x.category === 'Reels'),
        'AI Videos': items.filter(x => x.category === 'AI Videos')
      };

      const balanced = [];
      while (pools['Graphic'].length || pools['Reels'].length || pools['AI Videos'].length) {
        ['Graphic', 'Reels', 'Graphic', 'AI Videos'].forEach(k => {
          if (pools[k].length) balanced.push(pools[k].shift());
        });
      }

      const pkgLower = (client.packageName || '').toLowerCase();
      let contentDays = 21; // 1-month plan content completion target = 21 days
      let reportWeeks = 4;
      if (pkgLower.includes('3-month') || pkgLower.includes('3 month') || pkgLower.includes('3m')) {
        contentDays = 61; // 3-month plan content completion target = 61 days
        reportWeeks = 12;
      } else if (pkgLower.includes('6-month') || pkgLower.includes('6 month') || pkgLower.includes('6m')) {
        contentDays = 122; // 6-month plan content completion target = 122 days
        reportWeeks = 24;
      } else if (pkgLower.includes('yearly') || pkgLower.includes('1-year') || pkgLower.includes('annual')) {
        contentDays = 244; // 1-year plan content completion target = 244 days
        reportWeeks = 52;
      }

      const totalDeliverables = balanced.length;
      const stepDays = totalDeliverables > 0 ? Math.max(1, Math.floor(contentDays / totalDeliverables)) : 1;

      balanced.forEach((item, index) => {
        const offset = index * stepDays;
        if (item.type === 'AI Video') {

          tasksToCreate.push({
            taskTitle: item.title,
            assignTo: item.assignTo,
            postType: item.type,
            offset: offset + 1
          });
          tasksToCreate.push({
            taskTitle: `Post ${item.title}`,
            assignTo: 'Digital Marketing Executive',
            postType: 'Posting',
            offset: offset + 2
          });
        } else {
          tasksToCreate.push({
            taskTitle: item.title,
            assignTo: item.assignTo,
            postType: item.type,
            offset: offset
          });
          tasksToCreate.push({
            taskTitle: `Post ${item.title}`,
            assignTo: 'Digital Marketing Executive',
            postType: 'Posting',
            offset: offset + 1
          });
        }
      });

      // Weekly Reports
      const reportOffsets = Array.from({ length: reportWeeks }, (_, i) => (i + 1) * 7);
      reportOffsets.forEach((offset, index) => {
        tasksToCreate.push({
          taskTitle: `Weekly Report ${index + 1}`,
          assignTo: 'Digital Marketing Executive',
          postType: 'Report',
          offset: offset
        });
      });
    }

    // Create and auto-assign tasks
    const employeeCounters = {};
    for (let i = 0; i < tasksToCreate.length; i++) {
      const task = tasksToCreate[i];
      let assignedEmployeeName = '';

      const dept = task.assignTo;
      const deptEmployees = resolveStaff(dept) || activeEmployees.filter(e => e.department === dept);

      if (dept === 'Ai Video Editor' || dept === 'AI Video Editor') {
        const teamUsers = activeEmployees.filter(e => {
          const userRole = ((e.department || '') + ' ' + (e.designation || '')).toLowerCase();
          return userRole.includes('ai video') && !userRole.includes('lead');
        });

        if (teamUsers.length > 0) {
          const match = (client.clientId || '').match(/\d+/);
          const num = match ? parseInt(match[0], 10) : 1;
          const idx = Math.abs(num - 1) % teamUsers.length;
          assignedEmployeeName = teamUsers[idx].name;
        }
      } else if (deptEmployees && deptEmployees.length > 0) {
        const taskDate = getFormattedDate(task.offset);
        const monthYear = getMonthYearStr(taskDate);

        if (rotationIndex[dept] === undefined) {
          rotationIndex[dept] = 0;
        }

        let attempts = 0;
        let found = false;
        const candidateCounts = [];

        while (attempts < deptEmployees.length) {
          const emp = deptEmployees[rotationIndex[dept]];
          
          const count = await prisma.clientTask.count({
            where: {
              workingOn: emp.name,
              date: {
                endsWith: monthYear ? `-${monthYear}` : ''
              }
            }
          });

          candidateCounts.push({ emp, count });
          rotationIndex[dept] = (rotationIndex[dept] + 1) % deptEmployees.length;
          attempts++;

          if (count < 100) {
            assignedEmployeeName = emp.name;
            found = true;
            break;
          }
        }

        if (!found && candidateCounts.length > 0) {
          candidateCounts.sort((a, b) => a.count - b.count);
          assignedEmployeeName = candidateCounts[0].emp.name;
        }
      }

      const uniqueSuffix = `${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const taskId = `AID-T-${uniqueSuffix}-${i}`;

      let finalTitle = task.taskTitle;

      try {
        const created = await prisma.clientTask.create({
          data: {
            taskId: taskId,
            clientId: client.clientId,
            businessName: client.businessName,
            taskTitle: finalTitle,
            date: getFormattedDate(task.offset),
            assignTo: task.assignTo,
            workingOn: assignedEmployeeName,
            status: assignedEmployeeName ? 'Assigned' : 'Not Started',
            priority: 'Normal',
            postType: task.postType || ''
          }
        });
        createdTasks.push(created);
      } catch (insertErr) {
        console.error(`Failed to insert renewal task ${taskId}:`, insertErr);
      }
    }

    // 4. Update client's joining date
    await prisma.client.update({
      where: { id },
      data: { joiningDate: newStartStr }
    });

    // 5. Create Audit Log
    const newExpiry = new Date(newStart);
    newExpiry.setDate(newExpiry.getDate() + planDuration);
    const newExpiryStr = formatDateToDb(newExpiry);

    await prisma.auditLog.create({
      data: {
        action: `Renewed plan for client: ${client.businessName} (New ${planDuration}-day cycle: ${newStartStr} to ${newExpiryStr})`,
        performedByName: requester.name,
        performedByRole: requester.role
      }
    });

    return NextResponse.json({ 
      success: true, 
      newJoiningDate: newStartStr,
      newExpiryDate: newExpiryStr,
      taskCount: createdTasks.length 
    });

  } catch (error) {
    console.error('Error renewing client plan:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
