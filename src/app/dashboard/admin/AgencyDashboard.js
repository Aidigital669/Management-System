'use client';

import React, { useState } from 'react';
import { 
  Users, DollarSign, FileText, CheckCircle, Clock, Truck, FileCheck, Target,
  ChevronDown, ChevronUp, BarChart2, AlertCircle, Layers, RefreshCw, AlertTriangle, TrendingUp, Tag
} from 'lucide-react';
import {
  parseDbDate,
  formatDateToDb,
  getPlanDurationDays,
  getPlanDurationLabel,
  getClientPlanInfo,
  isClientActiveInMonth,
  getClientRevenueStream,
  getClientMonthKey
} from '@/lib/planUtils';

export default function AgencyDashboard({ deliveries = [], clients = [], tasks = [] }) {
  
  const activeClients = clients.filter(c => c.active).length;
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

  // --- DATASET 2: TODAY'S & CARRY-FORWARD OVERDUE ITEMS ---
  const todayStr = new Date().toISOString().slice(0, 10);
  const [taskFilterTab, setTaskFilterTab] = useState('all'); // 'all', 'today', 'overdue'
  const [selectedRevenueMonth, setSelectedRevenueMonth] = useState('all'); // 'all' or 'YYYY-MM'
  const [revenueStartDate, setRevenueStartDate] = useState('');
  const [revenueEndDate, setRevenueEndDate] = useState('');

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
    const now = new Date();
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthKeys.add(curKey);

    clients.forEach(c => {
      const info = getClientPlanInfo(c);
      if (info.cycleMonthKey) monthKeys.add(info.cycleMonthKey);
      if (info.renewalMonthKey) monthKeys.add(info.renewalMonthKey);
      const mk = getClientMonthKey(c);
      if (mk) monthKeys.add(mk);
    });

    const sortedKeys = Array.from(monthKeys).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map(mk => {
      const [yyyy, mm] = mk.split('-');
      const dateObj = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, 1);
      const label = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      // Count clients active in that month
      let activeCount = 0;
      let monthRevenue = 0;
      clients.forEach(c => {
        if (c.active && isClientActiveInMonth(c, mk)) {
          activeCount += 1;
          monthRevenue += (c.packageAmount || 0);
        }
      });

      return { key: mk, label, count: activeCount, revenue: monthRevenue };
    });
  }, [clients]);

  // Filter clients for selected month or date range (accurately includes clients whose plan is active in the period)
  const filteredRevenueClients = React.useMemo(() => {
    if (revenueStartDate || revenueEndDate) {
      return clients.filter(c => isClientActiveInMonth(c, null, revenueStartDate, revenueEndDate));
    }
    if (selectedRevenueMonth === 'all') return clients;
    return clients.filter(c => isClientActiveInMonth(c, selectedRevenueMonth));
  }, [clients, selectedRevenueMonth, revenueStartDate, revenueEndDate]);

  // Helper to determine plan cycle health for a client using dynamic duration (30, 90, 180, 365 days)
  const getClientPlanHealth = (client) => {
    return getClientPlanInfo(client);
  };

  // Compute revenue/billing details dynamically for the filtered month
  let dynamicTotalRevenue = 0;       // Received revenue
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
    if (!c.active) return;
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

    if (health.status === 'Expired') {
      notRenewedCount += 1;
      notRenewedExpected += pkgAmt;
    } else if (stream.type === 'Renewal') {
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

  const pendingRevenue = Math.max(0, dynamicEstimatedRevenue - dynamicTotalRevenue);

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

  // Sum up actual employee stats from rows
  const employeeTaskDone = employeeData.reduce((sum, emp) => sum + emp.done, 0);
  const employeeTaskPending = employeeData.reduce((sum, emp) => sum + emp.pending, 0);

  const topLevelMetrics = {
    activeClients,
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Active Clients */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="space-y-1.5 relative z-10">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-extrabold font-sans">Active Clients</span>
            <div className="flex items-end gap-1.5">
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{filteredRevenueClients.filter(c => c.active).length}</h3>
              <span className="text-xs text-slate-400 font-semibold mb-0.5">/ {filteredRevenueClients.length} in period</span>
            </div>
            <span className="text-[9px] text-blue-500 font-bold bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800/30 block w-fit">
              {selectedRevenueMonth === 'all' ? 'All CRM Accounts' : `${availableRevenueMonths.find(m => m.key === selectedRevenueMonth)?.label || selectedRevenueMonth}`}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center relative z-10 shadow-inner border border-blue-100 dark:border-blue-900 shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Actual Revenue (Collected) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="space-y-1.5 relative z-10">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-extrabold font-sans">Actual Revenue</span>
            <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">₹{dynamicTotalRevenue.toLocaleString()}</h3>
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800/40 block w-fit">
              Collected ({revReceivedPercent}%)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center relative z-10 shadow-inner border border-emerald-100 dark:border-emerald-900 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Expected Revenue (Total Target) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="space-y-1.5 relative z-10">
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-extrabold font-sans">Expected Revenue</span>
            <h3 className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">₹{dynamicEstimatedRevenue.toLocaleString()}</h3>
            <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800/40 block w-fit">
              Target Billing (100%)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center relative z-10 shadow-inner border border-indigo-100 dark:border-indigo-900 shrink-0">
            <BarChart2 className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Revenue (Outstanding) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="space-y-1.5 relative z-10">
            <span className="text-[10px] text-orange-600 dark:text-orange-400 uppercase tracking-widest font-extrabold font-sans">Pending Revenue</span>
            <h3 className="text-2xl font-extrabold text-orange-500">₹{pendingRevenue.toLocaleString()}</h3>
            <span className="text-[9px] text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-full border border-orange-100 dark:border-orange-800/40 block w-fit">
              Outstanding ({revPendingPercent}%)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center relative z-10 shadow-inner border border-orange-100 dark:border-orange-900 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Tasks & Deliveries Pipeline */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="space-y-1.5 relative z-10">
            <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase tracking-widest font-extrabold font-sans">Pipeline</span>
            <div className="flex items-end gap-1.5">
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{topLevelMetrics.taskPending + topLevelMetrics.deliveryPending}</h3>
              <span className="text-xs text-slate-400 font-semibold mb-0.5">Pending</span>
            </div>
            <span className="text-[9px] text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full border border-purple-100 dark:border-purple-800/30 block w-fit">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>Revenue Breakdown</span>
                  <span className="text-xs font-semibold text-slate-400 hidden xl:inline">(Actual vs Expected vs Pending)</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Period: <span className="font-bold text-slate-700 dark:text-slate-300">{selectedRevenueMonth === 'all' ? 'All Months' : (availableRevenueMonths.find(m => m.key === selectedRevenueMonth)?.label || selectedRevenueMonth)}</span> • {filteredRevenueClients.filter(c => c.active).length} Active Accounts
                </p>
              </div>

              {/* Month Selector Dropdown */}
              <div className="shrink-0">
                <select
                  value={selectedRevenueMonth}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedRevenueMonth(val);
                    if (val === 'all') {
                      setRevenueStartDate('');
                      setRevenueEndDate('');
                    } else {
                      const [yyyy, mm] = val.split('-');
                      const y = parseInt(yyyy, 10);
                      const m = parseInt(mm, 10);
                      setRevenueStartDate(`${y}-${String(m).padStart(2, '0')}-01`);
                      const lastDate = new Date(y, m, 0).getDate();
                      setRevenueEndDate(`${y}-${String(m).padStart(2, '0')}-${String(lastDate).padStart(2, '0')}`);
                    }
                  }}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500 transition cursor-pointer shadow-xs w-full sm:w-auto"
                >
                  <option value="all">🌐 All Months (Combined)</option>
                  {availableRevenueMonths.map(m => (
                    <option key={m.key} value={m.key}>
                      📅 {m.label} ({m.count} clients)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Month Filter Pills & Date Range in a dedicated secondary toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              {/* Month Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar flex-nowrap sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => { setSelectedRevenueMonth('all'); setRevenueStartDate(''); setRevenueEndDate(''); }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer shrink-0 ${
                    selectedRevenueMonth === 'all' && !revenueStartDate && !revenueEndDate
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  All Months
                </button>
                {availableRevenueMonths.map(m => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => {
                      setSelectedRevenueMonth(m.key);
                      const [yyyy, mm] = m.key.split('-');
                      const y = parseInt(yyyy, 10);
                      const mInt = parseInt(mm, 10);
                      setRevenueStartDate(`${y}-${String(mInt).padStart(2, '0')}-01`);
                      const lastDate = new Date(y, mInt, 0).getDate();
                      setRevenueEndDate(`${y}-${String(mInt).padStart(2, '0')}-${String(lastDate).padStart(2, '0')}`);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                      selectedRevenueMonth === m.key
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{m.label.split(' ')[0]}</span>
                    <span className="text-[9px] opacity-75 font-normal">({m.count})</span>
                  </button>
                ))}
              </div>

              {/* Date Range: Fluid on mobile, compact on desktop */}
              <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1.5 bg-slate-50 dark:bg-slate-800/80 p-1.5 sm:px-2 sm:py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs shrink-0">
                <div className="flex items-center gap-1 flex-1 sm:flex-initial min-w-0">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0">From</span>
                  <input
                    type="date"
                    value={revenueStartDate}
                    onChange={(e) => { setRevenueStartDate(e.target.value); setSelectedRevenueMonth('custom'); }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-1 sm:py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-inner w-full sm:w-[115px] min-w-0"
                  />
                </div>
                <span className="text-slate-400 font-bold text-xs shrink-0">-</span>
                <div className="flex items-center gap-1 flex-1 sm:flex-initial min-w-0">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0">To</span>
                  <input
                    type="date"
                    value={revenueEndDate}
                    onChange={(e) => { setRevenueEndDate(e.target.value); setSelectedRevenueMonth('custom'); }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-1 sm:py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-inner w-full sm:w-[115px] min-w-0"
                  />
                </div>
                {(revenueStartDate || revenueEndDate) && (
                  <button
                    type="button"
                    onClick={() => { setRevenueStartDate(''); setRevenueEndDate(''); setSelectedRevenueMonth('all'); }}
                    className="ml-0.5 px-1.5 py-0.5 text-[10px] font-black text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition cursor-pointer shrink-0"
                    title="Clear Date Range"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-5 my-auto">
            {/* 1. Actual Revenue */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Actual Revenue (Collected)</span>
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
              <div className="text-[10px] text-slate-400 text-right">{paymentReceivedCount} accounts paid</div>
            </div>

            {/* 2. Expected Revenue */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Expected Revenue (Total Target)</span>
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
              <div className="text-[10px] text-slate-400 text-right">{filteredRevenueClients.filter(c => c.active).length} active contracts</div>
            </div>

            {/* 3. Pending Revenue */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pending Revenue (Outstanding)</span>
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
              <div className="text-[10px] text-slate-400 text-right">{paymentPendingCount} accounts pending</div>
            </div>
          </div>
          
          {/* Interlinked Revenue Streams Breakdown */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="bg-emerald-50/70 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-800/30 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold uppercase">🛒 New Purchases</span>
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.2 rounded">{newPurchasesCount}</span>
              </div>
              <div className="mt-1.5">
                <span className="text-xs font-black text-slate-900 dark:text-white">₹{newPurchasesExpected.toLocaleString()}</span>
                <div className="text-[9px] text-slate-400">Paid: <span className="font-bold text-emerald-600">₹{newPurchasesActual.toLocaleString()}</span></div>
              </div>
            </div>

            <div className="bg-purple-50/70 dark:bg-purple-950/20 p-2.5 rounded-xl border border-purple-100 dark:border-purple-800/30 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-purple-700 dark:text-purple-400 font-extrabold uppercase">🔄 Renewals</span>
                <span className="text-[9px] font-bold text-purple-700 bg-purple-100 dark:bg-purple-900/50 px-1.5 py-0.2 rounded">{renewalsCount}</span>
              </div>
              <div className="mt-1.5">
                <span className="text-xs font-black text-slate-900 dark:text-white">₹{renewalsExpected.toLocaleString()}</span>
                <div className="text-[9px] text-slate-400">Paid: <span className="font-bold text-purple-600">₹{renewalsActual.toLocaleString()}</span></div>
              </div>
            </div>

            <div className="bg-blue-50/70 dark:bg-blue-950/20 p-2.5 rounded-xl border border-blue-100 dark:border-blue-800/30 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-blue-700 dark:text-blue-400 font-extrabold uppercase">💼 Retainers</span>
                <span className="text-[9px] font-bold text-blue-700 bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.2 rounded">{retainersCount}</span>
              </div>
              <div className="mt-1.5">
                <span className="text-xs font-black text-slate-900 dark:text-white">₹{retainersExpected.toLocaleString()}</span>
                <div className="text-[9px] text-slate-400">Paid: <span className="font-bold text-blue-600">₹{retainersActual.toLocaleString()}</span></div>
              </div>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-xs">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-xl border border-emerald-100 dark:border-emerald-800/30 min-w-0">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block truncate">Actual</span>
              <span className="text-[11px] sm:text-xs font-extrabold text-emerald-800 dark:text-emerald-300 block truncate">₹{dynamicTotalRevenue.toLocaleString()}</span>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-950/30 p-2 rounded-xl border border-indigo-100 dark:border-indigo-800/30 min-w-0">
              <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold block truncate">Expected</span>
              <span className="text-[11px] sm:text-xs font-extrabold text-indigo-800 dark:text-indigo-300 block truncate">₹{dynamicEstimatedRevenue.toLocaleString()}</span>
            </div>
            <div className="bg-orange-50 dark:bg-orange-950/30 p-2 rounded-xl border border-orange-100 dark:border-orange-800/30 min-w-0">
              <span className="text-[10px] text-orange-700 dark:text-orange-400 font-bold block truncate">Pending</span>
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

          {/* Bar Chart */}
          <div className="space-y-5 my-auto">
            {/* Completed bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
                  Completed Tasks
                </span>
                <span className="text-slate-700 dark:text-slate-300">{overallCompleted} / {overallTotal}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-7 overflow-hidden relative shadow-inner">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-3"
                  style={{ width: overallTotal > 0 ? `${Math.max(Math.round((overallCompleted / overallTotal) * 100), overallCompleted > 0 ? 8 : 0)}%` : '0%' }}
                >
                  {overallCompleted > 0 && (
                    <span className="text-[11px] font-black text-white">{Math.round((overallCompleted / overallTotal) * 100)}%</span>
                  )}
                </div>
              </div>
            </div>

            {/* Pending bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-orange-400 inline-block"></span>
                  Pending / Not Started
                </span>
                <span className="text-slate-700 dark:text-slate-300">{overallPending} / {overallTotal}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-7 overflow-hidden relative shadow-inner">
                <div
                  className="bg-gradient-to-r from-orange-400 to-orange-500 h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-3"
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
          <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-800/40 rounded-xl flex flex-col justify-between">
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
              ✓ Active cycle renewed
            </span>
          </div>

          {/* 2. Not Renewed / Expired Revenue */}
          <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-800/40 rounded-xl flex flex-col justify-between">
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
              ⚠️ Immediate renewal required
            </span>
          </div>

          {/* 3. Expiring Soon Revenue */}
          <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-800/40 rounded-xl flex flex-col justify-between">
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
              Upcoming renewal pipeline
            </span>
          </div>

          {/* 4. Renewal Conversion Rate */}
          <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800/40 rounded-xl flex flex-col justify-between">
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
              Active plan retention rate
            </span>
          </div>
        </div>
      </div>

      {/* 3. Employee Performance & Invoice Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Employee Tracker Table */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-850/50">
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Employee Task Tracker
            </h4>
            <div className="flex gap-4 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Done ({topLevelMetrics.employeeTaskDone})</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Pending ({topLevelMetrics.employeeTaskPending})</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-[520px] w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-white dark:bg-slate-900 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider">
                  <th className="p-4 pl-6">Employee</th>
                  <th className="p-4 text-center">Pending Tasks</th>
                  <th className="p-4 text-center">Completed</th>
                  <th className="p-4 pr-6 text-right">Total Assigned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {employeeData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                      No active employee tracking data found
                    </td>
                  </tr>
                ) : (
                  employeeData.map((emp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition">
                      <td className="p-4 pl-6 font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs border border-indigo-200 dark:border-indigo-800">
                          {emp.name.charAt(0)}
                        </div>
                        {emp.name}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-3 py-1 font-bold rounded-lg min-w-[3rem] ${emp.pending > 30 ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' : 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400'}`}>
                          {emp.pending}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-block px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold rounded-lg min-w-[3rem]">
                          {emp.done}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right font-extrabold text-slate-700 dark:text-slate-300">
                        {emp.total}
                      </td>
                    </tr>
                  ))
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
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>Done ({topLevelMetrics.paymentReceivedCount})</span>
                  <span className="text-emerald-600">{Math.round((topLevelMetrics.paymentReceivedCount / (topLevelMetrics.paymentReceivedCount + topLevelMetrics.paymentPendingCount)) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{width: `${(topLevelMetrics.paymentReceivedCount / (topLevelMetrics.paymentReceivedCount + topLevelMetrics.paymentPendingCount)) * 100}%`}}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>Pending ({topLevelMetrics.paymentPendingCount})</span>
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
              <div>
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
              <div>
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
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
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
              <EmployeeTaskCard key={emp.name} emp={emp} />
            ))}
          </div>
        )}
      </div>

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
  'Overdue':     { label: 'Overdue',     color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',          dot: 'bg-rose-500'   },
};

const PRIORITY_CONFIG = {
  'High':   { color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-900/30'    },
  'Normal': { color: 'text-slate-500',  bg: 'bg-slate-50 dark:bg-slate-800'   },
  'Low':    { color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
};

function EmployeeTaskCard({ emp }) {
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
