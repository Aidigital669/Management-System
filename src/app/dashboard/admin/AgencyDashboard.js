'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, DollarSign, FileText, CheckCircle, Clock, Truck, FileCheck, Target,
  ChevronDown, ChevronUp, BarChart2, AlertCircle, Layers, RefreshCw, AlertTriangle, TrendingUp, Tag,
  Award, Trophy, Star, Sparkles, ChevronRight
} from 'lucide-react';
import {
  parseDbDate,
  formatDateToDb,
  getPlanDurationDays,
  getPlanDurationLabel,
  getClientPlanInfo,
  isClientActiveInMonth,
  isClientContractInMonth,
  isClientExpiringInMonth,
  getClientRevenueStream,
  getClientMonthKey,
  isClientPlanActive
} from '@/lib/planUtils';
import { calculateEmployeePerformance } from '@/lib/performanceUtils';
import EmployeeTasksModal from './EmployeeTasksModal';

export default function AgencyDashboard({ deliveries = [], clients = [], tasks = [], employees = [], attendance = [], feedbacks = [], calls = [], onSelectTab, refreshData }) {
  const [selectedEmployeeForTasks, setSelectedEmployeeForTasks] = useState(null);
  const [internalCalls, setInternalCalls] = useState(calls || []);

  useEffect(() => {
    if (calls && calls.length > 0) {
      setInternalCalls(calls);
    } else {
      fetch('/api/calls')
        .then(r => r.json())
        .then(data => {
          if (data && Array.isArray(data.calls)) setInternalCalls(data.calls);
        })
        .catch(() => {});
    }
  }, [calls]);
  
  const activeClients = clients.filter(c => isClientPlanActive(c)).length;
  const totalClients = clients.length;
  
  // Calculate delivery stats from real data
  const deliveryCompleted = deliveries.filter(d => d.status === 'Delivered' || d.status === 'Completed').length;
  const deliveryPending = deliveries.filter(d => d.status !== 'Delivered' && d.status !== 'Completed').length;

  // Current month string (YYYY-MM) for month-based filtering
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  /**
   * Normalizes any date string to YYYY-MM-DD for comparison.
   * Handles two formats stored in DB:
   *   - ISO:       "2026-07-15"   (manually-added tasks via date input)
   *   - DD-Mon-YY: "15-Jul-2026"  (auto-generated tasks & deliveries from seed)
   */
  const parseToISO = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const clean = dateStr.trim();
    if (clean.toLowerCase().includes('trigger') || clean.toLowerCase().includes('approval')) return null;

    // ISO: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) return clean.slice(0, 10);

    // DD/MM/YYYY or DD-MM-YYYY or DD-Mon-YYYY or DD Mon YYYY
    const parts = clean.split(/[\/\-\s]+/);
    if (parts.length === 3) {
      const monthMap = { 
        jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06',
        jul:'07', aug:'08', sep:'09', sept:'09', oct:'10', nov:'11', dec:'12' 
      };
      const [p1, p2, p3] = parts;
      let yyyy = p3.length === 4 ? p3 : p1.length === 4 ? p1 : (p3.length === 2 ? '20' + p3 : '2026');
      const p2Clean = p2.toLowerCase();
      let mm = monthMap[p2Clean] || monthMap[p2Clean.slice(0, 3)] || p2.padStart(2, '0');
      let dd = p1.length === 4 ? p3.padStart(2, '0') : p1.padStart(2, '0');
      if (parseInt(mm, 10) > 12) {
        const tmp = mm;
        mm = dd;
        dd = tmp;
      }
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }

    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  };

  // Calculate task stats (all-time, used for yearly donut)
  const taskCompleted = tasks.filter(t => t.status === 'DONE' || t.status === 'Completed' || t.status === 'Complete Task').length;
  const taskPending = tasks.filter(t => t.status !== 'DONE' && t.status !== 'Completed' && t.status !== 'Complete Task').length;

  // --- DATASET 1: OVERALL/ALL-TIME ITEMS (Includes ALL employee tasks & deliverables) ---
  const overallTasks = tasks;
  const overallDeliveries = deliveries;

  const normalizedOverallTasks = overallTasks.map(t => ({
    ...t,
    _type: 'task',
    assignTo: (t.workingOn && t.workingOn.toLowerCase() !== 'auto' ? t.workingOn : (t.assignedTo?.name || t.assignTo || 'Unassigned Staff')).trim(),
  }));

  const normalizedOverallDeliveries = overallDeliveries.map(d => ({
    taskId: d.deliveryId,
    taskTitle: d.postType ? `${d.postType} Post` : 'Deliverable',
    businessName: d.clientName || d.clientId,
    postType: d.postType,
    status: d.status === 'Delivered' ? 'Completed' : (d.status || 'Pending'),
    priority: 'Normal',
    assignTo: (d.workingOn || 'Unassigned Staff').trim(),
    notes: d.notes,
    _type: 'delivery',
    _deliveryId: d.deliveryId,
  }));

  const allOverallItems = [...normalizedOverallTasks, ...normalizedOverallDeliveries];

  const overallCompleted = allOverallItems.filter(t => t.status === 'DONE' || t.status === 'Completed' || t.status === 'Complete Task').length;
  const overallPending = allOverallItems.filter(t => t.status !== 'DONE' && t.status !== 'Completed' && t.status !== 'Complete Task').length;
  const overallTotal = allOverallItems.length;

  // --- DATASET 2: TODAY'S & CARRY-FORWARD OVERDUE ITEMS (LIVE CALENDAR CONNECTED) ---
  const [liveCalendarDate, setLiveCalendarDate] = useState(() => new Date());
  const [isLiveCalendarMode, setIsLiveCalendarMode] = useState(true);

  // Keep live calendar continuously synchronized every 30 seconds and upon window focus/tab visibility
  useEffect(() => {
    const updateDate = () => {
      setLiveCalendarDate(new Date());
    };
    const timer = setInterval(updateDate, 30000);
    const handleFocus = () => updateDate();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', updateDate);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', updateDate);
    };
  }, []);

  const curY = liveCalendarDate.getFullYear();
  const curM = liveCalendarDate.getMonth() + 1;
  const curD = liveCalendarDate.getDate();
  const todayStr = `${curY}-${String(curM).padStart(2, '0')}-${String(curD).padStart(2, '0')}`;
  const currentLiveMonthKey = `${curY}-${String(curM).padStart(2, '0')}`;
  const currentMonthLastDay = new Date(curY, curM, 0).getDate();
  const currentLiveMonthStart = `${curY}-${String(curM).padStart(2, '0')}-01`;
  const currentLiveMonthEnd = `${curY}-${String(curM).padStart(2, '0')}-${String(currentMonthLastDay).padStart(2, '0')}`;

  const [taskFilterTab, setTaskFilterTab] = useState('all'); // 'all', 'today', 'overdue'
  const [selectedRevenueMonth, setSelectedRevenueMonth] = useState(currentLiveMonthKey);
  const [revenueStartDate, setRevenueStartDate] = useState(currentLiveMonthStart);
  const [revenueEndDate, setRevenueEndDate] = useState(currentLiveMonthEnd);
  const [showCustomDate, setShowCustomDate] = useState(false);

  // Auto-advance month as the live calendar rolls over (e.g. into October, November, December)
  useEffect(() => {
    if (isLiveCalendarMode) {
      setSelectedRevenueMonth(currentLiveMonthKey);
      setRevenueStartDate(currentLiveMonthStart);
      setRevenueEndDate(currentLiveMonthEnd);
    }
  }, [currentLiveMonthKey, currentLiveMonthStart, currentLiveMonthEnd, isLiveCalendarMode]);

  const isDoneStatus = (status) => {
    const s = (status || '').toLowerCase();
    return s === 'done' || s === 'completed' || s === 'complete task' || s === 'delivered' || s === 'posted';
  };

  // Cutoff date for overdue carry-forwards: do not carry forward any tasks before 3 September 2026
  const OVERDUE_CUTOFF_DATE = '2026-09-03';

  const todayTasks = tasks.filter(t => {
    const iso = parseToISO(t.date);
    if (!iso) return false;
    if (iso === todayStr) return true;
    // Only include overdue tasks if they are dated on or after September 3, 2026
    if (iso >= OVERDUE_CUTOFF_DATE && iso < todayStr && !isDoneStatus(t.status)) return true;
    return false;
  });

  const todayDeliveries = deliveries.filter(d => {
    const iso = parseToISO(d.postDate);
    if (!iso) return false;
    if (iso === todayStr) return true;
    // Only include overdue deliveries if they are dated on or after September 3, 2026
    if (iso >= OVERDUE_CUTOFF_DATE && iso < todayStr && !isDoneStatus(d.status)) return true;
    return false;
  });

  const normalizedTodayTasks = todayTasks.map(t => {
    const iso = parseToISO(t.date);
    return {
      ...t,
      _type: 'task',
      assignTo: (t.workingOn || 'Unassigned').trim(),
      _isOverdue: iso ? iso < todayStr : false,
      _isoDate: iso
    };
  });

  const normalizedTodayDeliveries = todayDeliveries.map(d => {
    const iso = parseToISO(d.postDate);
    return {
      taskId: d.deliveryId,
      taskTitle: d.postType ? `${d.postType} Post` : 'Deliverable',
      businessName: d.clientName || d.clientId,
      postType: d.postType,
      status: d.status === 'Delivered' ? 'Completed' : (d.status || 'Pending'),
      priority: 'Normal',
      assignTo: (d.workingOn || 'Unassigned').trim(),
      notes: d.notes,
      _type: 'delivery',
      _deliveryId: d.deliveryId,
      _isOverdue: iso ? iso < todayStr : false,
      _isoDate: iso
    };
  });

  const allTodayItems = [...normalizedTodayTasks, ...normalizedTodayDeliveries];

  const todayCompleted = allTodayItems.filter(t => isDoneStatus(t.status)).length;
  const todayPending = allTodayItems.filter(t => !isDoneStatus(t.status)).length;
  const todayOverdueCount = allTodayItems.filter(t => t._isOverdue).length;
  const todayFreshCount = allTodayItems.filter(t => !t._isOverdue).length;
  const todayTotal = allTodayItems.length;

  const NON_EMPLOYEE_NAMES = [
    'auto',
    'unassigned',
    'unassigned staff',
    'video editor',
    'ai video editor',
    'reel editor',
    'graphic designer',
    'ads campaign manager',
    'script writer',
    'social media executive',
    'social media exec',
    'content poster'
  ];

  // Filter items based on user selection tab ('all', 'today', 'overdue')
  const filteredTodayItems = allTodayItems.filter(item => {
    if (taskFilterTab === 'today') return !item._isOverdue;
    if (taskFilterTab === 'overdue') return item._isOverdue;
    return true;
  });

  // Group items by employee
  const todayByEmployee = {};
  filteredTodayItems.forEach(t => {
    const emp = t.assignTo ? t.assignTo.trim() : '';
    if (!emp || NON_EMPLOYEE_NAMES.includes(emp.toLowerCase())) return;

    if (!todayByEmployee[emp]) {
      todayByEmployee[emp] = { name: emp, tasks: [], done: 0, pending: 0, overdue: 0 };
    }
    todayByEmployee[emp].tasks.push(t);
    if (t._isOverdue) todayByEmployee[emp].overdue += 1;
    if (isDoneStatus(t.status)) {
      todayByEmployee[emp].done += 1;
    } else {
      todayByEmployee[emp].pending += 1;
    }
  });

  const todayEmployeeList = Object.values(todayByEmployee)
    .sort((a, b) => b.tasks.length - a.tasks.length);

  // Extract distinct available months from clients (counts clients whose plan is active in each month)
  const availableRevenueMonths = React.useMemo(() => {
    const monthKeys = new Set();
    const now = liveCalendarDate;
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthKeys.add(curKey);

    // Provide past 5 months and next 5 months (Oct, Nov, Dec, Jan, Feb)
    for (let i = -5; i <= 5; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      monthKeys.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    clients.forEach(c => {
      const info = getClientPlanInfo(c);
      if (info.cycleMonthKey) monthKeys.add(info.cycleMonthKey);
      const mk = getClientMonthKey(c);
      if (mk) monthKeys.add(mk);
    });

    const sortedKeys = Array.from(monthKeys).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map(mk => {
      const [yyyy, mm] = mk.split('-');
      const dateObj = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, 1);
      const label = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      // Count contracts starting in that month and revenue generated in that month (day 1 to 30)
      let contractsCount = 0;
      let monthRevenue = 0;
      clients.forEach(c => {
        if (isClientContractInMonth(c, mk)) {
          contractsCount += 1;
          monthRevenue += (c.packageAmount || 0);
        }
      });

      return { key: mk, label, count: contractsCount, revenue: monthRevenue };
    });
  }, [clients, liveCalendarDate]);

  // Clients generating revenue in the selected month or date range (day 1 to 30)
  const filteredRevenueClients = React.useMemo(() => {
    if (selectedRevenueMonth === 'all' && !revenueStartDate && !revenueEndDate) {
      return clients;
    }
    if (revenueStartDate || revenueEndDate) {
      return clients.filter(c => isClientContractInMonth(c, null, revenueStartDate, revenueEndDate));
    }
    return clients.filter(c => isClientContractInMonth(c, selectedRevenueMonth));
  }, [clients, selectedRevenueMonth, revenueStartDate, revenueEndDate]);

  // All clients with currently active packs across the agency (active plans into Oct, Nov, Dec, etc.)
  const currentlyActiveClients = React.useMemo(() => {
    return clients.filter(c => isClientPlanActive(c));
  }, [clients]);

  // Helper to determine plan cycle health for a client using dynamic duration (30, 90, 180, 365 days)
  const getClientPlanHealth = (client) => {
    return getClientPlanInfo(client);
  };

  // Compute revenue/billing details dynamically for the filtered active clients
  let dynamicTotalRevenue = 0;       // Received revenue from active clients
  let dynamicEstimatedRevenue = 0;   // Total active package amount
  let paymentReceivedCount = 0;
  let paymentPendingCount = 0;

  let newPurchasesCount = 0;
  let newPurchasesExpected = 0;
  let newPurchasesActual = 0;

  let renewalsCount = 0;
  let renewalsExpected = 0;
  let renewalsActual = 0;

  let notRenewedCount = 0;
  let notRenewedExpected = 0;

  let expiringSoonCount = 0;
  let expiringSoonExpected = 0;

  let retainersCount = 0;
  let retainersExpected = 0;
  let retainersActual = 0;

  filteredRevenueClients.forEach(c => {
    const pkgAmt = c.packageAmount || 0;
    dynamicEstimatedRevenue += pkgAmt;

    let pStatus = 'Full';
    let paidAmt = pkgAmt;

    try {
      if (c.notes && c.notes.trim().startsWith('{')) {
        const parsed = JSON.parse(c.notes);
        pStatus = parsed.paymentStatus || 'Full';
        paidAmt = parseFloat(parsed.paidAmount) !== undefined ? parseFloat(parsed.paidAmount) : pkgAmt;
      }
    } catch (e) {}

    let actualCollected = 0;
    if (pStatus === 'Full') {
      actualCollected = pkgAmt;
      dynamicTotalRevenue += pkgAmt;
      paymentReceivedCount += 1;
    } else if (pStatus === 'Partial' || pStatus === 'Half') {
      actualCollected = paidAmt;
      dynamicTotalRevenue += paidAmt;
      paymentReceivedCount += 1;
      paymentPendingCount += 1;
    } else {
      paymentPendingCount += 1;
    }

    // Classify revenue stream & plan cycle health
    const stream = getClientRevenueStream(c, selectedRevenueMonth);
    const health = getClientPlanHealth(c);

    if (stream.type === 'Renewal') {
      renewalsCount += 1;
      renewalsExpected += pkgAmt;
      renewalsActual += actualCollected;
    } else if (stream.type === 'NewPurchase') {
      newPurchasesCount += 1;
      newPurchasesExpected += pkgAmt;
      newPurchasesActual += actualCollected;
    } else {
      retainersCount += 1;
      retainersExpected += pkgAmt;
      retainersActual += actualCollected;
    }

    if (health.status === 'Expiring Soon') {
      expiringSoonCount += 1;
      expiringSoonExpected += pkgAmt;
    }
  });

  // Track non-renewed / expired contracts in the period for the Renewals vs Non-Renewals card
  clients.forEach(c => {
    if (c.active === false || !isClientPlanActive(c)) {
      const isExpiredInPeriod = (revenueStartDate || revenueEndDate)
        ? isClientExpiringInMonth(c, null, revenueStartDate, revenueEndDate)
        : (selectedRevenueMonth === 'all' ? true : isClientExpiringInMonth(c, selectedRevenueMonth));
      if (isExpiredInPeriod) {
        notRenewedCount += 1;
        notRenewedExpected += (c.packageAmount || 0);
      }
    }
  });

  const pendingRevenue = Math.max(0, dynamicEstimatedRevenue - dynamicTotalRevenue);

  // Total billing across all 58 clients in CRM (Expected Revenue)
  const totalAllClientsBilling = clients.reduce((sum, c) => sum + (c.packageAmount || 0), 0);

  // Active extended clients count
  const allExtendedClientsCount = clients.filter(c => c.active && ((c.extensionDays || 0) > 0 || getClientPlanHealth(c).status === 'Extended')).length;

  // --- PROJECTION TELEMETRY METRICS ---
  // 1. Projection Renewal: Total renewal pool = (clients with no renewal / not renewed) + (renewed)
  // Achieved renewal = how many persons renewed from the list and their amount
  const totalRenewalCount = renewalsCount + notRenewedCount;
  const totalRenewalExpected = renewalsExpected + notRenewedExpected;
  const achievedRenewalCount = renewalsCount;
  const achievedRenewalActual = renewalsActual;
  const renewalRealizedPercent = totalRenewalCount > 0 
    ? Math.round((achievedRenewalCount / totalRenewalCount) * 100) 
    : 0;

  // 2. Projection Sale: Derived from actual converted entries filled by sales executives
  // Converted leads: ANSWERED, CONVERTED, WON
  // Hot leads: INTERESTED, CALLBACK
  const convertedLeads = internalCalls.filter(c => c.status === 'ANSWERED' || c.status === 'CONVERTED' || c.status === 'WON');
  const hotLeads = internalCalls.filter(c => c.status === 'INTERESTED' || c.status === 'CALLBACK');
  const convertedLeadsCount = convertedLeads.length;
  const hotLeadsCount = hotLeads.length;
  const totalHotPoolCount = convertedLeadsCount + hotLeadsCount;

  // Achieved Sale Projection: Sum of actual package amounts entered by sales executives (fallback ₹3,500 if not filled yet)
  const achievedSaleProjection = convertedLeads.reduce((sum, c) => {
    const val = typeof c.expectedValue === 'number' && c.expectedValue > 0
      ? c.expectedValue
      : (parseFloat(c.expectedValue) > 0 ? parseFloat(c.expectedValue) : 3500);
    return sum + val;
  }, 0);

  // Hot Leads Pipeline: Sum of expected package value or ₹3,500 benchmark
  const hotLeadsPipeline = hotLeads.reduce((sum, c) => {
    const val = typeof c.expectedValue === 'number' && c.expectedValue > 0
      ? c.expectedValue
      : (parseFloat(c.expectedValue) > 0 ? parseFloat(c.expectedValue) : 3500);
    return sum + val;
  }, 0);

  const expectedSaleProjection = achievedSaleProjection + hotLeadsPipeline;

  const saleRealizedPercent = expectedSaleProjection > 0 
    ? Math.round((achievedSaleProjection / expectedSaleProjection) * 100) 
    : (totalHotPoolCount > 0 ? Math.round((convertedLeadsCount / totalHotPoolCount) * 100) : 0);

  // Real Converted Entries with explicit package data
  const convertedWithPackage = convertedLeads.filter(c => c.packageName || (c.expectedValue && c.expectedValue > 0));

  // Current Month Expected Closings
  const currentMonthKey = new Date().toISOString().slice(0, 7); // e.g. '2026-09'
  const convertedClosingThisMonth = convertedLeads.filter(c => {
    if (!c.expectedClosingDate) return true;
    const dt = new Date(c.expectedClosingDate);
    return !isNaN(dt.getTime()) && dt.toISOString().slice(0, 7) === currentMonthKey;
  });
  const thisMonthConvertedRevenue = convertedClosingThisMonth.reduce((sum, c) => {
    const val = typeof c.expectedValue === 'number' && c.expectedValue > 0
      ? c.expectedValue
      : (parseFloat(c.expectedValue) > 0 ? parseFloat(c.expectedValue) : 3500);
    return sum + val;
  }, 0);

  // Active Ongoing Contracts in the period
  const totalActiveOngoingCount = newPurchasesCount + renewalsCount + retainersCount;
  const totalOngoingExpected = newPurchasesExpected + renewalsExpected + retainersExpected;
  const totalPoolRevenue = totalOngoingExpected + notRenewedExpected;
  const totalAccountsInPool = totalActiveOngoingCount + notRenewedCount;

  // Renewal Opportunity Metrics (Renewed vs Overdue Non-Renewals)
  const renewalPercent = totalPoolRevenue > 0 
    ? Math.round((totalOngoingExpected / totalPoolRevenue) * 100) 
    : (totalActiveOngoingCount > 0 ? 100 : 0);
  const notRenewedPercent = totalPoolRevenue > 0 
    ? Math.round((notRenewedExpected / totalPoolRevenue) * 100) 
    : (notRenewedCount > 0 ? 100 : 0);

  // Dynamically calculate employee data from both tasks and deliveries
  const empMap = {};

  // Process tasks
  tasks.forEach(t => {
    const rawName = t.workingOn && t.workingOn.toLowerCase() !== 'auto' ? t.workingOn : (t.assignedTo?.name || t.assignTo || '');
    if (!rawName) return;
    const name = rawName.trim();
    if (!name || NON_EMPLOYEE_NAMES.includes(name.toLowerCase())) return;
    
    if (!empMap[name]) {
      empMap[name] = { name, pending: 0, done: 0, total: 0 };
    }
    
    empMap[name].total += 1;
    if (t.status === 'DONE' || t.status === 'Completed' || t.status === 'Complete Task') {
      empMap[name].done += 1;
    } else {
      empMap[name].pending += 1;
    }
  });

  // Process deliveries
  deliveries.forEach(d => {
    if (!d.workingOn) return;
    const name = d.workingOn.trim();
    if (!name || NON_EMPLOYEE_NAMES.includes(name.toLowerCase())) return;
    
    if (!empMap[name]) {
      empMap[name] = { name, pending: 0, done: 0, total: 0 };
    }
    
    empMap[name].total += 1;
    if (d.status === 'Delivered' || d.status === 'Completed') {
      empMap[name].done += 1;
    } else {
      empMap[name].pending += 1;
    }
  });

  const employeeData = Object.values(empMap)
    .filter(emp => !NON_EMPLOYEE_NAMES.includes(emp.name.trim().toLowerCase()))
    .sort((a, b) => b.total - a.total);

  // Synthesize employees for performance calculation if full employee records not provided
  const employeesToEvaluate = employees && employees.length > 0
    ? employees
    : employeeData.map((e, idx) => ({ id: idx + 1, name: e.name, department: 'General', designation: 'Specialist', status: 'ACTIVE' }));

  const performanceOverview = calculateEmployeePerformance({
    employees: employeesToEvaluate,
    clientTasks: tasks,
    clientDeliveries: deliveries,
    attendanceLogs: attendance,
    feedbacks,
    timeRange: 'this_month'
  });

  // Sum up actual employee stats from rows
  const employeeTaskDone = employeeData.reduce((sum, emp) => sum + emp.done, 0);
  const employeeTaskPending = employeeData.reduce((sum, emp) => sum + emp.pending, 0);

  const topLevelMetrics = {
    activeClients: currentlyActiveClients.length,
    totalClients,
    paymentReceivedCount,
    paymentPendingCount,
    totalRevenue: `₹${dynamicTotalRevenue.toLocaleString()}`,
    estimatedMonthlyRevenue: `₹${dynamicEstimatedRevenue.toLocaleString()}`,
    taskCompleted,
    taskPending,
    employeeTaskDone,
    employeeTaskPending,
    deliveryCompleted,
    deliveryPending
  };

  const revReceivedPercent = dynamicEstimatedRevenue > 0 ? Math.round((dynamicTotalRevenue / dynamicEstimatedRevenue) * 100) : 0;
  const revPendingPercent = dynamicEstimatedRevenue > 0 ? Math.round((pendingRevenue / dynamicEstimatedRevenue) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* 1. KPIs Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-3 sm:gap-4">
        {/* Active Clients */}
        <div 
          onClick={() => onSelectTab && onSelectTab('clients', { 
            lifecycleFilter: 'active', 
            filterScope: 'all_clients', 
            monthFilter: 'all', 
            paymentFilter: 'all', 
            revenueStreamFilter: 'all' 
          })}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between relative overflow-hidden group cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200"
          title="Click to view all Active Clients in CRM"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="space-y-1.5 relative z-10 min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-extrabold font-sans">Active Clients</span>
              <span className="flex items-center gap-1 text-[8px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200/50 dark:border-emerald-800/40 tracking-wider whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                LIVE
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white truncate">{currentlyActiveClients.length}</h3>
              <span className="text-xs text-slate-400 font-semibold mb-0.5 whitespace-nowrap">/ {clients.length} in CRM</span>
            </div>
            <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800/30 block w-fit truncate max-w-full">
              {currentlyActiveClients.length} Active Plans (Ongoing)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center relative z-10 shadow-inner border border-blue-100 dark:border-blue-900 shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Actual Revenue (Collected) */}
        <div 
          onClick={() => onSelectTab && onSelectTab('clients', { 
            monthFilter: selectedRevenueMonth, 
            startDate: revenueStartDate, 
            endDate: revenueEndDate, 
            filterScope: 'month', 
            paymentFilter: 'paid_only', 
            lifecycleFilter: 'all', 
            revenueStreamFilter: 'all' 
          })}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between relative overflow-hidden group cursor-pointer hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200"
          title="Click to view day 1 to 30 clients for this collected revenue in CRM"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="space-y-1.5 relative z-10 min-w-0 flex-1 pr-2">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-extrabold font-sans block truncate">Actual Revenue</span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 truncate">₹{dynamicTotalRevenue.toLocaleString()}</h3>
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800/40 block w-fit truncate max-w-full">
              Collected Day 1-30 ({paymentReceivedCount} Paid)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center relative z-10 shadow-inner border border-emerald-100 dark:border-emerald-900 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Expected Revenue (Total Target) */}
        <div 
          onClick={() => onSelectTab && onSelectTab('clients', { 
            filterScope: 'all_clients', 
            monthFilter: 'all', 
            paymentFilter: 'all', 
            lifecycleFilter: 'all', 
            revenueStreamFilter: 'all' 
          })}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between relative overflow-hidden group cursor-pointer hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200"
          title="Click to view all 58 Client Accounts in CRM"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="space-y-1.5 relative z-10 min-w-0 flex-1 pr-2">
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-extrabold font-sans block truncate">Expected Revenue</span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 truncate">₹{totalAllClientsBilling.toLocaleString()}</h3>
            <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800/40 block w-fit truncate max-w-full">
              All {clients.length} Clients Billing (100%)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center relative z-10 shadow-inner border border-indigo-100 dark:border-indigo-900 shrink-0">
            <BarChart2 className="w-5 h-5" />
          </div>
        </div>

        {/* Achieved Renewal (Depends on Renewal Data) */}
        <div 
          onClick={() => onSelectTab && onSelectTab('renewals', { renewalFilter: 'All' })}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-purple-200/60 dark:border-purple-900/40 shadow-sm flex items-center justify-between relative overflow-hidden group cursor-pointer hover:shadow-md hover:border-purple-400 dark:hover:border-purple-600 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200"
          title="Click to open Renewals & Retention Hub"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="space-y-1.5 relative z-10 min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase tracking-widest font-extrabold font-sans">Achieved Renewal</span>
              <span className="text-[8px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-1.5 py-0.2 rounded-full whitespace-nowrap">Renewal Data</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-1 sm:gap-2">
              <h3 className="text-xl sm:text-2xl font-extrabold text-purple-600 dark:text-purple-400">₹{achievedRenewalActual.toLocaleString()}</h3>
              <span className="text-xs text-purple-400 font-semibold whitespace-nowrap" title="Total Projected Renewal Target (Renewed + Non-Renewed)">/ ₹{totalRenewalExpected.toLocaleString()}</span>
            </div>
            <span className="text-[9px] text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-100 dark:border-purple-800/40 block w-fit truncate max-w-full">
              {achievedRenewalCount} of {totalRenewalCount} Renewed ({renewalRealizedPercent}%)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center relative z-10 shadow-inner border border-purple-100 dark:border-purple-900 shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
        </div>

        {/* Achieved Sale (Depends on Sales Data) */}
        <div 
          onClick={() => onSelectTab && onSelectTab('seller-dashboard', { activeStatusFilter: 'ANSWERED' })}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-cyan-200/60 dark:border-cyan-900/40 shadow-sm flex items-center justify-between relative overflow-hidden group cursor-pointer hover:shadow-md hover:border-cyan-400 dark:hover:border-cyan-600 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200"
          title="Click to view Sales & Converted Leads in Seller Dashboard"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="space-y-1.5 relative z-10 min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-cyan-600 dark:text-cyan-400 uppercase tracking-widest font-extrabold font-sans">Achieved Sale</span>
              <span className="text-[8px] font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-900/60 px-1.5 py-0.2 rounded-full whitespace-nowrap">Sales Data</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-1 sm:gap-2">
              <h3 className="text-xl sm:text-2xl font-extrabold text-cyan-600 dark:text-cyan-400">₹{achievedSaleProjection.toLocaleString()}</h3>
              <span className="text-xs text-cyan-400 font-semibold whitespace-nowrap" title={`Pipeline Potential: Converted (₹${achievedSaleProjection.toLocaleString()}) + Hot Leads (₹${hotLeadsPipeline.toLocaleString()})`}>/ ₹{expectedSaleProjection.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] text-cyan-700 dark:text-cyan-300 font-bold bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-100 dark:border-cyan-800/40 block w-fit truncate max-w-full">
                {convertedLeadsCount} / {totalHotPoolCount} Done ({saleRealizedPercent}%) • {hotLeadsCount} Hot
              </span>
              {convertedWithPackage.length > 0 && (
                <span className="text-[9px] text-emerald-700 dark:text-emerald-300 font-black bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40 whitespace-nowrap">
                  {convertedWithPackage.length} Packages
                </span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center relative z-10 shadow-inner border border-cyan-100 dark:border-cyan-900 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Revenue (Outstanding) */}
        <div 
          onClick={() => onSelectTab && onSelectTab('pending-payments', { paymentTabFilter: 'All' })}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between relative overflow-hidden group cursor-pointer hover:shadow-md hover:border-orange-300 dark:hover:border-orange-700 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200"
          title="Click to open Pending Payments Hub"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="space-y-1.5 relative z-10 min-w-0 flex-1 pr-2">
            <span className="text-[10px] text-orange-600 dark:text-orange-400 uppercase tracking-widest font-extrabold font-sans block truncate">Pending Revenue</span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-orange-500 truncate">₹{pendingRevenue.toLocaleString()}</h3>
            <span className="text-[9px] text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-full border border-orange-100 dark:border-orange-800/40 block w-fit truncate max-w-full">
              Outstanding ({revPendingPercent}%)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center relative z-10 shadow-inner border border-orange-100 dark:border-orange-900 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Tasks & Deliveries Pipeline */}
        <div 
          onClick={() => onSelectTab && onSelectTab('deliverables')}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between relative overflow-hidden group cursor-pointer hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200"
          title="Click to open Task Manager & Deliverables"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="space-y-1.5 relative z-10 min-w-0 flex-1 pr-2">
            <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase tracking-widest font-extrabold font-sans block truncate">Pipeline</span>
            <div className="flex flex-wrap items-baseline gap-1 sm:gap-1.5">
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white truncate">{topLevelMetrics.taskPending + topLevelMetrics.deliveryPending}</h3>
              <span className="text-xs text-slate-400 font-semibold mb-0.5 whitespace-nowrap">Pending</span>
            </div>
            <span className="text-[9px] text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full border border-purple-100 dark:border-purple-800/30 block w-fit truncate max-w-full">
              Done: {topLevelMetrics.taskCompleted + topLevelMetrics.deliveryCompleted}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center relative z-10 shadow-inner border border-purple-100 dark:border-purple-900 shrink-0">
            <Target className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Charts Row (Custom CSS Based) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Revenue Progress Chart */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between overflow-hidden">
          <div>
            {/* Header: Title, Subtitle, & Month Selector Dropdown */}
            <div className="flex flex-col sm:flex-row lg:flex-col 2xl:flex-row sm:items-center lg:items-start 2xl:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900 shadow-inner shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                    Revenue Breakdown
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Actual vs Expected vs Pending • <span className="font-bold text-slate-700 dark:text-slate-300">
                      {selectedRevenueMonth === 'all' && !revenueStartDate
                        ? 'All Months (All-Time)'
                        : revenueStartDate && revenueEndDate
                          ? `${availableRevenueMonths.find(m => m.key === selectedRevenueMonth)?.label || selectedRevenueMonth} (${new Date(revenueStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(revenueEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`
                          : (availableRevenueMonths.find(m => m.key === selectedRevenueMonth)?.label || selectedRevenueMonth)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Month Dropdown Quick Selector */}
              <div className="w-full sm:w-auto lg:w-full 2xl:w-auto shrink-0">
                <select
                  value={selectedRevenueMonth}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedRevenueMonth(val);
                    if (val === 'all') {
                      setIsLiveCalendarMode(false);
                      setRevenueStartDate('');
                      setRevenueEndDate('');
                      setShowCustomDate(false);
                    } else if (val === 'custom') {
                      setIsLiveCalendarMode(false);
                      setShowCustomDate(true);
                    } else {
                      setIsLiveCalendarMode(val === currentLiveMonthKey);
                      const [yyyy, mm] = val.split('-');
                      const y = parseInt(yyyy, 10);
                      const m = parseInt(mm, 10);
                      setRevenueStartDate(`${y}-${String(m).padStart(2, '0')}-01`);
                      const lastDate = new Date(y, m, 0).getDate();
                      setRevenueEndDate(`${y}-${String(m).padStart(2, '0')}-${String(lastDate).padStart(2, '0')}`);
                      setShowCustomDate(false);
                    }
                  }}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500 transition cursor-pointer shadow-xs w-full sm:w-auto lg:w-full 2xl:w-auto max-w-full truncate"
                >
                  <option value="all">🌐 All Months (Combined)</option>
                  {availableRevenueMonths.map(m => (
                    <option key={m.key} value={m.key}>
                      {m.key === currentLiveMonthKey ? `🟢 Live Current Month: ${m.label}` : `📅 ${m.label}`} ({m.count} clients)
                    </option>
                  ))}
                  <option value="custom">📅 Custom Date Range...</option>
                </select>
              </div>
            </div>

            {/* Quick Month Filter Pills (Single horizontal scrollable row with NO visible scrollbar) */}
            <div 
              className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 flex-nowrap border-b border-slate-100 dark:border-slate-800 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <button
                type="button"
                onClick={() => { setSelectedRevenueMonth('all'); setIsLiveCalendarMode(false); setRevenueStartDate(''); setRevenueEndDate(''); setShowCustomDate(false); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap ${
                  selectedRevenueMonth === 'all' && !revenueStartDate && !revenueEndDate
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Months
              </button>
              {availableRevenueMonths.map(m => {
                const isSelected = selectedRevenueMonth === m.key && !showCustomDate;
                const isLiveCurrent = m.key === currentLiveMonthKey;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => {
                      setSelectedRevenueMonth(m.key);
                      setIsLiveCalendarMode(isLiveCurrent);
                      const [yyyy, mm] = m.key.split('-');
                      const y = parseInt(yyyy, 10);
                      const mInt = parseInt(mm, 10);
                      setRevenueStartDate(`${y}-${String(mInt).padStart(2, '0')}-01`);
                      const lastDate = new Date(y, mInt, 0).getDate();
                      setRevenueEndDate(`${y}-${String(mInt).padStart(2, '0')}-${String(lastDate).padStart(2, '0')}`);
                      setShowCustomDate(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isLiveCurrent && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'} animate-pulse shrink-0`}></span>
                    )}
                    <span>{m.label.split(' ')[0]}</span>
                    {isLiveCurrent && <span className="text-[9px] font-extrabold uppercase opacity-90">(Live)</span>}
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/70 dark:bg-slate-700 text-slate-500'}`}>
                      {m.count}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowCustomDate(!showCustomDate)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                  showCustomDate || (revenueStartDate && selectedRevenueMonth === 'custom')
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>📅 Custom Range</span>
                {(revenueStartDate || revenueEndDate) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                )}
              </button>
            </div>

            {/* Expandable Custom Date Range Box (Structured Grid, 100% responsive, NEVER overflows out of box) */}
            {(showCustomDate || selectedRevenueMonth === 'custom' || (revenueStartDate && selectedRevenueMonth !== 'all' && !availableRevenueMonths.some(m => selectedRevenueMonth === m.key))) && (
              <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Custom Date Range
                  </span>
                  {(revenueStartDate || revenueEndDate) && (
                    <button
                      type="button"
                      onClick={() => { setRevenueStartDate(''); setRevenueEndDate(''); setSelectedRevenueMonth('all'); setShowCustomDate(false); }}
                      className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition cursor-pointer flex items-center gap-1"
                    >
                      <span>Clear Range</span>
                      <span className="font-black">✕</span>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 shadow-xs min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 w-8">From</span>
                    <input
                      type="date"
                      value={revenueStartDate}
                      onChange={(e) => { setRevenueStartDate(e.target.value); setSelectedRevenueMonth('custom'); }}
                      className="w-full bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer min-w-0"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 shadow-xs min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 w-8">To</span>
                    <input
                      type="date"
                      value={revenueEndDate}
                      onChange={(e) => { setRevenueEndDate(e.target.value); setSelectedRevenueMonth('custom'); }}
                      className="w-full bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer min-w-0"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-5 my-auto">
            {/* 1. Actual Revenue */}
            <div 
              onClick={() => onSelectTab && onSelectTab('clients', { paymentFilter: 'full' })}
              className="space-y-1.5 p-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-all duration-200 group"
              title="Click to view fully paid accounts in CRM"
            >
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block group-hover:scale-125 transition-transform"></span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">Actual Revenue (Collected)</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">₹{dynamicTotalRevenue.toLocaleString()}</span>
                  <span className="text-xs font-bold text-slate-400">({revReceivedPercent}%)</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-4 rounded-full overflow-hidden shadow-inner relative">
                <div 
                  className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${revReceivedPercent}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 text-right flex justify-between items-center">
                <span className="text-emerald-600 text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition">View Paid Accounts →</span>
                <span>{paymentReceivedCount} accounts paid</span>
              </div>
            </div>

            {/* 2. Expected Revenue */}
            <div 
              onClick={() => onSelectTab && onSelectTab('clients', { lifecycleFilter: 'all' })}
              className="space-y-1.5 p-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-all duration-200 group"
              title="Click to view all billing contracts in CRM"
            >
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block group-hover:scale-125 transition-transform"></span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">Expected Revenue (Total Target)</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">₹{dynamicEstimatedRevenue.toLocaleString()}</span>
                  <span className="text-xs font-bold text-slate-400">(100%)</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-4 rounded-full overflow-hidden shadow-inner relative">
                <div 
                  className="bg-gradient-to-r from-indigo-400 to-indigo-600 h-full rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `100%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 text-right flex justify-between items-center">
                <span className="text-indigo-600 text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition">View CRM Clients →</span>
                <span>{filteredRevenueClients.length} active contracts</span>
              </div>
            </div>

            {/* 3. Pending Revenue */}
            <div 
              onClick={() => onSelectTab && onSelectTab('pending-payments', { paymentTabFilter: 'All' })}
              className="space-y-1.5 p-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-all duration-200 group"
              title="Click to view Pending Balance accounts"
            >
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block group-hover:scale-125 transition-transform"></span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-orange-500 transition">Pending Revenue (Outstanding)</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-black text-orange-500">₹{pendingRevenue.toLocaleString()}</span>
                  <span className="text-xs font-bold text-slate-400">({revPendingPercent}%)</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-4 rounded-full overflow-hidden shadow-inner relative">
                <div 
                  className="bg-gradient-to-r from-orange-400 to-orange-500 h-full rounded-full transition-all duration-1000 ease-out delay-300" 
                  style={{ width: `${revPendingPercent}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 text-right flex justify-between items-center">
                <span className="text-orange-600 text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition">View Pending Payments →</span>
                <span>{paymentPendingCount} accounts pending</span>
              </div>
            </div>
          </div>
          
          {/* Interlinked Revenue Streams Breakdown */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div 
              onClick={() => onSelectTab && onSelectTab('clients', { revenueStreamFilter: 'NewPurchase' })}
              className="bg-emerald-50/70 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-800/30 flex flex-col justify-between cursor-pointer hover:shadow-sm hover:scale-[1.02] active:scale-[0.99] transition-all"
              title="Click to view Sales Data in CRM"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold uppercase">🛒 Sales Data (New Purchases)</span>
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.2 rounded">{newPurchasesCount} Sales</span>
              </div>
              <div className="mt-1.5">
                <div className="text-[9px] text-slate-400">Target: <span className="font-bold text-slate-700 dark:text-slate-300">₹{newPurchasesExpected.toLocaleString()}</span></div>
                <div className="text-[10px] font-extrabold text-emerald-600">Achieved: ₹{newPurchasesActual.toLocaleString()}</div>
              </div>
            </div>

            <div 
              onClick={() => onSelectTab && onSelectTab('renewals', { renewalFilter: 'All' })}
              className="bg-purple-50/70 dark:bg-purple-950/20 p-2.5 rounded-xl border border-purple-100 dark:border-purple-800/30 flex flex-col justify-between cursor-pointer hover:shadow-sm hover:scale-[1.02] active:scale-[0.99] transition-all"
              title="Click to open Renewals & Retention Hub"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-purple-700 dark:text-purple-400 font-extrabold uppercase">🔄 Renewal Data (Plan Renewals)</span>
                <span className="text-[9px] font-bold text-purple-700 bg-purple-100 dark:bg-purple-900/50 px-1.5 py-0.2 rounded">{renewalsCount} Renewals</span>
              </div>
              <div className="mt-1.5">
                <div className="text-[9px] text-slate-400">Target: <span className="font-bold text-slate-700 dark:text-slate-300">₹{renewalsExpected.toLocaleString()}</span></div>
                <div className="text-[10px] font-extrabold text-purple-600">Achieved: ₹{renewalsActual.toLocaleString()}</div>
              </div>
            </div>

            <div 
              onClick={() => onSelectTab && onSelectTab('clients', { revenueStreamFilter: 'ActiveRetainer' })}
              className="bg-blue-50/70 dark:bg-blue-950/20 p-2.5 rounded-xl border border-blue-100 dark:border-blue-800/30 flex flex-col justify-between cursor-pointer hover:shadow-sm hover:scale-[1.02] active:scale-[0.99] transition-all"
              title="Click to view Active Retainers in CRM"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-blue-700 dark:text-blue-400 font-extrabold uppercase">💼 Retainers</span>
                <span className="text-[9px] font-bold text-blue-700 bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.2 rounded">{retainersCount} Retainers</span>
              </div>
              <div className="mt-1.5">
                <div className="text-[9px] text-slate-400">Target: <span className="font-bold text-slate-700 dark:text-slate-300">₹{retainersExpected.toLocaleString()}</span></div>
                <div className="text-[10px] font-extrabold text-blue-600">Achieved: ₹{retainersActual.toLocaleString()}</div>
              </div>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-5 gap-1.5 sm:gap-2 text-center text-xs">
            <div 
              onClick={() => onSelectTab && onSelectTab('clients', { paymentFilter: 'full' })}
              className="bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-xl border border-emerald-100 dark:border-emerald-800/30 min-w-0 cursor-pointer hover:shadow-xs hover:scale-[1.02] transition-all"
              title="Click to view fully paid accounts in CRM"
            >
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block truncate">Actual Revenue</span>
              <span className="text-[11px] sm:text-xs font-extrabold text-emerald-800 dark:text-emerald-300 block truncate">₹{dynamicTotalRevenue.toLocaleString()}</span>
            </div>
            <div 
              onClick={() => onSelectTab && onSelectTab('clients', { filterScope: 'all_clients', monthFilter: 'all', paymentFilter: 'all', lifecycleFilter: 'all', revenueStreamFilter: 'all' })}
              className="bg-indigo-50 dark:bg-indigo-950/30 p-2 rounded-xl border border-indigo-100 dark:border-indigo-800/30 min-w-0 cursor-pointer hover:shadow-xs hover:scale-[1.02] transition-all"
              title="Click to view all 58 accounts in CRM"
            >
              <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold block truncate">Expected Target</span>
              <span className="text-[11px] sm:text-xs font-extrabold text-indigo-800 dark:text-indigo-300 block truncate">₹{totalAllClientsBilling.toLocaleString()}</span>
            </div>
            <div 
              onClick={() => onSelectTab && onSelectTab('renewals', { renewalFilter: 'All' })}
              className="bg-purple-50 dark:bg-purple-950/30 p-2 rounded-xl border border-purple-100 dark:border-purple-800/30 min-w-0 cursor-pointer hover:shadow-xs hover:scale-[1.02] transition-all"
              title="Click to view Renewal Data in Renewals Hub"
            >
              <span className="text-[10px] text-purple-700 dark:text-purple-400 font-bold block truncate">Achieved Renewal</span>
              <span className="text-[11px] sm:text-xs font-extrabold text-purple-800 dark:text-purple-300 block truncate">₹{achievedRenewalActual.toLocaleString()}</span>
              <span className="text-[8px] text-purple-600/70 dark:text-purple-400/70 block truncate">Proj: ₹{totalRenewalExpected.toLocaleString()}</span>
            </div>
            <div 
              onClick={() => onSelectTab && onSelectTab('seller-dashboard', { activeStatusFilter: 'ANSWERED' })}
              className="bg-cyan-50 dark:bg-cyan-950/30 p-2 rounded-xl border border-cyan-100 dark:border-cyan-800/30 min-w-0 cursor-pointer hover:shadow-xs hover:scale-[1.02] transition-all"
              title="Click to view Sales Data in Seller Dashboard"
            >
              <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-bold block truncate">Achieved Sale</span>
              <span className="text-[11px] sm:text-xs font-extrabold text-cyan-800 dark:text-cyan-300 block truncate">₹{achievedSaleProjection.toLocaleString()}</span>
              <span className="text-[8px] text-cyan-600/70 dark:text-cyan-400/70 block truncate">{convertedWithPackage.length > 0 ? `${convertedWithPackage.length} Pkg • ` : ''}Proj: ₹{expectedSaleProjection.toLocaleString()}</span>
            </div>
            <div 
              onClick={() => onSelectTab && onSelectTab('pending-payments', { paymentTabFilter: 'All' })}
              className="bg-orange-50 dark:bg-orange-950/30 p-2 rounded-xl border border-orange-100 dark:border-orange-800/30 min-w-0 col-span-2 sm:col-span-1 cursor-pointer hover:shadow-xs hover:scale-[1.02] transition-all"
              title="Click to view Pending Payments"
            >
              <span className="text-[10px] text-orange-700 dark:text-orange-400 font-bold block truncate">Pending Balance</span>
              <span className="text-[11px] sm:text-xs font-extrabold text-orange-800 dark:text-orange-300 block truncate">₹{pendingRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Task Status Bar Chart — Overall */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <h4 className="text-base font-extrabold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            Overall Task Status Overview
            <span className="ml-auto text-[10px] font-bold text-purple-500 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full border border-purple-100 dark:border-purple-800/30">
              All-Time
            </span>
          </h4>

          {/* Total summary pill */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-1000"
                style={{ width: overallTotal > 0 ? `${Math.round((overallCompleted / overallTotal) * 100)}%` : '0%' }}
              />
            </div>
            <span className="text-xs font-black text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0}% done
            </span>
          </div>

          {/* Animated SVG Donut Velocity Gauge — Fills the vertical space with rich telemetry */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-2 py-4 px-4 bg-slate-50/70 dark:bg-slate-850/50 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-inner">
            {/* SVG Donut Chart */}
            <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                {/* Background Ring Track */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  className="stroke-slate-200/80 dark:stroke-slate-800"
                  strokeWidth="14"
                  fill="transparent"
                />
                {/* Pending Segment (Orange) */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  className="stroke-orange-400/80 dark:stroke-orange-500/80 transition-all duration-1000 ease-out"
                  strokeWidth="14"
                  strokeDasharray={389.55}
                  strokeDashoffset={0}
                  fill="transparent"
                />
                {/* Completed Segment (Emerald) */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  className="stroke-emerald-500 dark:stroke-emerald-400 transition-all duration-1000 ease-out"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={389.55}
                  strokeDashoffset={389.55 - (389.55 * (overallTotal > 0 ? (overallCompleted / overallTotal) : 0))}
                  fill="transparent"
                />
              </svg>
              {/* Inner Center Telemetry */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0}%
                </span>
                <span className="text-[9px] uppercase tracking-widest font-extrabold text-emerald-600 dark:text-emerald-400">
                  {overallCompleted === overallTotal && overallTotal > 0 ? 'Completed' : 'Velocity'}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {overallCompleted} / {overallTotal}
                </span>
              </div>
            </div>

            {/* Quick Status Breakdown Chips beside Donut */}
            <div className="flex flex-col gap-2.5 w-full sm:w-auto">
              <div 
                onClick={() => onSelectTab && onSelectTab('deliverables', { deliverableStatusFilter: 'Complete Task' })}
                className="flex items-center justify-between sm:justify-start gap-3 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-2xs cursor-pointer hover:shadow-md hover:scale-[1.02] hover:border-emerald-300 dark:hover:border-emerald-700 transition-all"
                title="Click to view Completed Tasks in Task Manager"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Completed</span>
                </div>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 ml-auto sm:ml-4">
                  {overallCompleted} ({overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0}%)
                </span>
              </div>

              <div 
                onClick={() => onSelectTab && onSelectTab('deliverables', { deliverableStatusFilter: 'Working On It' })}
                className="flex items-center justify-between sm:justify-start gap-3 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-2xs cursor-pointer hover:shadow-md hover:scale-[1.02] hover:border-orange-300 dark:hover:border-orange-700 transition-all"
                title="Click to view In-Progress Tasks in Task Manager"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400 shrink-0"></span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pending</span>
                </div>
                <span className="text-xs font-black text-orange-500 ml-auto sm:ml-4">
                  {overallPending} ({overallTotal > 0 ? Math.round((overallPending / overallTotal) * 100) : 0}%)
                </span>
              </div>

              <div 
                onClick={() => onSelectTab && onSelectTab('deliverables', { deliverableStatusFilter: 'all' })}
                className="flex items-center justify-between sm:justify-start gap-3 px-3.5 py-2 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 shadow-2xs cursor-pointer hover:shadow-md hover:scale-[1.02] hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                title="Click to view all deliverables in Task Manager"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0"></span>
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-300">Total Workload</span>
                </div>
                <span className="text-xs font-black text-purple-700 dark:text-purple-300 ml-auto sm:ml-4">
                  {overallTotal} Items
                </span>
              </div>
            </div>
          </div>

          {/* Bar Chart Drill-down */}
          <div className="space-y-4 pt-2">
            {/* Completed bar */}
            <div 
              onClick={() => onSelectTab && onSelectTab('deliverables', { deliverableStatusFilter: 'Complete Task' })}
              className="space-y-1.5 p-1.5 -mx-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-all duration-200 group"
              title="Click to filter Task Manager by Completed Tasks"
            >
              <div className="flex justify-between text-xs font-bold">
                <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 group-hover:text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
                  Completed Tasks
                </span>
                <span className="text-slate-700 dark:text-slate-300">{overallCompleted} / {overallTotal}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-7 overflow-hidden relative shadow-inner">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-3 group-hover:brightness-110"
                  style={{ width: overallTotal > 0 ? `${Math.max(Math.round((overallCompleted / overallTotal) * 100), overallCompleted > 0 ? 8 : 0)}%` : '0%' }}
                >
                  {overallCompleted > 0 && (
                    <span className="text-[11px] font-black text-white">{Math.round((overallCompleted / overallTotal) * 100)}%</span>
                  )}
                </div>
              </div>
            </div>

            {/* Pending bar */}
            <div 
              onClick={() => onSelectTab && onSelectTab('deliverables', { deliverableStatusFilter: 'Working On It' })}
              className="space-y-1.5 p-1.5 -mx-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-all duration-200 group"
              title="Click to filter Task Manager by In-Progress Tasks"
            >
              <div className="flex justify-between text-xs font-bold">
                <span className="flex items-center gap-2 text-orange-600 dark:text-orange-400 group-hover:text-orange-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-orange-400 inline-block"></span>
                  Pending / Not Started
                </span>
                <span className="text-slate-700 dark:text-slate-300">{overallPending} / {overallTotal}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-7 overflow-hidden relative shadow-inner">
                <div
                  className="bg-gradient-to-r from-orange-400 to-orange-500 h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-3 group-hover:brightness-110"
                  style={{ width: overallTotal > 0 ? `${Math.max(Math.round((overallPending / overallTotal) * 100), overallPending > 0 ? 8 : 0)}%` : '0%' }}
                >
                  {overallPending > 0 && (
                    <span className="text-[11px] font-black text-white">{Math.round((overallPending / overallTotal) * 100)}%</span>
                  )}
                </div>
              </div>
            </div>

            {/* Total tasks */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Assigned Tasks</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">{overallTotal}</span>
            </div>
          </div>
        </div>

      </div>

      {/* 2.5. Plan Renewals vs Non-Renewals Revenue Health & Progress Bar Card */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-900 shadow-inner shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span>Plan Renewals vs Non-Renewals</span>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full border border-purple-100 dark:border-purple-800/40">
                  {selectedRevenueMonth === 'all' ? 'All Months Portfolio' : `${availableRevenueMonths.find(m => m.key === selectedRevenueMonth)?.label || selectedRevenueMonth}`}
                </span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                Real-time tracking of renewed subscription revenue vs overdue / unrenewed plan revenue at risk
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {allExtendedClientsCount > 0 && (
              <button
                type="button"
                onClick={() => onSelectTab && onSelectTab('renewals', { renewalFilter: 'Extended' })}
                className="px-2.5 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 border border-purple-300 dark:border-purple-800 text-purple-800 dark:text-purple-300 text-xs font-black transition flex items-center gap-1 cursor-pointer shadow-xs"
                title="Click to view all extended person & package lists in Renewals Hub"
              >
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                <span>{allExtendedClientsCount} Extended Clients</span>
              </button>
            )}
            <span className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-300 text-xs font-black">
              Renewal Conversion: {renewalPercent}%
            </span>
          </div>
        </div>

        {/* Dual-Segment Progress Bar */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-bold gap-2">
            <span className="flex flex-wrap items-center gap-1.5 text-purple-700 dark:text-purple-400">
              <span className="w-3 h-3 rounded-full bg-purple-600 inline-block shadow-sm shrink-0"></span>
              <span>🔄 Renewed:</span>
              <span className="font-extrabold text-slate-900 dark:text-white">₹{renewalsExpected.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 font-semibold">({renewalsCount} clients • {renewalPercent}%)</span>
            </span>
            <span className="flex flex-wrap items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-sm shrink-0"></span>
              <span>⚠️ Not Renewed:</span>
              <span className="font-extrabold text-slate-900 dark:text-white">₹{notRenewedExpected.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 font-semibold">({notRenewedCount} clients • {notRenewedPercent}%)</span>
            </span>
          </div>

          {/* Stacked Interactive Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-7 rounded-2xl overflow-hidden flex shadow-inner p-1 gap-1">
            {renewalsExpected > 0 && (
              <div 
                className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-xl transition-all duration-1000 ease-out flex items-center justify-center text-[10px] font-black text-white px-2 shadow-sm"
                style={{ width: `${Math.max(renewalPercent, 12)}%` }}
                title={`Renewed: ₹${renewalsExpected.toLocaleString()} (${renewalsCount} accounts)`}
              >
                {renewalPercent}% Renewed (₹{renewalsExpected.toLocaleString()})
              </div>
            )}
            {notRenewedExpected > 0 && (
              <div 
                className="bg-gradient-to-r from-rose-500 to-red-600 h-full rounded-xl transition-all duration-1000 ease-out flex items-center justify-center text-[10px] font-black text-white px-2 shadow-sm"
                style={{ width: `${Math.max(notRenewedPercent, 12)}%` }}
                title={`Not Renewed / Expired: ₹${notRenewedExpected.toLocaleString()} (${notRenewedCount} accounts)`}
              >
                {notRenewedPercent}% Not Renewed (₹{notRenewedExpected.toLocaleString()})
              </div>
            )}
            {totalPoolRevenue === 0 && (
              <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-400 font-bold">
                No renewal cycle data recorded in this period
              </div>
            )}
          </div>
        </div>

        {/* 4 Detail Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs">
          {/* 1. Renewed Revenue */}
          <div 
            onClick={() => onSelectTab && onSelectTab('renewals', { renewalFilter: 'Active' })}
            className="p-3.5 bg-purple-50/70 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-800/40 rounded-xl flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.99] transition-all"
            title="Click to view renewed active accounts in Renewals Hub"
          >
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-purple-700 dark:text-purple-400">
              <span>🔄 Renewed Revenue</span>
              <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 font-black">{renewalsCount} Accounts</span>
            </div>
            <div className="my-1.5">
              <div className="text-lg font-black text-purple-700 dark:text-purple-300">
                ₹{renewalsExpected.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Cash Collected: <b className="text-emerald-600 font-bold">₹{renewalsActual.toLocaleString()}</b>
              </div>
            </div>
            <span className="text-[9px] text-purple-600 dark:text-purple-400 font-semibold">
              ✓ Active cycle renewed →
            </span>
          </div>

          {/* 2. Not Renewed / Expired Revenue */}
          <div 
            onClick={() => onSelectTab && onSelectTab('renewals', { renewalFilter: 'Expired' })}
            className="p-3.5 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-800/40 rounded-xl flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.99] transition-all"
            title="Click to view all overdue expired contracts requiring renewal"
          >
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-rose-700 dark:text-rose-400">
              <span>⚠️ Not Renewed (Expired)</span>
              <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 font-black">{notRenewedCount} Accounts</span>
            </div>
            <div className="my-1.5">
              <div className="text-lg font-black text-rose-600 dark:text-rose-400">
                ₹{notRenewedExpected.toLocaleString()}
              </div>
              <div className="text-[10px] text-rose-600 dark:text-rose-300 font-semibold mt-0.5">
                Revenue at risk (Overdue)
              </div>
            </div>
            <span className="text-[9px] text-rose-500 font-semibold">
              ⚠️ Immediate renewal required →
            </span>
          </div>

          {/* 3. Expiring Soon Revenue */}
          <div 
            onClick={() => onSelectTab && onSelectTab('renewals', { renewalFilter: 'Expiring Soon' })}
            className="p-3.5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-800/40 rounded-xl flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.99] transition-all"
            title="Click to view contracts expiring within 7 days in Renewals Hub"
          >
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-400">
              <span>⏳ Expiring Soon (7 Days)</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 font-black">{expiringSoonCount} Accounts</span>
            </div>
            <div className="my-1.5">
              <div className="text-lg font-black text-amber-600 dark:text-amber-400">
                ₹{expiringSoonExpected.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Within 7 days of contract renewal
              </div>
            </div>
            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold">
              Upcoming renewal pipeline →
            </span>
          </div>

          {/* 4. Renewal Conversion Rate */}
          <div 
            onClick={() => onSelectTab && onSelectTab('renewals', { renewalFilter: 'All' })}
            className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800/40 rounded-xl flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.99] transition-all"
            title="Click to open full Renewals & Retention Hub"
          >
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-indigo-700 dark:text-indigo-400">
              <span>📊 Retention Rate</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 font-black">{renewalPercent}%</span>
            </div>
            <div className="my-1.5">
              <div className="text-lg font-black text-indigo-700 dark:text-indigo-300">
                {totalActiveOngoingCount} / {totalAccountsInPool} Active
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {notRenewedCount} contracts pending renewal
              </div>
            </div>
            <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold">
              Active plan retention rate →
            </span>
          </div>
        </div>
      </div>

      {/* 3. Employee Performance & Invoice Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Employee Tracker Table */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-850/50">
            <div>
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                Employee Performance & Task Tracker
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Live performance ratings based on on-time delivery, output volume, and attendance.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {onSelectTab && (
                <button
                  type="button"
                  onClick={() => onSelectTab('employee-performance')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl transition border border-indigo-200 dark:border-indigo-800"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Full Performance Hub
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-[620px] w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-white dark:bg-slate-900 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider">
                  <th className="p-4 pl-6">Employee</th>
                  <th className="p-4 text-center">Score</th>
                  <th className="p-4 text-center">On-Time</th>
                  <th className="p-4 text-center">Pending</th>
                  <th className="p-4 text-center">Completed</th>
                  <th className="p-4 text-center">Overdue</th>
                  <th className="p-4 pr-6 text-right">Tasks Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {(performanceOverview.employees.length === 0 && employeeData.length === 0) ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                      No active employee tracking data found
                    </td>
                  </tr>
                ) : (
                  (performanceOverview.employees.length > 0 ? performanceOverview.employees : employeeData).map((emp, idx) => {
                    const score = emp.compositeScore ?? (emp.total > 0 ? Math.round((emp.done / emp.total) * 100) : 0);
                    const tierBadge = emp.tier?.badge ?? (score >= 80 ? '🌟 Star' : score >= 60 ? '🟢 High' : '🟡 Average');
                    const tierBadgeColor = emp.tier?.badgeColor ?? 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    const onTimeRate = emp.onTimeRate ?? (emp.total > 0 ? Math.round((emp.done / emp.total) * 100) : 100);
                    const pendingCount = emp.inProgressCount ?? emp.pending ?? 0;
                    const doneCount = emp.completedCount ?? emp.done ?? 0;
                    const overdueCount = emp.overdueCount ?? 0;
                    const totalTasksCount = emp.allTasksList ? emp.allTasksList.length : (emp.totalAssigned || emp.total || 0);

                    return (
                      <tr
                        key={emp.id ? `emp-row-${emp.id}-${idx}` : `emp-row-${emp.name}-${idx}`}
                        onClick={() => setSelectedEmployeeForTasks(emp)}
                        className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/60 transition cursor-pointer group"
                        title="Click to view all tasks filtered for this employee"
                      >
                        <td className="p-4 pl-6 font-bold text-slate-900 dark:text-white flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs border border-indigo-200 dark:border-indigo-800 group-hover:scale-105 transition-transform">
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">{emp.name}</span>
                              <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-black border ${tierBadgeColor}`}>
                                {tierBadge}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {emp.department || 'Specialist'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="inline-flex items-baseline gap-0.5">
                            <span className="font-black text-xs text-slate-900 dark:text-white">{score}</span>
                            <span className="text-[9px] text-slate-400">/100</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2 py-0.5 font-extrabold text-xs rounded-lg ${onTimeRate >= 80 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'}`}>
                            {onTimeRate}%
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 font-bold rounded-lg text-xs ${pendingCount > 20 ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' : 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400'}`}>
                            {pendingCount}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-block px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold rounded-lg text-xs">
                            {doneCount}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {overdueCount > 0 ? (
                            <span className="inline-block px-2 py-0.5 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 font-black text-[11px] rounded-md border border-red-200 dark:border-red-900">
                              {overdueCount} Overdue
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-slate-400">0</span>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEmployeeForTasks(emp);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 transition shadow-xs inline-flex items-center gap-1.5"
                          >
                            <span>Tasks</span>
                            <span className="bg-indigo-200/70 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                              {totalTasksCount}
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Status & Small summaries */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-500" />
              Invoice Status
            </h4>
            <div className="space-y-5">
              <div 
                onClick={() => onSelectTab && onSelectTab('clients', { paymentFilter: 'full' })}
                className="cursor-pointer p-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all group"
                title="Click to view fully paid accounts in CRM"
              >
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 group-hover:text-emerald-600 transition"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>Done ({topLevelMetrics.paymentReceivedCount})</span>
                  <span className="text-emerald-600">{Math.round((topLevelMetrics.paymentReceivedCount / (topLevelMetrics.paymentReceivedCount + topLevelMetrics.paymentPendingCount)) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{width: `${(topLevelMetrics.paymentReceivedCount / (topLevelMetrics.paymentReceivedCount + topLevelMetrics.paymentPendingCount)) * 100}%`}}></div>
                </div>
              </div>
              <div 
                onClick={() => onSelectTab && onSelectTab('pending-payments', { paymentTabFilter: 'All' })}
                className="cursor-pointer p-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all group"
                title="Click to view Pending Payment accounts"
              >
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 group-hover:text-orange-500 transition"><div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>Pending ({topLevelMetrics.paymentPendingCount})</span>
                  <span className="text-orange-500">{Math.round((topLevelMetrics.paymentPendingCount / (topLevelMetrics.paymentReceivedCount + topLevelMetrics.paymentPendingCount)) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                  <div className="bg-orange-400 h-2 rounded-full" style={{width: `${(topLevelMetrics.paymentPendingCount / (topLevelMetrics.paymentReceivedCount + topLevelMetrics.paymentPendingCount)) * 100}%`}}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 via-blue-700 to-purple-800 rounded-2xl border border-indigo-500/30 p-6 shadow-lg text-white relative overflow-hidden flex-grow flex flex-col justify-between">
            {/* Decorative blobs */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
            <div className="absolute -bottom-6 -left-4 w-20 h-20 bg-purple-400/20 rounded-full blur-xl pointer-events-none"></div>

            <div className="relative z-10">
              <h4 className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Daily Summary</h4>
              <p className="text-xl font-black mb-0.5">Today&apos;s Tasks</p>
              <p className="text-xs text-blue-300 font-semibold mb-5">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>

            {/* Progress bars */}
            <div className="space-y-4 relative z-10">
              {/* Completed */}
              <div 
                onClick={() => onSelectTab && onSelectTab('deliverables', { deliverableStatusFilter: 'Complete Task' })}
                className="cursor-pointer p-1.5 -mx-1.5 rounded-xl hover:bg-white/10 transition-all group"
                title="Click to view Completed Tasks in Task Manager"
              >
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5 text-emerald-300"><CheckCircle className="w-3.5 h-3.5" /> Completed</span>
                  <span className="text-white font-black">{todayCompleted}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: todayTotal > 0 ? `${Math.round((todayCompleted / todayTotal) * 100)}%` : '0%' }}
                  />
                </div>
              </div>

              {/* Pending */}
              <div 
                onClick={() => onSelectTab && onSelectTab('deliverables', { deliverableStatusFilter: 'Working On It' })}
                className="cursor-pointer p-1.5 -mx-1.5 rounded-xl hover:bg-white/10 transition-all group"
                title="Click to view In-Progress Tasks in Task Manager"
              >
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5 text-orange-300"><Clock className="w-3.5 h-3.5" /> Pending</span>
                  <span className="text-white font-black">{todayPending}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-orange-400 to-orange-500 h-full rounded-full transition-all duration-1000 delay-200"
                    style={{ width: todayTotal > 0 ? `${Math.round((todayPending / todayTotal) * 100)}%` : '0%' }}
                  />
                </div>
              </div>

              {/* Total */}
              <div 
                onClick={() => onSelectTab && onSelectTab('deliverables', { deliverableStatusFilter: 'all' })}
                className="flex items-center justify-between pt-3 border-t border-white/10 cursor-pointer p-1.5 -mx-1.5 rounded-xl hover:bg-white/10 transition-all group"
                title="Click to view All Deliverables in Task Manager"
              >
                <span className="flex items-center gap-1.5 text-xs font-bold text-blue-200"><FileText className="w-3.5 h-3.5" /> Total Today</span>
                <span className="text-2xl font-black text-white">{todayTotal}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Today's & Carry-Forward Overdue Tasks by Employee */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-500" />
              Employee Task Board (Today & Carry-Forward)
              <span className="text-[11px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800/30 ml-1">
                {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Admin view for today&apos;s duties and compulsory carry-forward tasks from previous days / leaves.</p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setTaskFilterTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${taskFilterTab === 'all' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              All ({todayTotal})
            </button>
            <button
              onClick={() => setTaskFilterTab('today')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${taskFilterTab === 'today' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Today ({todayFreshCount})
            </button>
            <button
              onClick={() => setTaskFilterTab('overdue')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${taskFilterTab === 'overdue' ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Overdue ({todayOverdueCount})
            </button>
          </div>
        </div>

        {todayEmployeeList.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-12 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500">No tasks found for selected filter</p>
            <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Tasks scheduled for today or carry-forward pending tasks will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {todayEmployeeList.map((emp) => (
              <EmployeeTaskCard
                key={emp.name}
                emp={emp}
                onOpenTasksModal={(employeeCard) => {
                  const matched = performanceOverview.employees.find(e => e.name.toLowerCase() === employeeCard.name.toLowerCase());
                  if (matched) {
                    setSelectedEmployeeForTasks(matched);
                  } else {
                    setSelectedEmployeeForTasks({
                      name: employeeCard.name,
                      department: 'Specialist',
                      designation: 'Specialist',
                      allTasksList: employeeCard.tasks.map(t => ({
                        id: t.id || t.taskId || t.deliveryId,
                        taskId: t.taskId || t.deliveryId || `T-${t.id}`,
                        title: t.taskTitle || t.postType || 'Task',
                        client: t.businessName || t.clientName || t.clientId,
                        date: t.date || t.postDate || t.dueDate,
                        type: t._type === 'delivery' ? 'Delivery' : 'Client Task',
                        category: t.postType || t.service || 'Creative Work',
                        priority: t.priority || 'Normal',
                        status: t.status === 'DONE' || t.status === 'Delivered' || t.status === 'Completed' ? 'Completed' : (t.overdue ? 'Overdue' : 'Working On It'),
                        workSampleUrl: t.workSampleUrl
                      }))
                    });
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Employee Total Tasks Filtered Modal */}
      {selectedEmployeeForTasks && (
        <EmployeeTasksModal
          employee={selectedEmployeeForTasks}
          employees={employees}
          onClose={() => setSelectedEmployeeForTasks(null)}
          onTaskTransferred={refreshData}
        />
      )}

    </div>
  );
}

const STATUS_CONFIG = {
  'DONE':        { label: 'Done',        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500' },
  'Completed':   { label: 'Completed',   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500' },
  'In Progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',           dot: 'bg-blue-500'   },
  'Not Started': { label: 'Not Started', color: 'bg-slate-100 text-slate-650 dark:bg-slate-800 dark:text-slate-400',          dot: 'bg-slate-400'  },
  'Pending':     { label: 'Pending',     color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',   dot: 'bg-orange-400' },
  'On Hold':     { label: 'On Hold',     color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',  dot: 'bg-yellow-400' },
  'Processing':  { label: 'Processing',  color: 'bg-blue-100 text-blue-750 dark:bg-blue-900/40 dark:text-blue-300',           dot: 'bg-blue-500'   },
  'Client Review':{ label: 'Client Review',color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',      dot: 'bg-amber-500'  },
  'Revision':    { label: 'Revision',    color: 'bg-red-105 text-red-700 dark:bg-red-900/40 dark:text-red-300',              dot: 'bg-red-500'    },
  'Completion':  { label: 'Posted / Completed', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500' },
  'Overdue':     { label: 'Overdue',     color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',           dot: 'bg-rose-500'   },
  'Approval':    { label: 'Approval',    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',     dot: 'bg-purple-500' },
};

const PRIORITY_CONFIG = {
  'Urgent': { color: 'text-rose-600',   bg: 'bg-rose-50 dark:bg-rose-900/30'   },
  'High':   { color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/30' },
  'Normal': { color: 'text-slate-500',  bg: 'bg-slate-50 dark:bg-slate-800'   },
  'Low':    { color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
};

function EmployeeTaskCard({ emp, onOpenTasksModal }) {
  const [expanded, setExpanded] = useState(true);
  const completionPct = emp.tasks.length > 0 ? Math.round((emp.done / emp.tasks.length) * 100) : 0;

  const avatarColors = [
    'from-violet-400 to-purple-500',
    'from-blue-400 to-indigo-500',
    'from-emerald-400 to-teal-500',
    'from-orange-400 to-rose-500',
    'from-pink-400 to-fuchsia-500',
    'from-cyan-400 to-sky-500',
  ];
  const colorIdx = emp.name.charCodeAt(0) % avatarColors.length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
      {/* Employee Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarColors[colorIdx]} text-white flex items-center justify-center text-sm font-black shadow-sm flex-shrink-0`}>
          {emp.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{emp.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{emp.done} done</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-[11px] font-bold text-orange-500">{emp.pending} pending</span>
            {emp.overdue > 0 && (
              <>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-[11px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.2 rounded">{emp.overdue} overdue</span>
              </>
            )}
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-[11px] font-bold text-purple-500">{emp.tasks.filter(t => t._type !== 'delivery').length}T</span>
            <span className="text-[11px] font-bold text-blue-500">{emp.tasks.filter(t => t._type === 'delivery').length}D</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onOpenTasksModal && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenTasksModal(emp);
              }}
              className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 transition shadow-xs"
              title={`View all tasks for ${emp.name}`}
            >
              All Tasks
            </button>
          )}
          <span className="text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">{emp.tasks.length}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Completion bar */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-slate-400">{completionPct}%</span>
        </div>
      </div>

      {/* Task List */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800/50 max-h-72 overflow-y-auto">
          {emp.tasks.map((task, idx) => {
            const sCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG['Not Started'];
            const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG['Normal'];
            const isDelivery = task._type === 'delivery';
            return (
              <div key={idx} className={`px-4 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition ${isDelivery ? 'border-l-2 border-blue-300 dark:border-blue-700' : 'border-l-2 border-purple-300 dark:border-purple-800'}`}>
                <div className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${sCfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-1 py-0.5 rounded ${isDelivery ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300'}`}>
                        {isDelivery ? 'Delivery' : 'Task'}
                      </span>
                      {task._isOverdue && (
                        <span className="text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          ⚠️ Overdue / Yesterday ({task.date || task.postDate})
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={task.taskTitle}>
                      {task.taskTitle || '—'}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {task.businessName || task.clientId || '—'}
                      {task.postType ? ` · ${task.postType}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${sCfg.color}`}>
                      {sCfg.label}
                    </span>
                    {task.priority && task.priority !== 'Normal' && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${pCfg.bg} ${pCfg.color}`}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
