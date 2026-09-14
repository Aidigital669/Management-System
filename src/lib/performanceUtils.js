// Helper utilities for calculating and analyzing Employee Performance

export const ROLE_CATEGORIES = {
  ALL: 'all',
  AI_VIDEO: 'ai_video',
  GRAPHICS: 'graphics',
  SOCIAL_MEDIA: 'social_media',
  SALES: 'sales',
  OTHER: 'other'
};

export const ROLE_LABELS = {
  [ROLE_CATEGORIES.ALL]: 'All Departments',
  [ROLE_CATEGORIES.AI_VIDEO]: 'AI Video Editors',
  [ROLE_CATEGORIES.GRAPHICS]: 'Graphic Designers',
  [ROLE_CATEGORIES.SOCIAL_MEDIA]: 'Social Media Executives',
  [ROLE_CATEGORIES.SALES]: 'Sales Team',
  [ROLE_CATEGORIES.OTHER]: 'Other Staff'
};

const NON_EMPLOYEE_NAMES = ['admin', 'ceo', 'manager', 'auto', 'unassigned', 'none', 'system'];

/**
 * Classify employee into standard department/role categories
 */
export function getEmployeeRoleCategory(employee) {
  if (!employee) return ROLE_CATEGORIES.OTHER;
  const name = (employee.name || '').trim().toLowerCase();
  const dept = (employee.department || '').trim().toLowerCase();
  const desig = (employee.designation || '').trim().toLowerCase();
  const role = (employee.role || '').trim().toUpperCase();

  if (role === 'SALES' || dept.includes('sales') || desig.includes('sales') || name.includes('jennifer')) {
    return ROLE_CATEGORIES.SALES;
  }

  // Social Media / Digital Marketing
  if (
    name === 'preet' || 
    name === 'pujan' || 
    dept.includes('social') || 
    dept.includes('digital market') || 
    desig.includes('social') || 
    desig.includes('digital market')
  ) {
    // Exclude video editors that might have broad depts
    if (name !== 'masoom' && name !== 'nouman' && name !== 'divyansh') {
      return ROLE_CATEGORIES.SOCIAL_MEDIA;
    }
  }

  // AI Video Editors
  if (
    name === 'masoom' || 
    name === 'nouman' || 
    name === 'divyansh' || 
    dept.includes('ai video') || 
    desig.includes('ai video') || 
    dept.includes('video') || 
    desig.includes('video')
  ) {
    return ROLE_CATEGORIES.AI_VIDEO;
  }

  // Graphic Designers
  if (
    name === 'danish' || 
    name.includes('danish khan') || 
    name === 'swapnil' || 
    name === 'sanmeet' || 
    dept.includes('graphic') || 
    desig.includes('graphic') || 
    dept.includes('design') || 
    desig.includes('design')
  ) {
    return ROLE_CATEGORIES.GRAPHICS;
  }

  return ROLE_CATEGORIES.OTHER;
}

/**
 * Filter items by date string according to timeRange
 */
export function isDateInTimeRange(dateStr, timeRange = 'this_month') {
  if (!dateStr) return true;
  if (timeRange === 'all_time') return true;

  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) return true;

  const now = new Date();
  if (timeRange === 'this_month') {
    return targetDate.getFullYear() === now.getFullYear() && targetDate.getMonth() === now.getMonth();
  }

  if (timeRange === 'last_month') {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return targetDate.getFullYear() === lastMonth.getFullYear() && targetDate.getMonth() === lastMonth.getMonth();
  }

  if (timeRange === 'last_30_days') {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return targetDate >= thirtyDaysAgo && targetDate <= now;
  }

  return true;
}

/**
 * Calculate multi-pillar performance metrics for all employees
 */
