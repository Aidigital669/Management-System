// src/lib/planUtils.js
// Centralized, robust plan duration, expiry, renewal, and month-wise active status utilities

export const parseDbDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    if (isNaN(dateStr.getTime())) return null;
    return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate());
  }
  if (typeof dateStr !== 'string') return null;

  const cleanStr = dateStr.trim();
  if (!cleanStr) return null;

  // 1. Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(cleanStr)) {
    const [yyyy, mm, dd] = cleanStr.slice(0, 10).split('-').map(Number);
    return new Date(yyyy, mm - 1, dd);
  }

  // 2. Format: DD-MMM-YYYY or DD-MM-YYYY or DD/MM/YYYY or DD Mon YYYY
  const parts = cleanStr.split(/[\/\-\s]+/);
  if (parts.length === 3) {
    const months = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11
    };

    const [p0, p1, p2] = parts;
    const p1Lower = p1.toLowerCase();
    let m = months[p1Lower] !== undefined ? months[p1Lower] : months[p1Lower.slice(0, 3)];

    // If month was not found by name, check numeric month
    if (m === undefined && !isNaN(parseInt(p1, 10))) {
      m = parseInt(p1, 10) - 1;
    }

    const n0 = parseInt(p0, 10);
    const n2 = parseInt(p2, 10);

    if (m !== undefined && !isNaN(n0) && !isNaN(n2)) {
      if (n0 > 1000) {
        // YYYY-MM-DD
        return new Date(n0, m, n2);
      }
      // DD-MM-YYYY
      const yyyy = n2 < 100 ? (2000 + n2) : n2;
      return new Date(yyyy, m, n0);
    }
  }

  // 3. Fallback standard JavaScript Date parser
  const d = new Date(cleanStr);
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const formatDateToDb = (date) => {
  if (!date) return 'N/A';
  const d = parseDbDate(date);
  if (!d) return typeof date === 'string' ? date : 'N/A';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
};

export const getPlanDurationDays = (packageName = '', requirement = '', services = '') => {
  const combined = `${packageName} ${requirement} ${services}`.toLowerCase();

  if (/yearly|annual|12[\s-]*month|1[\s-]*year|365[\s-]*day|maintenance for 1 year/i.test(combined)) {
    return 365;
  }
  if (/6[\s-]*month|6\s*month|half[\s-]*yearly|180[\s-]*day|\b6m\b/i.test(combined)) {
    return 180;
  }
  if (/3[\s-]*month|3\s*month|quarterly|90[\s-]*day|\b3m\b/i.test(combined)) {
    return 90;
  }
  // Default to 1-Month (30 days)
  return 30;
};

export const getPlanDurationLabel = (packageName = '', requirement = '', services = '') => {
  const days = getPlanDurationDays(packageName, requirement, services);
  if (days === 365) return '1-Year (Annual)';
  if (days === 180) return '6-Month Plan';
  if (days === 90) return '3-Month Plan';
  return '1-Month Plan';
};

