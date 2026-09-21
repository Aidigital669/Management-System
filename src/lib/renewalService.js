// src/lib/renewalService.js
// Centralized, robust client plan renewal service

import { prisma } from './db.js';
import { getPlanDurationDays, parseDbDate, formatDateToDb, getClientSmExecutive, isSocialMediaExecutive } from './planUtils.js';

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

export async function executeClientRenewal(clientDbId, requester = { name: 'Admin', role: 'ADMIN' }, options = {}) {
  const client = await prisma.client.findUnique({ where: { id: parseInt(clientDbId) } });
  if (!client) {
    throw new Error('Client not found');
  }

  // 1. Calculate new cycle start date using specified renewal date or plan duration (30, 90, 180, 365 days)
  const today = new Date();
  const currentStart = parseDbDate(client.joiningDate);
  const planDuration = getPlanDurationDays(client.packageName, client.requirement, client.services);
  let newStart = null;

  if (options && options.renewalDate) {
    const parsedCustom = parseDbDate(options.renewalDate);
    if (parsedCustom && !isNaN(parsedCustom.getTime())) {
      newStart = new Date(parsedCustom.getFullYear(), parsedCustom.getMonth(), parsedCustom.getDate());
    }
  }

  if (!newStart) {
    newStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (currentStart) {
      const currentExpiry = new Date(currentStart);
      currentExpiry.setDate(currentExpiry.getDate() + planDuration);
      // If previous plan is still active, start new plan the day after expiry
      if (currentExpiry >= today) {
        newStart = new Date(currentExpiry);
        newStart.setDate(newStart.getDate() + 1);
      }
    }
  }

  // Sunday Exclusion: If renewal start date falls on Sunday, advance to Monday
  if (newStart.getDay() === 0) {
    newStart.setDate(newStart.getDate() + 1);
  }

  const newStartStr = formatDateToDb(newStart);

  // 1b. Clean up incomplete future tasks from old cycle to avoid overlap
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

  // 1c. Reassign any existing pending/overdue tasks from inactive staff (Danish Khan, Divyansh, etc.)
  const chosenStaff = options.assignedStaff || {};
  const inactiveNames = ['Danish Khan', 'Danish', 'Divyansh', 'Swapnil', 'Sanmeet'];
  const defaultGraphic = chosenStaff.graphic || activeEmployees.find(e => ((e.department || '') + ' ' + (e.designation || '')).toLowerCase().includes('graphic'))?.name || 'Nouman';
  const defaultVideo = chosenStaff.video || 'Masoom';
  const defaultAiVideo = chosenStaff.aiVideo || 'Masoom';

  if (options.reassignInactiveTasks !== false) {
    try {
      // Reassign graphic tasks
      await prisma.clientTask.updateMany({
        where: {
          clientId: client.clientId,
          workingOn: { in: inactiveNames },
          OR: [
            { assignTo: { contains: 'Graphic', mode: 'insensitive' } },
            { postType: { contains: 'Graphic', mode: 'insensitive' } },
            { taskTitle: { contains: 'Graphic', mode: 'insensitive' } }
          ]
        },
        data: {
          workingOn: defaultGraphic,
          status: 'Assigned'
        }
      });

      // Reassign reel & video tasks
      await prisma.clientTask.updateMany({
        where: {
          clientId: client.clientId,
          workingOn: { in: inactiveNames },
          OR: [
            { assignTo: { in: ['Video Editor', 'Ai Video Editor'] } },
            { postType: { in: ['Reel', 'AI Video'] } },
            { taskTitle: { contains: 'Reel', mode: 'insensitive' } },
            { taskTitle: { contains: 'Video', mode: 'insensitive' } }
          ]
        },
        data: {
          workingOn: defaultVideo,
          status: 'Assigned'
        }
      });

      // Reassign any remaining tasks assigned to Danish/Divyansh for this client
      await prisma.clientTask.updateMany({
        where: {
          clientId: client.clientId,
          workingOn: { in: inactiveNames }
        },
        data: {
          workingOn: defaultVideo || defaultGraphic,
          status: 'Assigned'
        }
      });
    } catch (reassignErr) {
      console.warn('Error reassigning inactive tasks during renewal:', reassignErr);
    }
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

  const tasksToCreate = [];

  const resolveStaff = (dept) => {
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
    const items = [];
    for (let i = 1; i <= cCount; i++) items.push({ title: `Graphic ${i}`, category: 'Graphic', num: i, assignTo: 'Graphic Designer', type: 'Graphic' });
    for (let i = 1; i <= rCount; i++) items.push({ title: `Reel ${i}`, category: 'Reels', num: i, assignTo: 'Video Editor', type: 'Reel' });
    for (let i = 1; i <= aCount; i++) items.push({ title: `AI Video ${i}`, category: 'AI Videos', num: i, assignTo: 'Ai Video Editor', type: 'AI Video' });

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
    let contentDays = 21;
    let reportWeeks = 4;
    if (pkgLower.includes('3-month') || pkgLower.includes('3 month') || pkgLower.includes('3m')) {
      contentDays = 61;
      reportWeeks = 12;
    } else if (pkgLower.includes('6-month') || pkgLower.includes('6 month') || pkgLower.includes('6m')) {
      contentDays = 122;
      reportWeeks = 24;
    } else if (pkgLower.includes('yearly') || pkgLower.includes('1-year') || pkgLower.includes('annual')) {
      contentDays = 244;
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

  const dedicatedSmExec = chosenStaff.smExec || getClientSmExecutive(client, existingTasks) || 'Preet';

  // Create and auto-assign tasks
  for (let i = 0; i < tasksToCreate.length; i++) {
    const task = tasksToCreate[i];
    let assignedEmployeeName = '';

    const dept = task.assignTo;

    // Explicit Admin Staff Overrides (Ensures Danish & Divyansh are NEVER assigned)
    if (dept === 'Graphic Designer' || task.postType === 'Graphic') {
      if (chosenStaff.graphic) {
        assignedEmployeeName = chosenStaff.graphic;
      } else {
        const graphicStaff = resolveStaff('Graphic Designer');
        assignedEmployeeName = graphicStaff && graphicStaff.length > 0 ? graphicStaff[0].name : defaultGraphic;
      }
    } else if (dept === 'Video Editor' || task.postType === 'Reel') {
      if (chosenStaff.video) {
        assignedEmployeeName = chosenStaff.video;
      } else {
        const videoStaff = resolveStaff('Video Editor');
        assignedEmployeeName = videoStaff && videoStaff.length > 0 ? videoStaff[0].name : defaultVideo;
      }
    } else if (dept === 'Ai Video Editor' || task.postType === 'AI Video') {
      if (chosenStaff.aiVideo) {
        assignedEmployeeName = chosenStaff.aiVideo;
      } else {
        const aiStaff = activeEmployees.filter(e => {
          const userRole = ((e.department || '') + ' ' + (e.designation || '')).toLowerCase();
          return userRole.includes('ai video') && !userRole.includes('lead');
        });
        if (aiStaff.length > 0) {
          const match = (client.clientId || '').match(/\d+/);
          const num = match ? parseInt(match[0], 10) : 1;
          const idx = Math.abs(num - 1) % aiStaff.length;
          assignedEmployeeName = aiStaff[idx].name;
        } else {
          assignedEmployeeName = defaultAiVideo;
        }
      }
    } else if (dept === 'Digital Marketing Executive' || task.postType === 'Report' || task.postType === 'Posting') {
      assignedEmployeeName = dedicatedSmExec;
    } else {
      const deptEmployees = resolveStaff(dept) || activeEmployees.filter(e => e.department === dept);
      if (deptEmployees && deptEmployees.length > 0) {
        assignedEmployeeName = deptEmployees[0].name;
      } else {
        assignedEmployeeName = activeEmployees.length > 0 ? activeEmployees[0].name : '';
      }
    }

    const uniqueSuffix = `${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const taskId = `AID-T-${uniqueSuffix}-${i}`;

    try {
      const created = await prisma.clientTask.create({
        data: {
          taskId: taskId,
          clientId: client.clientId,
          businessName: client.businessName,
          taskTitle: task.taskTitle,
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

  // 4. Update client's joining date, reset extension days, mark renewal in notes, and activate
  let updatedNotes = client.notes || '';
  try {
    if (updatedNotes.trim().startsWith('{')) {
      const parsed = JSON.parse(updatedNotes);
      parsed.isRenewed = true;
      parsed.lastRenewedAt = new Date().toISOString();
      parsed.renewalDate = newStartStr;
      if (options && options.adminNote) {
        parsed.renewalNote = options.adminNote;
      }
      updatedNotes = JSON.stringify(parsed);
    } else {
      const noteAddition = options && options.adminNote ? ` [Plan Renewed: ${options.adminNote}]` : ' [Plan Renewed]';
      updatedNotes = updatedNotes ? `${updatedNotes}${noteAddition}` : noteAddition.trim();
    }
  } catch (e) {
    updatedNotes = `${updatedNotes} [Plan Renewed]`;
  }

  await prisma.client.update({
    where: { id: client.id },
    data: { 
      joiningDate: newStartStr,
      active: true,
      extensionDays: 0,
      extensionExpiryDate: null,
      notes: updatedNotes
    }
  });

  // 5. Create Audit Log
  const newExpiry = new Date(newStart);
  newExpiry.setDate(newExpiry.getDate() + planDuration);
  const newExpiryStr = formatDateToDb(newExpiry);

  await prisma.auditLog.create({
    data: {
      action: `Renewed plan for client: ${client.businessName} (New ${planDuration}-day cycle: ${newStartStr} to ${newExpiryStr})`,
      performedByName: requester.name || 'Admin',
      performedByRole: requester.role || 'ADMIN'
    }
  });

  return {
    success: true,
    newJoiningDate: newStartStr,
    newExpiryDate: newExpiryStr,
    taskCount: createdTasks.length
  };
}