export function calculateEmployeePerformance({
  employees = [],
  clientTasks = [],
  clientDeliveries = [],
  internalTasks = [],
  attendanceLogs = [],
  feedbacks = [],
  timeRange = 'this_month'
}) {
  const todayStr = new Date().toISOString().split('T')[0];

  // Map employees
  const validEmployees = employees.filter(e => {
    const name = (e.name || '').trim().toLowerCase();
    return name && !NON_EMPLOYEE_NAMES.includes(name) && e.status !== 'INACTIVE';
  });

  const performanceList = validEmployees.map(emp => {
    const empName = emp.name.trim();
    const empNameLower = empName.toLowerCase();
    const empIdStr = emp.id ? emp.id.toString() : '';
    const roleCategory = getEmployeeRoleCategory(emp);

    // 1. Gather all ClientTasks for this employee
    const assignedClientTasks = clientTasks.filter(t => {
      const workingOn = (t.workingOn || '').trim().toLowerCase();
      const assignTo = (t.assignTo || '').trim().toLowerCase();
      const matches = workingOn === empNameLower || assignTo === empNameLower || (empIdStr && assignTo === empIdStr);
      if (!matches) return false;
      return isDateInTimeRange(t.date || t.createdAt, timeRange);
    });

    // 2. Gather all ClientDeliveries for this employee
    const assignedDeliveries = clientDeliveries.filter(d => {
      const workingOn = (d.workingOn || '').trim().toLowerCase();
      if (workingOn !== empNameLower) return false;
      return isDateInTimeRange(d.postDate || d.createdAt, timeRange);
    });

    // 3. Gather Internal Tasks for this employee
    const assignedInternalTasks = internalTasks.filter(t => {
      const assignedId = t.assignedToId ? t.assignedToId.toString() : '';
      if (assignedId !== empIdStr) return false;
      return isDateInTimeRange(t.dueDate || t.createdAt, timeRange);
    });

    // Track detailed task stats
    let completedOnTime = 0;
    let completedLate = 0;
    let overdueCount = 0;
    let inProgressCount = 0;
    let totalAssigned = 0;
    const clientIdsWorkedOn = new Set();
    const overdueTasksList = [];
    const completedTasksList = [];
    const allTasksList = [];

    // Process Client Tasks
    assignedClientTasks.forEach(t => {
      totalAssigned += 1;
      if (t.clientId) clientIdsWorkedOn.add(t.clientId);
      const isCompleted = t.status === 'DONE' || t.status === 'Completed' || t.status === 'Complete Task';
      const isOverdue = t.status === 'Overdue' || (!isCompleted && t.date && t.date < todayStr);
      const normalizedStatus = isCompleted ? 'Completed' : isOverdue ? 'Overdue' : (t.status || 'Working On It');

      const taskItem = {
        id: `ct-${t.id || t.taskId}`,
        taskId: t.taskId,
        title: t.taskTitle,
        client: t.businessName || t.clientId,
        clientId: t.clientId,
        date: t.date,
        type: 'Client Task',
        category: t.postType || t.service || 'Client Deliverable',
        priority: t.priority || 'Normal',
        status: normalizedStatus,
        rawStatus: t.status,
        workSampleUrl: t.workSampleUrl,
        notes: t.notes
      };

      allTasksList.push(taskItem);

      if (isCompleted) {
        let isLate = false;
        if (t.statusChangedAt && t.date) {
          const finishedDate = new Date(t.statusChangedAt).toISOString().split('T')[0];
          if (finishedDate > t.date) {
            isLate = true;
          }
        }
        if (isLate) {
          completedLate += 1;
        } else {
          completedOnTime += 1;
        }
        completedTasksList.push({
          title: t.taskTitle,
          client: t.businessName || t.clientId,
          date: t.date,
          status: 'Completed'
        });
      } else if (isOverdue) {
        overdueCount += 1;
        overdueTasksList.push({
          title: t.taskTitle,
          client: t.businessName || t.clientId,
          date: t.date,
          status: 'Overdue'
        });
      } else {
        inProgressCount += 1;
      }
    });

    // Process Deliveries (Reels, Posts, Banners)
    assignedDeliveries.forEach(d => {
      totalAssigned += 1;
      if (d.clientId) clientIdsWorkedOn.add(d.clientId);
      const isDelivered = d.status === 'Delivered' || d.status === 'Completed';
      const isOverdue = !isDelivered && d.postDate && d.postDate < todayStr;
      const normalizedStatus = isDelivered ? 'Completed' : isOverdue ? 'Overdue' : (d.status || 'Pending');

      const deliveryItem = {
        id: `cd-${d.id || d.deliveryId}`,
        taskId: d.deliveryId,
        title: `${d.postType || 'Delivery'} for ${d.clientName || d.clientId}`,
        client: d.clientName || d.clientId,
        clientId: d.clientId,
        date: d.postDate,
        type: 'Delivery',
        category: d.postType || 'Post / Reel',
        priority: 'Normal',
        status: normalizedStatus,
        rawStatus: d.status,
        notes: d.notes
      };

      allTasksList.push(deliveryItem);

      if (isDelivered) {
        completedOnTime += 1;
        completedTasksList.push({
          title: `${d.postType || 'Delivery'} for ${d.clientName || d.clientId}`,
          client: d.clientName || d.clientId,
          date: d.postDate,
          status: 'Delivered'
        });
      } else if (isOverdue) {
        overdueCount += 1;
        overdueTasksList.push({
          title: `${d.postType || 'Delivery'} for ${d.clientName || d.clientId}`,
          client: d.clientName || d.clientId,
          date: d.postDate,
          status: 'Overdue'
        });
      } else {
        inProgressCount += 1;
      }
    });

    // Process Internal Tasks
    assignedInternalTasks.forEach(t => {
      totalAssigned += 1;
      const isCompleted = t.status === 'DONE' || t.status === 'COMPLETED';
      const isOverdue = !isCompleted && t.dueDate && t.dueDate < todayStr;
      const normalizedStatus = isCompleted ? 'Completed' : isOverdue ? 'Overdue' : (t.status || 'In Progress');

      const internalItem = {
        id: `it-${t.id}`,
        taskId: `INT-${t.id}`,
        title: t.title,
        client: 'Internal Duties',
        clientId: 'INTERNAL',
        date: t.dueDate,
        type: 'Internal Task',
        category: 'Staff Assignment',
        priority: t.priority || 'Normal',
        status: normalizedStatus,
        rawStatus: t.status,
        workSampleUrl: t.workSampleUrl
      };

      allTasksList.push(internalItem);

      if (isCompleted) {
        completedOnTime += 1;
      } else if (isOverdue) {
        overdueCount += 1;
        overdueTasksList.push({
          title: t.title,
          client: 'Internal Task',
          date: t.dueDate,
          status: 'Overdue'
        });
      } else {
        inProgressCount += 1;
      }
    });

    const totalCompleted = completedOnTime + completedLate;

    // --- Pillar 1: On-Time Delivery Rate (Weight 40%) ---
    // High penalty for active overdue tasks
    let onTimeRate = 100;
    const evaluatedTimelinessCount = totalCompleted + overdueCount;
    if (evaluatedTimelinessCount > 0) {
      const baseOnTimePercent = (completedOnTime / evaluatedTimelinessCount) * 100;
      const overduePenalty = overdueCount * 5; // -5% per active overdue task
      onTimeRate = Math.max(0, Math.min(100, Math.round(baseOnTimePercent - overduePenalty)));
    } else {
      onTimeRate = totalAssigned > 0 ? 85 : 95;
    }

    // --- Pillar 2: Completion & Volume Output (Weight 30%) ---
    let completionRate = 0;
    if (totalAssigned > 0) {
      completionRate = Math.round((totalCompleted / totalAssigned) * 100);
    } else {
      completionRate = 80;
    }

    // --- Pillar 3: Attendance & Punctuality (Weight 15%) ---
    const userAttendance = attendanceLogs.filter(log => {
      const matchesUser = (emp.id && log.userId === emp.id) || (log.user?.name && log.user.name.toLowerCase() === empNameLower);
      if (!matchesUser) return false;
      return isDateInTimeRange(log.date || log.createdAt, timeRange);
    });

    let attendanceScore = 90; // Default baseline if not tracked yet
    let presentDays = 0;
    let lateDays = 0;
    let halfDays = 0;

    if (userAttendance.length > 0) {
      userAttendance.forEach(log => {
        if (log.status === 'PRESENT') {
          presentDays += 1;
          if (log.clockIn) {
            const clockInHour = new Date(log.clockIn).getHours();
            const clockInMinute = new Date(log.clockIn).getMinutes();
            if (clockInHour > 10 || (clockInHour === 10 && clockInMinute > 15)) {
              lateDays += 1;
            }
          }
        } else if (log.status === 'HALF_DAY') {
          halfDays += 1;
        }
      });

      const effectivePresent = presentDays + halfDays * 0.5;
      const attendanceRatio = effectivePresent / Math.max(1, userAttendance.length);
      const punctualityPenalty = (lateDays / Math.max(1, presentDays)) * 15;
      attendanceScore = Math.max(40, Math.min(100, Math.round(attendanceRatio * 100 - punctualityPenalty)));
    }

    // --- Pillar 4: Quality & Client Feedback (Weight 15%) ---
    // Check feedback for clients handled by this employee
    let qualityScore = 95;
    let clientConcernsCount = 0;
    let totalRatingsSum = 0;
    let ratingsCount = 0;

    feedbacks.forEach(fb => {
      if (clientIdsWorkedOn.has(fb.clientId)) {
        if (fb.type === 'Concern') {
          clientConcernsCount += 1;
        }
        if (fb.rating) {
          totalRatingsSum += fb.rating;
          ratingsCount += 1;
        }
      }
    });

    if (ratingsCount > 0) {
      const avgRating = totalRatingsSum / ratingsCount; // 1 to 5
      qualityScore = Math.round((avgRating / 5) * 100);
    }
    // Deduct for active concerns
    qualityScore = Math.max(30, Math.min(100, qualityScore - (clientConcernsCount * 10)));

    // --- Composite 0-100 Score ---
    const compositeScore = Math.round(
      (onTimeRate * 0.40) +
      (completionRate * 0.30) +
      (attendanceScore * 0.15) +
      (qualityScore * 0.15)
    );

    // Determine Performance Tier
    let tier = {
      label: 'Star Performer',
      badge: '🌟 Star',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
      progressColor: 'bg-emerald-500'
    };

    if (compositeScore < 60) {
      tier = {
        label: 'At Risk / Critical',
        badge: '🔴 At Risk',
        badgeColor: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
        progressColor: 'bg-red-500'
      };
    } else if (compositeScore < 75) {
      tier = {
        label: 'Needs Improvement',
        badge: '🟡 Average',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
        progressColor: 'bg-amber-500'
      };
    } else if (compositeScore < 90) {
      tier = {
        label: 'High Performer',
        badge: '🟢 High',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
        progressColor: 'bg-blue-500'
      };
    }

    return {
      employee: emp,
      id: emp.id,
      name: empName,
      department: emp.department || 'General',
      designation: emp.designation || 'Specialist',
      avatar: emp.avatar,
      roleCategory,
      totalAssigned,
      completedCount: totalCompleted,
      completedOnTime,
      completedLate,
      overdueCount,
      inProgressCount,
      clientsCount: clientIdsWorkedOn.size,
      onTimeRate,
      completionRate,
      attendanceScore,
      qualityScore,
      compositeScore,
      tier,
      attendanceSummary: {
        totalLoggedDays: userAttendance.length,
        presentDays,
        halfDays,
        lateDays
      },
      overdueTasksList,
      completedTasksList,
      allTasksList
    };
  });

  // Sort descending by composite score, then by completed count
  performanceList.sort((a, b) => {
    if (b.compositeScore !== a.compositeScore) {
      return b.compositeScore - a.compositeScore;
    }
    return b.completedCount - a.completedCount;
  });

  // Assign ranks
  performanceList.forEach((item, index) => {
    item.rank = index + 1;
  });

  // Calculate team-wide summary
  const totalEmployeesEvaluated = performanceList.length;
  const teamAverageScore = totalEmployeesEvaluated > 0
    ? Math.round(performanceList.reduce((acc, curr) => acc + curr.compositeScore, 0) / totalEmployeesEvaluated)
    : 0;

  const teamOnTimeRate = totalEmployeesEvaluated > 0
    ? Math.round(performanceList.reduce((acc, curr) => acc + curr.onTimeRate, 0) / totalEmployeesEvaluated)
    : 0;

  const teamCompletionRate = totalEmployeesEvaluated > 0
    ? Math.round(performanceList.reduce((acc, curr) => acc + curr.completionRate, 0) / totalEmployeesEvaluated)
    : 0;

  const totalOverdueTasksAcrossTeam = performanceList.reduce((acc, curr) => acc + curr.overdueCount, 0);

  const topPerformer = performanceList.length > 0 ? performanceList[0] : null;

  return {
    employees: performanceList,
    summary: {
      totalEmployees: totalEmployeesEvaluated,
      teamAverageScore,
      teamOnTimeRate,
      teamCompletionRate,
      totalOverdueTasksAcrossTeam,
      topPerformer
    }
  };
}