export const getClientMonthKey = (client) => {
  if (!client) return null;
  const d = parseDbDate(client.joiningDate || client.createdAt);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const getClientPlanInfo = (client, referenceDate = new Date()) => {
  if (!client) {
    return {
      status: 'Unknown',
      durationDays: 30,
      durationLabel: '1-Month Plan',
      cycleStart: null,
      cycleStartStr: 'N/A',
      expiryDate: null,
      expiryDateStr: 'N/A',
      renewalDueDate: null,
      renewalDueStr: 'N/A',
      cycleMonthKey: '',
      renewalMonthKey: '',
      cycleMonthLabel: 'Unknown',
      renewalMonthLabel: 'Unknown',
      daysLeft: 0,
      daysPassed: 0,
      overdueDays: 0,
      expiringSoonDays: 0,
      displayText: 'Unknown',
      isRenewed: false,
      packageName: 'Standard Plan'
    };
  }

  const start = parseDbDate(client.joiningDate || client.createdAt);
  const durationDays = getPlanDurationDays(client.packageName, client.requirement, client.services);
  const durationLabel = getPlanDurationLabel(client.packageName, client.requirement, client.services);

  if (!start) {
    return {
      status: 'Unknown',
      durationDays,
      durationLabel,
      cycleStart: null,
      cycleStartStr: client.joiningDate || 'N/A',
      expiryDate: null,
      expiryDateStr: 'N/A',
      renewalDueDate: null,
      renewalDueStr: 'N/A',
      cycleMonthKey: '',
      renewalMonthKey: '',
      cycleMonthLabel: 'Unknown',
      renewalMonthLabel: 'Unknown',
      daysLeft: 0,
      daysPassed: 0,
      overdueDays: 0,
      expiringSoonDays: 0,
      displayText: 'Unknown',
      isRenewed: false,
      packageName: client.packageName || 'Standard Plan'
    };
  }

  // Exact expiry calculation using plan duration (30, 90, 180, 365 days)
  const expiry = new Date(start);
  expiry.setDate(expiry.getDate() + durationDays);

  // Renewal starts the next day after expiry
  const renewalDue = new Date(expiry);
  renewalDue.setDate(renewalDue.getDate() + 1);

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  renewalDue.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const daysPassed = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  const cycleStartStr = formatDateToDb(start);
  const expiryDateStr = formatDateToDb(expiry);
  const renewalDueStr = formatDateToDb(renewalDue);

  const cycleMonthKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
  const renewalMonthKey = `${expiry.getFullYear()}-${String(expiry.getMonth() + 1).padStart(2, '0')}`;

  const cycleMonthLabel = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const renewalMonthLabel = expiry.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Detect renewal
  let isRenewed = false;
  try {
    if (client.notes && client.notes.toLowerCase().includes('renew')) isRenewed = true;
    if (client.notes && client.notes.trim().startsWith('{')) {
      const parsed = JSON.parse(client.notes);
      if (parsed.isRenewed || parsed.renewalCycle) isRenewed = true;
    }
  } catch (e) {}

  if (client.createdAt) {
    const cd = new Date(client.createdAt);
    if (!isNaN(cd.getTime())) {
      const createdMonth = `${cd.getFullYear()}-${String(cd.getMonth() + 1).padStart(2, '0')}`;
      if (createdMonth !== cycleMonthKey) {
        isRenewed = true;
      }
    }
  }

  let status = 'Active';
  let overdueDays = 0;
  let expiringSoonDays = 0;
  let displayText = 'Active';

  if (diffDays <= 0) {
    status = 'Expired';
    overdueDays = Math.abs(diffDays) + 1;
    displayText = `Overdue (${overdueDays}d)`;
  } else if (diffDays <= 7) {
    status = 'Expiring Soon';
    expiringSoonDays = 7 - diffDays;
    displayText = `Expiring Soon (${diffDays}d left)`;
  } else {
    status = 'Active';
    displayText = `Active (${diffDays}d left)`;
  }

  return {
    status,
    durationDays,
    durationLabel,
    cycleStart: start,
    cycleStartStr,
    expiryDate: expiry,
    expiryDateStr,
    isExpired: status === 'Expired',
    isExpiringSoon: status === 'Expiring Soon',
    renewalDueDate: renewalDue,
    renewalDueStr,
    renewalDueDateStr: renewalDueStr,
    cycleMonthKey,
    renewalMonthKey,
    cycleMonthLabel,
    renewalMonthLabel,
    daysLeft: diffDays,
    daysPassed,
    overdueDays,
    expiringSoonDays,
    displayText,
    isRenewed,
    packageName: client.packageName || 'Standard Plan'
  };
};

/**
 * Checks whether a client is currently active:
 * 1. client.active is true
 * 2. Their package has NOT expired (status !== 'Expired')
 * After renewal, joiningDate is updated and they count as active until the new expiry date.
 */
export const isClientPlanActive = (client, referenceDate = new Date()) => {
  if (!client || client.active === false) return false;
  const info = getClientPlanInfo(client, referenceDate);
  return info.status !== 'Expired';
};

/**
 * Determines whether a client has an active subscription during the specified month or date range.
 * A client is active during month M if:
 * 1. client.active !== false
 * 2. cycleStart <= monthEnd AND expiryDate >= monthStart
 * (or within the custom date range).
 */
export const isClientActiveInMonth = (client, monthKey, customStart = null, customEnd = null) => {
  if (!client || client.active === false) return false;

  const info = getClientPlanInfo(client);
  if (!info.cycleStart || !info.expiryDate) return false;

  const cStart = info.cycleStart.getTime();
  const cExpiry = info.expiryDate.getTime();

  // Custom date range check
  if (customStart || customEnd) {
    const rStart = customStart ? parseDbDate(customStart) : null;
    const rEnd = customEnd ? parseDbDate(customEnd) : null;

    if (rStart && cExpiry < rStart.getTime()) return false;
    if (rEnd && cStart > rEnd.getTime()) return false;
    return true;
  }

  if (!monthKey || monthKey === 'all') {
    // Only count as active if their current plan cycle has not expired
    return info.status !== 'Expired';
  }

  const parts = monthKey.split('-');
  if (parts.length !== 2) return true;

  const yyyy = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10);

  const monthStart = new Date(yyyy, mm - 1, 1, 0, 0, 0, 0).getTime();
  const lastDay = new Date(yyyy, mm, 0).getDate();
  const monthEnd = new Date(yyyy, mm - 1, lastDay, 23, 59, 59, 999).getTime();

  // Plan overlaps month: Started on or before monthEnd, and expires on or after monthStart
  return cStart <= monthEnd && cExpiry >= monthStart;
};

/**
 * Checks whether client's plan expires (renewal is due) in the specified month
 */
export const isClientExpiringInMonth = (client, monthKey, customStart = null, customEnd = null) => {
  if (!client || client.active === false) return false;

  const info = getClientPlanInfo(client);
  if (!info.expiryDate) return false;

  const cExpiry = info.expiryDate.getTime();

  if (customStart || customEnd) {
    const rStart = customStart ? parseDbDate(customStart) : null;
    const rEnd = customEnd ? parseDbDate(customEnd) : null;
    if (rStart && cExpiry < rStart.getTime()) return false;
    if (rEnd && cExpiry > rEnd.getTime()) return false;
    return true;
  }

  if (!monthKey || monthKey === 'all') return true;

  return info.renewalMonthKey === monthKey;
};

/**
 * Checks whether client's cycle started in the specified month
 */
export const isClientStartingInMonth = (client, monthKey, customStart = null, customEnd = null) => {
  if (!client || client.active === false) return false;

  const info = getClientPlanInfo(client);
  if (!info.cycleStart) return false;

  const cStart = info.cycleStart.getTime();

  if (customStart || customEnd) {
    const rStart = customStart ? parseDbDate(customStart) : null;
    const rEnd = customEnd ? parseDbDate(customEnd) : null;
    if (rStart && cStart < rStart.getTime()) return false;
    if (rEnd && cStart > rEnd.getTime()) return false;
    return true;
  }

  if (!monthKey || monthKey === 'all') return true;

  return info.cycleMonthKey === monthKey;
};

/**
 * Helper to determine revenue stream type (NewPurchase vs Renewal vs ActiveRetainer)
 */
export const getClientRevenueStream = (client, selectedMonth = 'all') => {
  if (!client || !client.active) return { type: 'Inactive', label: 'Inactive', badge: 'Inactive' };

  const info = getClientPlanInfo(client);

  if (info.isRenewed) {
    return { type: 'Renewal', label: 'Plan Renewed', badge: '🔄 Renewed' };
  }

  let createdMonth = null;
  if (client.createdAt) {
    const cd = new Date(client.createdAt);
    if (!isNaN(cd.getTime())) createdMonth = `${cd.getFullYear()}-${String(cd.getMonth() + 1).padStart(2, '0')}`;
  }

  if (createdMonth && (selectedMonth === 'all' || createdMonth === selectedMonth)) {
    return { type: 'NewPurchase', label: 'New Purchase', badge: '🛒 New Plan' };
  }

  return { type: 'ActiveRetainer', label: 'Active Retainer', badge: '💼 Retainer' };
};

// Dedicated Social Media / Digital Marketing Executives in the agency
export const VALID_SM_EXECUTIVES = ['preet', 'pujan'];

export const isSocialMediaExecutive = (name) => {
  if (!name || typeof name !== 'string') return false;
  const nameLower = name.trim().toLowerCase();
  return VALID_SM_EXECUTIVES.some(sm => nameLower.includes(sm));
};

/**
 * Helper to determine the dedicated Social Media Executive for a client/company.
 * Strictly limited to actual Social Media / Digital Marketing Executives (Preet & Pujan).
 * Video Editors (e.g. Masoom, Nouman) will NEVER be recognized as Social Media Executives.
 */
export const getClientSmExecutive = (client, tasks = [], deliveries = []) => {
  if (!client) return '';

  const clientId = client.clientId;

  // 1. Check client notes for explicitly assigned staff
  if (client.notes) {
    try {
      const parsed = JSON.parse(client.notes);
      const smCandidate = parsed.staffAssignments?.sm || parsed.sm;
      if (isSocialMediaExecutive(smCandidate)) {
        return smCandidate;
      }
    } catch (e) {
      // not json
    }
  }

  // 2. Check client tasks assigned to an actual SM Executive (Preet or Pujan)
  if (Array.isArray(tasks) && tasks.length > 0) {
    const clientTasks = tasks.filter(t => t.clientId === clientId);

    // Priority A: tasks for Reports, Access Collection, Onboarding, Page Setup, or Ads Run
    const reportTask = clientTasks.find(t => 
      isSocialMediaExecutive(t.workingOn) &&
      (
        (t.postType && (
          t.postType.toLowerCase().includes('report') || 
          t.postType.toLowerCase().includes('onboarding') || 
          t.postType.toLowerCase().includes('access') || 
          t.postType.toLowerCase().includes('setup') || 
          t.postType.toLowerCase().includes('ads')
        )) ||
        (t.taskTitle && (
          t.taskTitle.toLowerCase().includes('report') || 
          t.taskTitle.toLowerCase().includes('access') || 
          t.taskTitle.toLowerCase().includes('page') || 
          t.taskTitle.toLowerCase().includes('ads run') || 
          t.taskTitle.toLowerCase().includes('calendar')
        )) ||
        (t.assignTo && (
          t.assignTo.toLowerCase().includes('social media') || 
          t.assignTo.toLowerCase().includes('digital marketing')
        ))
      )
    );
    if (reportTask?.workingOn) return reportTask.workingOn;

    // Priority B: any task assigned to Preet or Pujan on this client account
    const smTask = clientTasks.find(t => isSocialMediaExecutive(t.workingOn));
    if (smTask?.workingOn) return smTask.workingOn;
  }

  // 3. Check client deliveries assigned to Preet or Pujan
  if (Array.isArray(deliveries) && deliveries.length > 0) {
    const clientDels = deliveries.filter(d => d.clientId === clientId);
    const smDel = clientDels.find(d => isSocialMediaExecutive(d.workingOn));
    if (smDel?.workingOn) return smDel.workingOn;
  }

  return '';
};

