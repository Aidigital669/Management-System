'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  ShieldAlert,
  DollarSign,
  TrendingUp,
  LogOut,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Building,
  UserCheck,
  UserX,
  Search,
  CheckCircle,
  FileText,
  AlertCircle,
  Activity,
  Layers,
  Moon,
  Sun,
  Send,
  CheckSquare,
  BarChart2,
  RefreshCw,
  Menu,
  X,
  FileSpreadsheet
} from 'lucide-react';
import ExcelImportModal from '@/components/ExcelImportModal';
import {
  parseDbDate as parsePlanDbDate,
  formatDateToDb,
  getPlanDurationDays,
  getPlanDurationLabel,
  getClientPlanInfo,
  isClientPlanActive,
  isClientContractInMonth,
  isClientActiveInMonth,
  isClientExpiringInMonth,
  isClientStartingInMonth,
  getClientRevenueStream,
  getClientMonthKey
} from '@/lib/planUtils';

export default function CeoDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, users, audits, payroll
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
  };

  // Data states
  const [usersList, setUsersList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [tasksList, setTasksList] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [allClientTasks, setAllClientTasks] = useState([]);
  const [allClientDeliveries, setAllClientDeliveries] = useState([]);
  const [metrics, setMetrics] = useState({
    totalEmployees: 0,
    activeAdmins: 0,
    totalPayroll: 0,
    taskCompletionRate: 0,
    activeClients: 0,
    totalClients: 0,
    actualRevenue: 0,
    expectedRevenue: 0,
    pendingRevenue: 0,
    totalRevenue: 0,
    estRevenue: 0,
    pendingTasks: 0,
    completedTasks: 0,
    pendingDeliveries: 0,
    completedDeliveries: 0
  });

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [excelModalType, setExcelModalType] = useState('clients');
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const now = new Date();
  const curLiveYear = now.getFullYear();
  const curLiveMonth = now.getMonth() + 1;
  const currentLiveMonthKey = `${curLiveYear}-${String(curLiveMonth).padStart(2, '0')}`;
  const currentLiveMonthLastDay = new Date(curLiveYear, curLiveMonth, 0).getDate();
  const currentLiveMonthStart = `${curLiveYear}-${String(curLiveMonth).padStart(2, '0')}-01`;
  const currentLiveMonthEnd = `${curLiveYear}-${String(curLiveMonth).padStart(2, '0')}-${String(currentLiveMonthLastDay).padStart(2, '0')}`;

  const [clientMonthFilter, setClientMonthFilter] = useState(currentLiveMonthKey);
  const [clientStartDate, setClientStartDate] = useState(currentLiveMonthStart);
  const [clientEndDate, setClientEndDate] = useState(currentLiveMonthEnd);
  const [clientPaymentFilter, setClientPaymentFilter] = useState('all');
  const [clientRevenueStreamFilter, setClientRevenueStreamFilter] = useState('all');
  const [clientLifecycleFilter, setClientLifecycleFilter] = useState('active'); // 'all', 'active', 'expiring_soon', 'expired', 'renewable', 'inactive'
  const [clientFilterScope, setClientFilterScope] = useState('month'); // 'all_clients' (global) or 'month'

  // Form Fields - Client CRM
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [showClientDetailModal, setShowClientDetailModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  const [clientFormId, setClientFormId] = useState('');
  const [clientFormBiz, setClientFormBiz] = useState('');
  const [clientFormName, setClientFormName] = useState('');
  const [clientFormDate, setClientFormDate] = useState('');
  const [clientFormServices, setClientFormServices] = useState('Meta Ads');
  const [clientFormPkg, setClientFormPkg] = useState('');
  const [clientFormAmt, setClientFormAmt] = useState('');
  const [clientFormContact, setClientFormContact] = useState('');
  const [clientFormEmail, setClientFormEmail] = useState('');
  const [clientFormWebsite, setClientFormWebsite] = useState('');
  const [clientFormSector, setClientFormSector] = useState('');
  const [clientFormReq, setClientFormReq] = useState('');
  const [clientFormReady, setClientFormReady] = useState(true);
  const [clientFormActive, setClientFormActive] = useState(true);
  const [clientFormNotes, setClientFormNotes] = useState('');

  // Client Tasks states
  const [selectedClientTasks, setSelectedClientTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [clientTaskFormId, setClientTaskFormId] = useState('');
  const [clientTaskFormTitle, setClientTaskFormTitle] = useState('');
  const [clientTaskFormDate, setClientTaskFormDate] = useState('');
  const [clientTaskFormAssignTo, setClientTaskFormAssignTo] = useState('Graphic Designer');
  const [clientTaskFormWorkingOn, setClientTaskFormWorkingOn] = useState('');
  const [clientTaskFormStatus, setClientTaskFormStatus] = useState('Not Started');
  const [clientTaskFormPostType, setClientTaskFormPostType] = useState('Graphic');
  const [clientTaskFormNotes, setClientTaskFormNotes] = useState('');
  const [clientTaskEditMode, setClientTaskEditMode] = useState(false);
  const [selectedClientTask, setSelectedClientTask] = useState(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('EMPLOYEE');
  const [formDept, setFormDept] = useState('Social Media Marketing');
  const [formSalary, setFormSalary] = useState('');
  const [formAvatar, setFormAvatar] = useState('👤');
  const [formStatus, setFormStatus] = useState('ACTIVE');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL'); // 'ALL', 'ACTIVE', 'INACTIVE'

  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' }); // type: success, error

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setDarkMode(true);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 4000);
  };

  const fetchJson = async (url, options = {}) => {
    try {
      const res = await fetch(url, options);
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        return { ok: res.ok, status: res.status, data };
      }
      return { ok: res.ok, status: res.status, data: {} };
    } catch (err) {
      console.warn(`Fetch error for ${url}:`, err);
      return { ok: false, status: 500, data: {} };
    }
  };

  const parseClientMonthKey = (client) => {
    if (!client) return null;
    if (client.joiningDate) {
      const parts = client.joiningDate.split('-');
      if (parts.length === 3) {
        const monthMap = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', sept: '09', oct: '10', nov: '11', dec: '12' };
        const mm = monthMap[parts[1]?.toLowerCase()] || parts[1];
        const yyyy = parts[2]?.length === 4 ? parts[2] : `20${parts[2]}`;
        if (yyyy && mm) return `${yyyy}-${mm.padStart(2, '0')}`;
      }
      const d = new Date(client.joiningDate);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 7);
    }

    if (client.createdAt) {
      const d = new Date(client.createdAt);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 7);
    }
    return null;
  };

  const parseDbDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const clean = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) return new Date(clean.slice(0, 10));
    const parts = clean.split(/[\/\-\s]+/);
    if (parts.length === 3) {
      const monthMap = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
      const [p1, p2, p3] = parts;
      let yyyy = p3.length === 4 ? parseInt(p3, 10) : (p1.length === 4 ? parseInt(p1, 10) : 2026);
      const p2Clean = p2.toLowerCase();
      let mm = monthMap[p2Clean] !== undefined ? monthMap[p2Clean] : (parseInt(p2, 10) - 1);
      let dd = p1.length === 4 ? parseInt(p3, 10) : parseInt(p1, 10);
      return new Date(yyyy, mm, dd);
    }
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  };

  const isDateInRange = (dateStr, startDateStr, endDateStr) => {
    if (!startDateStr && !endDateStr) return true;
    const d = parseDbDate(dateStr);
    if (!d) return false;
    const t = d.getTime();

    if (startDateStr) {
      const start = parseDbDate(startDateStr);
      if (start && t < start.getTime()) return false;
    }
    if (endDateStr) {
      const end = parseDbDate(endDateStr);
      if (end && t > end.getTime()) return false;
    }
    return true;
  };

  const handleMonthRangeChange = (monthKey, setMonth, setStart, setEnd) => {
    setMonth(monthKey);
    if (monthKey === 'all' || !monthKey) {
      setStart('');
      setEnd('');
    } else {
      const [yyyy, mm] = monthKey.split('-');
      const y = parseInt(yyyy, 10);
      const m = parseInt(mm, 10);
      const firstDay = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDate = new Date(y, m, 0).getDate();
      const lastDay = `${y}-${String(m).padStart(2, '0')}-${String(lastDate).padStart(2, '0')}`;
      setStart(firstDay);
      setEnd(lastDay);
    }
  };

  const getClientPlanStatus = (client) => {
    return getClientPlanInfo(client);
  };

  // Helper to determine revenue stream source (New Purchase vs Renewal vs Active Retainer)
  const getClientRevenueStream = (client, selectedMonthKey) => {
    if (!client || !client.active) return { type: 'Inactive', label: 'Inactive Account', badge: 'Inactive', badgeClass: 'bg-slate-100 text-slate-500' };

    let isRenewed = false;
    try {
      if (client.notes && client.notes.toLowerCase().includes('renew')) isRenewed = true;
      if (client.notes && client.notes.trim().startsWith('{')) {
        const parsed = JSON.parse(client.notes);
        if (parsed.isRenewed || parsed.renewalCycle || parsed.renewed) isRenewed = true;
      }
    } catch (e) { }

    if (isRenewed) {
      return {
        type: 'Renewal',
        label: 'Plan Renewed',
        badge: '🔄 Renewed',
        badgeClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
      };
    }

    return {
      type: 'NewPurchase',
      label: 'New Plan Purchase',
      badge: '🛒 New Plan',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
    };
  };

  // Helper to parse payment status and revenue breakdown
  const getClientPaymentInfo = (client) => {
    if (!client) return {
      pStatus: 'Full',
      paidAmount: 0,
      totalAmount: 0,
      pendingBalance: 0,
      isPartial: false,
      paymentDate: '',
      paymentMethod: 'UPI',
      utrNumber: '',
      verificationStatus: 'UNVERIFIED',
      isVerified: false,
      isLegacyDate: true
    };
    const totalAmount = client.packageAmount || 0;
    let pStatus = 'Full';
    let paidAmount = totalAmount;
    let paymentDate = '';
    let paymentMethod = 'UPI';
    let utrNumber = '';
    let verificationStatus = 'VERIFIED';
    let isVerified = true;
    let verifiedBy = null;
    let verifiedAt = null;
    let isLegacyDate = false;

    try {
      if (client.notes) {
        const parsed = JSON.parse(client.notes);
        if (parsed && typeof parsed === 'object') {
          pStatus = parsed.paymentStatus || 'Full';
          paidAmount = parsed.paidAmount !== undefined ? parseFloat(parsed.paidAmount) || 0 : (pStatus === 'Pending' ? 0 : totalAmount);
          paymentDate = parsed.paymentDate || '';
          paymentMethod = parsed.paymentMethod || 'UPI';
          utrNumber = parsed.utrNumber || '';
          verificationStatus = parsed.verificationStatus || (parsed.isVerified === false ? 'PENDING_VERIFICATION' : 'VERIFIED');
          isVerified = verificationStatus === 'VERIFIED';
          verifiedBy = parsed.verifiedBy || null;
          verifiedAt = parsed.verifiedAt || null;
        }
      }
    } catch (e) { }

    if (!paymentDate) {
      paymentDate = client.joiningDate || '';
      isLegacyDate = true;
    }

    const pendingBalance = Math.max(0, totalAmount - paidAmount);
    const isPartial = pStatus === 'Half' || pStatus === 'Partial' || (pendingBalance > 0 && pStatus !== 'Pending');

    return {
      pStatus,
      paidAmount,
      totalAmount,
      pendingBalance,
      isPartial,
      paymentDate,
      paymentMethod,
      utrNumber,
      verificationStatus,
      isVerified,
      verifiedBy,
      verifiedAt,
      isLegacyDate
    };
  };

  // Auth fetch
  useEffect(() => {
    async function initDashboard() {
      try {
        const { ok, data } = await fetchJson('/api/auth/me');

        if (!ok || !data.user || data.user.role !== 'CEO') {
          router.push('/');
          return;
        }

        setCurrentUser(data.user);
        await refreshData();
        setLoading(false);
      } catch (err) {
        console.error(err);
        router.push('/');
      }
    }
    initDashboard();
  }, [router]);

  const refreshData = async () => {
    try {
      const [
        usersRes,
        auditRes,
        tasksRes,
        clientsRes,
        ctRes,
        cdRes
      ] = await Promise.all([
        fetchJson('/api/users'),
        fetchJson('/api/audit-logs'),
        fetchJson('/api/tasks'),
        fetchJson('/api/clients'),
        fetchJson('/api/client-tasks'),
        fetchJson('/api/client-deliveries')
      ]);

      const fetchedUsers = usersRes.data.users || [];
      setUsersList(fetchedUsers);

      const auditData = auditRes.data;
      setAuditLogs(auditData.logs || []);

      const fetchedTasks = tasksRes.data.tasks || [];
      setTasksList(fetchedTasks);

      const fetchedClients = clientsRes.data.clients || [];
      const clientsData = clientsRes.data;
      setClientsList(fetchedClients);

      const ctData = ctRes.data;
      setAllClientTasks(ctData.tasks || []);

      const cdData = cdRes.data;
      setAllClientDeliveries(cdData.deliveries || []);

      // Calculate Metrics
      const totalEmp = fetchedUsers.filter(u => u.role === 'EMPLOYEE' || u.role === 'SALES').length;
      const activeAdm = fetchedUsers.filter(u => u.role === 'ADMIN').length;
      const payroll = fetchedUsers.reduce((sum, u) => sum + u.salary, 0);

      const doneTasks = fetchedTasks.filter(t => t.status === 'DONE').length;
      const rate = fetchedTasks.length > 0 ? Math.round((doneTasks / fetchedTasks.length) * 100) : 0;

      // Active Clients Calculation (Strictly Active and Expiring Soon within contract validity)
      const activeClientsCount = (clientsData.clients || []).filter(c => isClientPlanActive(c)).length;
      const totalClientsCount = (clientsData.clients || []).length;

      // Expected Revenue: All CRM Clients Target Billing
      const totalAllClientsBilling = (clientsData.clients || []).reduce((sum, c) => sum + (c.packageAmount || 0), 0);

      // Actual Revenue: Strictly calendar month based (day 1 to 30) - NOT mixed with active clients!
      let actualRevenue = 0;
      (clientsData.clients || []).forEach(c => {
        if (!isClientContractInMonth(c)) return;
        const pkgAmt = c.packageAmount || 0;
        const pInfo = getClientPaymentInfo(c);
        if (pInfo.pStatus === 'Full') {
          actualRevenue += pkgAmt;
        } else if (pInfo.pStatus === 'Partial' || pInfo.pStatus === 'Half') {
          actualRevenue += pInfo.paidAmount;
        }
      });
      const pendingRevenue = Math.max(0, totalAllClientsBilling - actualRevenue);

      // Tasks Pipeline Calculation
      const ctArray = ctData.tasks || [];
      const completedTasksCount = ctArray.filter(t => t.status === 'Completed' || t.status === 'Done').length;
      const pendingTasksCount = ctArray.length - completedTasksCount;

      // Deliveries Calculation
      const cdArray = cdData.deliveries || [];
      const completedDeliveries = cdArray.filter(d => d.status === 'Completed' || d.status === 'Done' || d.status === 'Sent').length;
      const pendingDeliveries = cdArray.length - completedDeliveries;

      setMetrics({
        totalEmployees: totalEmp,
        activeAdmins: activeAdm,
        totalPayroll: payroll,
        taskCompletionRate: rate,
        activeClients: activeClientsCount,
        totalClients: totalClientsCount,
        actualRevenue: actualRevenue,
        expectedRevenue: totalAllClientsBilling,
        totalAllClientsBilling: totalAllClientsBilling,
        pendingRevenue: pendingRevenue,
        totalRevenue: actualRevenue,
        estRevenue: totalAllClientsBilling,
        pendingTasks: pendingTasksCount,
        completedTasks: completedTasksCount,
        pendingDeliveries: pendingDeliveries,
        completedDeliveries: completedDeliveries
      });
    } catch (err) {
      console.error('Error refreshing dashboard data:', err);
    }
  };

  const resetClientForm = (client = null) => {
    setFormError('');
    if (client) {
      setSelectedClient(client);
      setClientFormId(client.clientId);
      setClientFormBiz(client.businessName);
      setClientFormName(client.clientName || '');
      setClientFormDate(client.joiningDate);
      setClientFormServices(client.services);
      setClientFormPkg(client.packageName);
      setClientFormAmt(client.packageAmount.toString());
      setClientFormContact(client.contact || '');
      setClientFormEmail(client.email || '');
      setClientFormWebsite(client.website || '');
      setClientFormSector(client.sector || '');
      setClientFormReq(client.requirement || '');
      setClientFormReady(client.accountReady);
      setClientFormActive(client.active);
      setClientFormNotes(client.notes || '');
    } else {
      setSelectedClient(null);
      let nextId = 'AID-0001';
      if (clientsList.length > 0) {
        const ids = clientsList.map(c => {
          const num = parseInt(c.clientId.replace('AID-', ''));
          return isNaN(num) ? 0 : num;
        });
        const maxId = Math.max(...ids);
        nextId = `AID-${String(maxId + 1).padStart(4, '0')}`;
      }
      setClientFormId(nextId);
      setClientFormBiz('');
      setClientFormName('');
      setClientFormDate(new Date().toISOString().split('T')[0]);
      setClientFormServices('Meta Ads');
      setClientFormPkg('Standard(Meta Ads)');
      setClientFormAmt('2000');
      setClientFormContact('');
      setClientFormEmail('');
      setClientFormWebsite('');
      setClientFormSector('');
      setClientFormReq('');
      setClientFormReady(true);
      setClientFormActive(true);
      setClientFormNotes('');
    }
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientFormId,
          businessName: clientFormBiz,
          clientName: clientFormName,
          joiningDate: clientFormDate,
          services: clientFormServices,
          packageName: clientFormPkg,
          packageAmount: parseFloat(clientFormAmt) || 0,
          contact: clientFormContact,
          email: clientFormEmail,
          website: clientFormWebsite,
          sector: clientFormSector,
          requirement: clientFormReq,
          accountReady: clientFormReady,
          active: clientFormActive,
          notes: clientFormNotes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add client');
      showToast(`Client ${clientFormBiz} onboarded successfully!`);
      setShowAddClientModal(false);
      await refreshData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditClient = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const res = await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientFormId,
          businessName: clientFormBiz,
          clientName: clientFormName,
          joiningDate: clientFormDate,
          services: clientFormServices,
          packageName: clientFormPkg,
          packageAmount: parseFloat(clientFormAmt) || 0,
          contact: clientFormContact,
          email: clientFormEmail,
          website: clientFormWebsite,
          sector: clientFormSector,
          requirement: clientFormReq,
          accountReady: clientFormReady,
          active: clientFormActive,
          notes: clientFormNotes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update client');
      showToast(`Client profile updated successfully!`);
      setShowEditClientModal(false);
      await refreshData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClient = async (id, name) => {
    if (!confirm(`Are you sure you want to delete client account "${name}"?`)) return;
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || 'Failed to delete client');
      }
      showToast(`Deleted client: ${name}`);
      await refreshData();
    } catch (err) {
      alert(`Delete Error: ${err.message}`);
    }
  };

  const refreshClientTasks = async (clientIdVal) => {
    setLoadingTasks(true);
    try {
      const res = await fetch(`/api/clients/${clientIdVal}/tasks`);
      const data = await res.json();
      setSelectedClientTasks(data.tasks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const resetClientTaskForm = (task = null) => {
    setFormError('');
    if (task) {
      setSelectedClientTask(task);
      setClientTaskFormId(task.taskId);
      setClientTaskFormTitle(task.taskTitle);
      setClientTaskFormDate(task.date);
      setClientTaskFormAssignTo(task.assignTo || 'Graphic Designer');
      setClientTaskFormWorkingOn(task.workingOn || '');
      setClientTaskFormStatus(task.status || 'Not Started');
      setClientTaskFormPostType(task.postType || 'Graphic');
      setClientTaskFormNotes(task.notes || '');
      setClientTaskEditMode(true);
    } else {
      setSelectedClientTask(null);
      let nextId = '';
      if (selectedClient) {
        nextId = `${selectedClient.clientId}-TASK-01`;
        if (selectedClientTasks.length > 0) {
          const nums = selectedClientTasks.map(t => {
            const parts = t.taskId.split('-TASK-');
            const num = parts.length > 1 ? parseInt(parts[1]) : 0;
            return isNaN(num) ? 0 : num;
          });
          const maxNum = Math.max(...nums, 0);
          nextId = `${selectedClient.clientId}-TASK-${String(maxNum + 1).padStart(2, '0')}`;
        }
      }
      setClientTaskFormId(nextId);
      setClientTaskFormTitle('');
      setClientTaskFormDate(new Date().toISOString().split('T')[0]);
      setClientTaskFormAssignTo('Graphic Designer');
      setClientTaskFormWorkingOn('');
      setClientTaskFormStatus('Not Started');
      setClientTaskFormPostType('Graphic');
      setClientTaskFormNotes('');
      setClientTaskEditMode(false);
    }
  };

  const handleAddOrEditClientTask = async (e) => {
    e.preventDefault();
    if (!clientTaskFormId || !clientTaskFormTitle || !clientTaskFormDate) {
      setFormError('Please fill out all required task fields.');
      return;
    }
    setFormLoading(true);
    setFormError('');
    try {
      const url = clientTaskEditMode
        ? `/api/client-tasks/${selectedClientTask.id}`
        : `/api/clients/${selectedClient.id}/tasks`;
      const method = clientTaskEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: clientTaskFormId,
          taskTitle: clientTaskFormTitle,
          date: clientTaskFormDate,
          assignTo: clientTaskFormAssignTo,
          workingOn: clientTaskFormWorkingOn,
          status: clientTaskFormStatus,
          postType: clientTaskFormPostType,
          notes: clientTaskFormNotes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save client task');
      showToast(clientTaskEditMode ? 'Task deliverables updated!' : 'New task deliverable created!');
      resetClientTaskForm();
      await refreshClientTasks(selectedClient.id);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClientTask = async (taskDbId, title) => {
    if (!confirm(`Are you sure you want to delete task deliverable "${title}"?`)) return;
    try {
      const res = await fetch(`/api/client-tasks/${taskDbId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');
      showToast(`Deleted task: ${title}`);
      await refreshClientTasks(selectedClient.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('EMPLOYEE');
    setFormDept('Social Media Marketing');
    setFormSalary('');
    setFormAvatar('👤');
    setFormError('');
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword('');
    setFormRole(user.role);
    setFormDept(user.department);
    setFormSalary(user.salary.toString());
    setFormAvatar(user.avatar || '👤');
    setFormStatus(user.status || 'ACTIVE');
    setFormError('');
    setShowEditModal(true);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!formName || !formEmail || !formPassword || !formSalary) {
      setFormError('Please fill out all required fields.');
      return;
    }
    setFormError('');
    setFormLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
          department: formDept,
          salary: parseFloat(formSalary),
          avatar: formAvatar
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to create user.');
        setFormLoading(false);
        return;
      }

      showToast(`User ${formName} successfully created!`);
      setShowAddModal(false);
      resetForm();
      await refreshData();
    } catch (err) {
      setFormError('Internal server error.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!formName || !formEmail || !formSalary) {
      setFormError('Please fill out all required fields.');
      return;
    }
    setFormError('');
    setFormLoading(true);

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword || undefined,
          role: formRole,
          department: formDept,
          salary: parseFloat(formSalary),
          avatar: formAvatar,
          status: formStatus
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to update user.');
        setFormLoading(false);
        return;
      }

      showToast(`User ${formName} successfully updated!`);
      setShowEditModal(false);
      await refreshData();
    } catch (err) {
      setFormError('Internal server error.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleUserStatus = async (id, name, currentStatus) => {
    if (id === currentUser.id) {
      showToast('Cannot deactivate your own account.', 'error');
      return;
    }

    const willDeactivate = currentStatus === 'ACTIVE';
    const actionText = willDeactivate ? 'deactivate' : 'reactivate';
    const confirmMessage = willDeactivate
      ? `Are you sure you want to deactivate ${name}? All records (tasks, attendance, payroll, documents) will be permanently preserved in the system, but the user cannot log in.`
      : `Are you sure you want to reactivate ${name}? They will regain account access.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || `Failed to ${actionText} user.`, 'error');
        return;
      }

      showToast(data.message || `User ${name} status updated to ${data.status}. Record maintained.`);
      await refreshData();
    } catch (err) {
      showToast('Connection error.', 'error');
    }
  };

  const handleApprovePayroll = async () => {
    try {
      // Simulate payroll batch processing
      showToast('Department payroll batch approved! All entries reconciled.');
      await refreshData();
    } catch (err) {
      showToast('Payroll approval failed.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Loading CEO Console...</p>
        </div>
      </div>
    );
  }

  // Filter users based on search and status
  const activeUsersCount = usersList.filter(u => u.status === 'ACTIVE').length;
  const inactiveUsersCount = usersList.filter(u => u.status === 'INACTIVE').length;

  const filteredUsers = usersList.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (userStatusFilter === 'ACTIVE') return u.status === 'ACTIVE';
    if (userStatusFilter === 'INACTIVE') return u.status === 'INACTIVE';
    return true;
  });

  return (
    <div className={`min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-300`}>

      {/* Toast Alert */}
      {toast.message && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in border text-sm font-semibold
          ${toast.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
            : 'bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-900 text-red-800 dark:text-red-300'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Mobile Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Responsive Sidebar Panel */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}>
        <div className="overflow-y-auto flex-1">
          {/* Header Brand */}
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                <Building className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                WorkForce OS
              </span>
            </div>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Sidebar Summary */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-800/20">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-lg font-bold shadow-md shrink-0">
              {currentUser.avatar || '👨‍💼'}
            </div>
            <div className="overflow-hidden">
              <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{currentUser.name}</div>
              <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-extrabold tracking-widest uppercase">
                CEO / MAIN ADMIN
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 sm:p-4 flex flex-col gap-1">
            <button
              onClick={() => handleSelectTab('overview')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'overview'
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Activity className="w-4 h-4" />
              Overview
            </button>

            <button
              onClick={() => handleSelectTab('users')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'users'
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Users className="w-4 h-4" />
              Manage Directory
            </button>

            <button
              onClick={() => handleSelectTab('clients')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'clients'
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Building className="w-4 h-4" />
              Client CRM
            </button>

            <button
              onClick={() => handleSelectTab('deliverables')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'deliverables'
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <CheckSquare className="w-4 h-4" />
              CRM Deliverables
            </button>

            <button
              onClick={() => handleSelectTab('campaign-deliveries')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'campaign-deliveries'
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Send className="w-4 h-4" />
              Campaign Deliveries
            </button>

            <button
              onClick={() => handleSelectTab('audits')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'audits'
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <FileText className="w-4 h-4" />
              System Audit Logs
            </button>

            <button
              onClick={() => handleSelectTab('payroll')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'payroll'
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <DollarSign className="w-4 h-4" />
              Financial Controls
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Logout */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-200 dark:border-slate-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold rounded-xl text-sm transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col min-w-0 overflow-y-auto h-screen">

        {/* Main Panel Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-3 sm:px-6 lg:px-8 shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Hamburger Button for Mobile/Tablet */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition shrink-0"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm sm:text-base lg:text-xl font-bold tracking-tight text-slate-900 dark:text-white capitalize truncate">
              {activeTab === 'overview' ? 'Executive Dashboard' : activeTab.replace('-', ' ')}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Dark Mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="px-2.5 sm:px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl flex items-center gap-1.5 sm:gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs hover:shadow-md transition-all duration-300 transform active:scale-95 cursor-pointer"
              title="Toggle Dark / Light Mode"
            >
              {darkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                  <span className="hidden sm:inline text-[11px] font-semibold text-amber-300">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-600 fill-slate-600/20" />
                  <span className="hidden sm:inline text-[11px] font-semibold text-slate-600">Dark</span>
                </>
              )}
            </button>

            <div className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
              <Calendar className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-blue-500 shrink-0" />
              <span className="hidden md:inline">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              <span className="md:hidden">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        </header>

        {/* Panel Main Content Container */}
        <div className="p-3 sm:p-5 lg:p-8 flex-grow overflow-x-hidden">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              {/* Metric grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5">

                {/* Active Clients Card */}
                <div 
                  onClick={() => {
                    setActiveTab('clients');
                    setClientLifecycleFilter('active');
                    setClientFilterScope('all_clients');
                    setClientMonthFilter('all');
                    setClientStartDate('');
                    setClientEndDate('');
                    setClientPaymentFilter('all');
                    setClientRevenueStreamFilter('all');
                  }}
                  className="relative bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex items-center justify-between hover:translate-y-[-2px] hover:shadow-md hover:border-blue-300 transition duration-200 group cursor-pointer"
                  title="Click to view Active Clients in Client CRM (Strictly active plan packs)"
                >
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="space-y-1 relative z-10 min-w-0 flex-1 pr-2">
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider truncate">Active Clients</div>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">{metrics.activeClients}</h3>
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap">/ {metrics.totalClients} Total</span>
                    </div>
                    <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-900 block w-fit truncate max-w-full">
                      Live Accounts
                    </span>
                  </div>
                  <div className="shrink-0 relative z-10 w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                {/* Actual Revenue Card */}
                <div 
                  onClick={() => {
                    setActiveTab('clients');
                    setClientFilterScope('month');
                    setClientPaymentFilter('paid_only');
                    setClientLifecycleFilter('all');
                    setClientRevenueStreamFilter('all');
                  }}
                  className="relative bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex items-center justify-between hover:translate-y-[-2px] hover:shadow-md hover:border-emerald-300 transition duration-200 group cursor-pointer"
                  title="Click to view Paid Revenue accounts in Client CRM (Calendar Month 1-30)"
                >
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="space-y-1 relative z-10 min-w-0 flex-1 pr-2">
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider truncate">Actual Revenue</div>
                    <h3 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate">₹{(metrics.actualRevenue || 0).toLocaleString()}</h3>
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900 block w-fit truncate max-w-full">
                      {metrics.expectedRevenue > 0 ? Math.round(((metrics.actualRevenue || 0) / metrics.expectedRevenue) * 100) : 0}% Realized
                    </span>
                  </div>
                  <div className="shrink-0 relative z-10 w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>

                {/* Expected Revenue Card */}
                <div 
                  onClick={() => {
                    setActiveTab('clients');
                    setClientFilterScope('all_clients');
                    setClientMonthFilter('all');
                    setClientStartDate('');
                    setClientEndDate('');
                    setClientPaymentFilter('all');
                    setClientLifecycleFilter('all');
                    setClientRevenueStreamFilter('all');
                  }}
                  className="relative bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex items-center justify-between hover:translate-y-[-2px] hover:shadow-md hover:border-indigo-300 transition duration-200 group cursor-pointer"
                  title="Click to view all 58 target billing accounts in Client CRM"
                >
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="space-y-1 relative z-10 min-w-0 flex-1 pr-2">
                    <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase tracking-wider truncate">Expected Revenue</div>
                    <h3 className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 truncate">₹{(metrics.expectedRevenue || 0).toLocaleString()}</h3>
                    <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900 block w-fit truncate max-w-full">
                      All {metrics.totalClients || clientsList.length} Clients Target
                    </span>
                  </div>
                  <div className="shrink-0 relative z-10 w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900">
                    <BarChart2 className="w-5 h-5" />
                  </div>
                </div>

                {/* Pending Revenue Card */}
                <div 
                  onClick={() => {
                    setActiveTab('clients');
                    setClientPaymentFilter('Pending');
                  }}
                  className="relative bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex items-center justify-between hover:translate-y-[-2px] hover:shadow-md hover:border-orange-300 transition duration-200 group cursor-pointer"
                  title="Click to view Pending Balance accounts in Client CRM"
                >
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="space-y-1 relative z-10 min-w-0 flex-1 pr-2">
                    <div className="text-[10px] text-orange-600 dark:text-orange-400 font-extrabold uppercase tracking-wider truncate">Pending Revenue</div>
                    <h3 className="text-xl sm:text-2xl font-black text-orange-500 truncate">₹{(metrics.pendingRevenue || 0).toLocaleString()}</h3>
                    <span className="text-[9px] text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-full border border-orange-100 dark:border-orange-900 block w-fit truncate max-w-full">
                      Outstanding Due
                    </span>
                  </div>
                  <div className="shrink-0 relative z-10 w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-100 dark:border-orange-900">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                </div>

                {/* Tasks & Deliveries Pipeline Card */}
                <div 
                  onClick={() => {
                    setActiveTab('deliverables');
                  }}
                  className="relative bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex items-center justify-between hover:translate-y-[-2px] hover:shadow-md hover:border-purple-300 transition duration-200 group cursor-pointer"
                  title="Click to open Deliverables & Tasks Pipeline"
                >
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="space-y-1 relative z-10 min-w-0 flex-1 pr-2">
                    <div className="text-[10px] text-purple-600 dark:text-purple-400 font-extrabold uppercase tracking-wider truncate">Pipeline</div>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">{(metrics.pendingTasks || 0) + (metrics.pendingDeliveries || 0)}</h3>
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Pending</span>
                    </div>
                    <span className="text-[9px] text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full border border-purple-100 dark:border-purple-800/30 block w-fit truncate max-w-full">
                      Done: {(metrics.completedTasks || 0) + (metrics.completedDeliveries || 0)}
                    </span>
                  </div>
                  <div className="shrink-0 relative z-10 w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-900">
                    <Target className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Graphics and lists panel */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Task and stats breakdown */}
                <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white mb-6">Staff Salary Breakdown</h4>

                  <div className="space-y-5">
                    {usersList.length === 0 ? (
                      <p className="text-sm text-slate-400">No staff loaded.</p>
                    ) : (
                      usersList.slice(0, 5).map((user) => (
                        <div key={user.id} className="space-y-2">
                          <div className="flex justify-between items-center text-sm font-semibold">
                            <span className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs">{user.avatar || '👤'}</span>
                              <span>{user.name} ({user.role})</span>
                            </span>
                            <span className="text-slate-600 dark:text-slate-400">${user.salary.toLocaleString()}/mo</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min((user.salary / 250000) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Audits view */}
                <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white mb-6">Latest Security Audits</h4>

                    <div className="space-y-4">
                      {auditLogs.slice(0, 4).map((log) => (
                        <div key={log.id} className="flex gap-3 text-xs">
                          <div className="w-2 h-2 mt-1 rounded-full bg-cyan-400 shrink-0"></div>
                          <div className="space-y-0.5 overflow-hidden">
                            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{log.action}</p>
                            <p className="text-[10px] text-slate-400">{log.performedByName} ({log.performedByRole})</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('audits')}
                    className="w-full mt-6 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition"
                  >
                    View All Logs
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: USERS DIRECTORY */}
          {activeTab === 'users' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">

                {/* Search Bar & Status Filter Control */}
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto flex-1 max-w-2xl">
                  <div className="relative flex items-center w-full max-w-xs">
                    <Search className="absolute left-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search name, email, department..."
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 text-xs transition"
                    />
                  </div>

                  {/* Status Segmented Control */}
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setUserStatusFilter('ALL')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${userStatusFilter === 'ALL'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      All ({usersList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserStatusFilter('ACTIVE')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${userStatusFilter === 'ACTIVE'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                        }`}
                    >
                      <UserCheck className="w-3 h-3" />
                      Active ({activeUsersCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserStatusFilter('INACTIVE')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${userStatusFilter === 'INACTIVE'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                        }`}
                    >
                      <UserX className="w-3 h-3" />
                      Inactive ({inactiveUsersCount})
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => { setExcelModalType('employees'); setExcelModalOpen(true); }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 shrink-0 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Import via Excel
                </button>

                <button
                  onClick={openAddModal}
                  className="bg-blue-800 hover:bg-blue-900 text-white py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 shrink-0 transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Staff Member
                </button>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[750px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                      <th className="p-4 uppercase tracking-wider">Staff</th>
                      <th className="p-4 uppercase tracking-wider">Email</th>
                      <th className="p-4 uppercase tracking-wider">Role</th>
                      <th className="p-4 uppercase tracking-wider">Department</th>
                      <th className="p-4 uppercase tracking-wider">Salary</th>
                      <th className="p-4 uppercase tracking-wider">Status</th>
                      <th className="p-4 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-slate-400">No staff match the current filter.</td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition">
                          <td className="p-4 font-bold flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-700 flex items-center justify-center text-sm">{user.avatar || '👤'}</span>
                            <span className="text-slate-900 dark:text-white">{user.name}</span>
                          </td>
                          <td className="p-4 text-slate-500">{user.email}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase
                              ${user.role === 'CEO'
                                ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                                : user.role === 'ADMIN'
                                  ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400'
                                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'}`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="p-4 text-slate-500 font-semibold">{user.department}</td>
                          <td className="p-4 font-bold text-slate-900 dark:text-white">${user.salary.toLocaleString()}/mo</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase
                              ${user.status === 'ACTIVE'
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                              {user.status || 'ACTIVE'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => openEditModal(user)}
                                className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition"
                                title="Edit staff profile"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {user.status === 'ACTIVE' ? (
                                <button
                                  onClick={() => handleToggleUserStatus(user.id, user.name, user.status)}
                                  disabled={user.id === currentUser.id}
                                  className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
                                  title="Deactivate staff (Record & history maintained)"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleUserStatus(user.id, user.name, user.status)}
                                  disabled={user.id === currentUser.id}
                                  className="p-1.5 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
                                  title="Reactivate staff account"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: AUDITS */}
          {activeTab === 'audits' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Security Trail & Database Mutations</h4>
                <p className="text-xs text-slate-400 mt-1">Live audit trail recording system mutations and administrative interventions.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                      <th className="p-4 uppercase tracking-wider">Timestamp</th>
                      <th className="p-4 uppercase tracking-wider">Action Event</th>
                      <th className="p-4 uppercase tracking-wider">Operator</th>
                      <th className="p-4 uppercase tracking-wider">Operator Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-slate-400">No logs found.</td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50/30 transition">
                          <td className="p-4 text-slate-500 font-medium">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="p-4 font-bold text-slate-900 dark:text-white">
                            {log.action}
                          </td>
                          <td className="p-4 text-slate-500 font-semibold">{log.performedByName}</td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold tracking-wide uppercase text-[9px]">
                              {log.performedByRole}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PAYROLL */}
          {activeTab === 'payroll' && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white">Active Payroll Reconciliations</h4>
                    <p className="text-xs text-slate-400 mt-1">Review organizational salary budgets by department.</p>
                  </div>
                  <button
                    onClick={handleApprovePayroll}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-md shadow-emerald-500/10 transition"
                  >
                    Batch Approve Monthly Salaries
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Executive Payroll</span>
                    <h3 className="text-xl font-bold dark:text-white">$250,000</h3>
                    <p className="text-[10px] text-emerald-500 font-semibold">Synced with Ledger</p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Engineering Dept</span>
                    <h3 className="text-xl font-bold dark:text-white">
                      ${usersList.filter(u => u.department === 'Engineering').reduce((sum, u) => sum + u.salary, 0).toLocaleString()}
                    </h3>
                    <p className="text-[10px] text-emerald-500 font-semibold">Synced with Ledger</p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Human Resources</span>
                    <h3 className="text-xl font-bold dark:text-white">
                      ${usersList.filter(u => u.department === 'HR').reduce((sum, u) => sum + u.salary, 0).toLocaleString()}
                    </h3>
                    <p className="text-[10px] text-emerald-500 font-semibold">Synced with Ledger</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: GLOBAL DELIVERABLES BOARD */}
          {activeTab === 'deliverables' && (
            <div className="space-y-6 animate-fade-in text-xs">

              {/* Deliverables Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Deliverables</span>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{allClientTasks.length}</div>
                  <span className="text-[9px] text-slate-400 font-medium">All campaigns deliverables</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Completed Tasks</span>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {allClientTasks.filter(t => t.status === 'Complete Task').length}
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium">Successfully completed</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">In Progress</span>
                  <div className="text-xl font-bold text-orange-500 mt-1">
                    {allClientTasks.filter(t => t.status === 'Working On It').length}
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium">Under active production</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Pending Release</span>
                  <div className="text-xl font-bold text-slate-500 mt-1">
                    {allClientTasks.filter(t => t.status === 'Not Started').length}
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium">Queued or not started</span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                <div className="relative flex items-center w-full max-w-md">
                  <Search className="absolute left-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search client, business name, task, ID..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:outline-none focus:border-blue-600 text-xs transition"
                  />
                </div>
              </div>

              {/* Global Deliverables Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider">
                        <th className="p-4">Date & ID</th>
                        <th className="p-4">Business / Client Name</th>
                        <th className="p-4">Deliverable Task</th>
                        <th className="p-4">Assigned Department</th>
                        <th className="p-4">Staff Assigned</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {allClientTasks
                        .filter(t => {
                          const query = searchQuery.toLowerCase();
                          return (
                            t.businessName.toLowerCase().includes(query) ||
                            t.taskId.toLowerCase().includes(query) ||
                            t.taskTitle.toLowerCase().includes(query) ||
                            (t.workingOn && t.workingOn.toLowerCase().includes(query)) ||
                            (t.assignTo && t.assignTo.toLowerCase().includes(query))
                          );
                        })
                        .map((task) => (
                          <tr key={task.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition">
                            <td className="p-4 font-bold text-slate-450">
                              <div>
                                {task.postType === 'Posting' || (task.taskTitle && task.taskTitle.toLowerCase().startsWith('post ')) ? (
                                  <span className="text-amber-600 dark:text-amber-400 font-extrabold text-[10px]">Trigger on Approval (24h)</span>
                                ) : (
                                  task.date
                                )}
                              </div>
                              <div className="text-[8px] text-slate-400 mt-0.5 font-bold uppercase">{task.taskId}</div>
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-slate-900 dark:text-white">{task.businessName}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">ID: {task.clientId}</div>
                            </td>
                            <td className="p-4">
                              <div className="font-semibold text-slate-800 dark:text-slate-250">{task.taskTitle}</div>
                              {task.notes && <div className="text-[9px] text-slate-400 mt-0.5 italic">"{task.notes}"</div>}
                            </td>
                            <td className="p-4 font-medium text-slate-600 dark:text-slate-400">{task.assignTo}</td>
                            <td className="p-4 font-semibold text-slate-900 dark:text-white">{task.workingOn || 'Unassigned'}</td>
                            <td className="p-4">
                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase
                                ${task.status === 'Complete Task'
                                  ? 'bg-emerald-500 text-white'
                                  : task.status === 'Working On It'
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-400'}`}
                              >
                                {task.status}
                              </span>
                              {task.postType && task.postType !== 'None' && (
                                <div className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Type: {task.postType}</div>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => {
                                  const client = clientsList.find(c => c.clientId === task.clientId);
                                  if (client) {
                                    setSelectedClient(client);
                                    setShowClientDetailModal(true);
                                    refreshClientTasks(client.id);
                                    resetClientTaskForm(task);
                                  } else {
                                    alert('Client details not found.');
                                  }
                                }}
                                className="py-1 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-855 dark:hover:bg-slate-800 border border-slate-205 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-lg transition"
                              >
                                Manage
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: GLOBAL CAMPAIGN DELIVERIES */}
          {activeTab === 'campaign-deliveries' && (
            <div className="space-y-6 animate-fade-in text-xs">

              {/* Campaign Deliveries Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Scheduled Deliveries</span>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{allClientDeliveries.length}</div>
                  <span className="text-[9px] text-slate-400 font-medium">All campaigns scheduled posts</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Pending Release</span>
                  <div className="text-xl font-bold text-orange-500 mt-1">
                    {allClientDeliveries.filter(d => d.status === 'Pending').length}
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium">Awaiting publication</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Posted / Completed</span>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {allClientDeliveries.filter(d => d.status === 'Posted' || d.status === 'Completed').length}
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium">Successfully published online</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Under Review</span>
                  <div className="text-xl font-bold text-slate-500 mt-1">
                    {allClientDeliveries.filter(d => d.status !== 'Pending' && d.status !== 'Posted' && d.status !== 'Completed').length}
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium">Drafts and approvals</span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                <div className="relative flex items-center w-full max-w-md">
                  <Search className="absolute left-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search client name, delivery ID, post type, assignee..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:outline-none focus:border-blue-600 text-xs transition"
                  />
                </div>
              </div>

              {/* Global Deliveries Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider">
                        <th className="p-4">Date & Task ID</th>
                        <th className="p-4">Client Name</th>
                        <th className="p-4">Post Type</th>
                        <th className="p-4">Staff Member</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {allClientDeliveries
                        .filter(d => {
                          const query = searchQuery.toLowerCase();
                          return (
                            d.clientName.toLowerCase().includes(query) ||
                            d.deliveryId.toLowerCase().includes(query) ||
                            d.postType.toLowerCase().includes(query) ||
                            (d.workingOn && d.workingOn.toLowerCase().includes(query)) ||
                            (d.notes && d.notes.toLowerCase().includes(query))
                          );
                        })
                        .map((delivery) => (
                          <tr key={delivery.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition">
                            <td className="p-4 font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-xs">
                                <span>{delivery.postDate}</span>
                                {delivery.linkedTaskId || delivery.deliveryId ? (
                                  <button
                                    onClick={() => {
                                      const client = clientsList.find(c => c.clientId === delivery.clientId);
                                      if (client) {
                                        setSelectedClient(client);
                                        setShowClientDetailModal(true);
                                        refreshClientTasks(client.id);
                                      }
                                    }}
                                    className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                                    title={delivery.linkedTaskId || delivery.deliveryId}
                                  >
                                    ({delivery.linkedTaskId || delivery.deliveryId})
                                  </button>
                                ) : null}
                              </div>
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    const client = clientsList.find(c => c.clientId === delivery.clientId);
                                    if (client) {
                                      setSelectedClient(client);
                                      setShowClientDetailModal(true);
                                      refreshClientTasks(client.id);
                                    } else {
                                      alert('Client CRM details not found.');
                                    }
                                  }}
                                  className="font-bold text-slate-900 dark:text-white hover:underline text-left"
                                >
                                  {delivery.clientName}
                                </button>
                                <span className="text-[9px] text-slate-400 font-semibold">({delivery.clientId})</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{delivery.postType}</span>
                            </td>
                            <td className="p-4 font-semibold text-slate-900 dark:text-white">{delivery.workingOn || 'Unassigned'}</td>
                            <td className="p-4">
                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase
                                ${delivery.status === 'Posted' || delivery.status === 'Completed'
                                  ? 'bg-emerald-500 text-white'
                                  : delivery.status === 'Pending'
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-655 dark:text-slate-400'}`}
                              >
                                {delivery.status}
                              </span>
                            </td>
                            <td className="p-4 text-slate-500 font-medium max-w-xs truncate" title={delivery.notes}>
                              {(delivery.notes && delivery.notes !== delivery.deliveryId && delivery.notes !== delivery.linkedTaskId && !delivery.notes.startsWith('AID-T-')) ? delivery.notes : '-'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CLIENT CRM */}
          {activeTab === 'clients' && (() => {
            const availableClientMonths = (() => {
              const monthKeys = new Set();
              const now = new Date();
              const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
              monthKeys.add(curKey);

              clientsList.forEach(c => {
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

                let activeCount = 0;
                let monthRevenue = 0;

                clientsList.forEach(c => {
                  if (isClientContractInMonth(c, mk)) {
                    activeCount += 1;
                    monthRevenue += (c.packageAmount || 0);
                  }
                });

                return { key: mk, label, count: activeCount, revenue: monthRevenue };
              });
            })();

            // Global Lifecycle Counts
            const isMonthScoped = clientMonthFilter !== 'all' || clientStartDate || clientEndDate;
            const globalLifecycleCounts = {
              all: isMonthScoped
                ? clientsList.filter(c => isClientContractInMonth(c, clientMonthFilter, clientStartDate, clientEndDate)).length
                : clientsList.length,
              active: isMonthScoped
                ? clientsList.filter(c => isClientContractInMonth(c, clientMonthFilter, clientStartDate, clientEndDate)).length
                : clientsList.filter(c => isClientPlanActive(c)).length,
              expiring_soon: clientsList.filter(c => c.active && getClientPlanInfo(c).status === 'Expiring Soon').length,
              expired: clientsList.filter(c => getClientPlanInfo(c).status === 'Expired').length,
              renewable: clientsList.filter(c => {
                const info = getClientPlanInfo(c);
                return info.isRenewed || info.status === 'Expired' || (c.active && info.status === 'Expiring Soon');
              }).length,
              inactive: clientsList.filter(c => !isClientPlanActive(c) && getClientPlanInfo(c).status !== 'Expired').length
            };

            const filteredClients = clientsList.filter(c => {
              const query = searchQuery.toLowerCase();
              const matchesQuery = !query || (
                c.businessName.toLowerCase().includes(query) ||
                c.clientId.toLowerCase().includes(query) ||
                (c.clientName && c.clientName.toLowerCase().includes(query)) ||
                (c.services && c.services.toLowerCase().includes(query)) ||
                (c.sector && c.sector.toLowerCase().includes(query)) ||
                (c.email && c.email.toLowerCase().includes(query))
              );
              if (!matchesQuery) return false;

              const planInfo = getClientPlanInfo(c);

              // 1. Lifecycle Status Filter
              if (clientLifecycleFilter !== 'all') {
                if (clientLifecycleFilter === 'active') {
                  if (!isClientPlanActive(c)) return false;
                } else if (clientLifecycleFilter === 'expiring_soon') {
                  if (!c.active || planInfo.status !== 'Expiring Soon') return false;
                } else if (clientLifecycleFilter === 'expired') {
                  if (planInfo.status !== 'Expired') return false;
                } else if (clientLifecycleFilter === 'renewable') {
                  const isRenewable = planInfo.isRenewed || planInfo.status === 'Expired' || (c.active && planInfo.status === 'Expiring Soon');
                  if (!isRenewable) return false;
                } else if (clientLifecycleFilter === 'inactive') {
                  if (isClientPlanActive(c) || planInfo.status === 'Expired') return false;
                }
              }

              // 2. Month Scope Filter:
              // Applies to calendar contracts and revenue. When viewing active clients, active clients are NOT mixed with month!
              const shouldApplyMonth = (clientFilterScope === 'month' || isMonthScoped) && clientLifecycleFilter !== 'active';
              if (shouldApplyMonth) {
                if (clientStartDate || clientEndDate) {
                  if (!isClientContractInMonth(c, null, clientStartDate, clientEndDate)) return false;
                } else if (clientMonthFilter !== 'all') {
                  if (!isClientContractInMonth(c, clientMonthFilter)) return false;
                }
              }

              if (clientPaymentFilter !== 'all') {
                const pInfo = getClientPaymentInfo(c);
                if ((clientPaymentFilter === 'Full' || clientPaymentFilter === 'full') && pInfo.pStatus !== 'Full') return false;
                if ((clientPaymentFilter === 'Partial' || clientPaymentFilter === 'partial') && pInfo.pStatus !== 'Partial' && pInfo.pStatus !== 'Half') return false;
                if ((clientPaymentFilter === 'Pending' || clientPaymentFilter === 'pending') && pInfo.pStatus !== 'Pending' && pInfo.pStatus !== 'Unpaid') return false;
                if (clientPaymentFilter === 'paid_only' && pInfo.pStatus !== 'Full' && pInfo.pStatus !== 'Partial' && pInfo.pStatus !== 'Half') return false;
              }

              if (clientRevenueStreamFilter !== 'all') {
                const stream = getClientRevenueStream(c, clientMonthFilter);
                if (stream.type !== clientRevenueStreamFilter) return false;
              }

              return true;
            });

            // Global CRM Metrics (Strictly unmixed with revenue/month filter)
            const totalActiveClientsInCrm = clientsList.filter(c => isClientPlanActive(c)).length;
            const totalCrmClientsCount = clientsList.length;
            const activeFilteredClients = filteredClients.filter(c => isClientPlanActive(c));
            const totalAll58ClientsBilling = clientsList.reduce((sum, c) => sum + (c.packageAmount || 0), 0);

            // Global stream breakdown across all 58 clients for Expected Revenue card
            let all58SalesExpected = 0;
            let all58RenewalsExpected = 0;
            let all58RetainersExpected = 0;
            let activeSalesCount = 0;
            let activeRenewalsCount = 0;
            let activeRetainersCount = 0;

            clientsList.forEach(c => {
              const stream = getClientRevenueStream(c);
              const amt = c.packageAmount || 0;
              if (stream.type === 'NewPurchase') all58SalesExpected += amt;
              else if (stream.type === 'Renewal') all58RenewalsExpected += amt;
              else all58RetainersExpected += amt;

              if (isClientPlanActive(c)) {
                if (stream.type === 'NewPurchase') activeSalesCount++;
                else if (stream.type === 'Renewal') activeRenewalsCount++;
                else activeRetainersCount++;
              }
            });

            let expectedRevenue = 0;
            let actualRevenue = 0;
            let paymentReceivedCount = 0;
            let paymentPendingCount = 0;

            let newPurchasesCount = 0;
            let newPurchasesExpected = 0;
            let newPurchasesActual = 0;

            let renewalsCount = 0;
            let renewalsExpected = 0;
            let renewalsActual = 0;

            let retainersCount = 0;
            let retainersExpected = 0;
            let retainersActual = 0;

            let notRenewedCount = 0;
            let notRenewedExpected = 0;
            let expiringSoonCount = 0;
            let expiringSoonExpected = 0;

            // Revenue calculation is strictly calendar month based (day 1 to 30) - NOT mixed with active plan packs
            filteredClients.forEach(c => {
              const pkgAmt = c.packageAmount || 0;
              expectedRevenue += pkgAmt;

              let pPaid = 0;
              const pInfo = getClientPaymentInfo(c);
              if (pInfo.pStatus === 'Full') {
                pPaid = pkgAmt;
                actualRevenue += pkgAmt;
                paymentReceivedCount += 1;
              } else if (pInfo.pStatus === 'Partial' || pInfo.pStatus === 'Half') {
                pPaid = pInfo.paidAmount;
                actualRevenue += pInfo.paidAmount;
                paymentReceivedCount += 1;
                paymentPendingCount += 1;
              } else {
                paymentPendingCount += 1;
              }

              const stream = getClientRevenueStream(c, clientMonthFilter);
              const planStatus = getClientPlanStatus(c);

              if (stream.type === 'NewPurchase') {
                newPurchasesCount += 1;
                newPurchasesExpected += pkgAmt;
                newPurchasesActual += pPaid;
              } else if (stream.type === 'Renewal') {
                renewalsCount += 1;
                renewalsExpected += pkgAmt;
                renewalsActual += pPaid;
              } else {
                retainersCount += 1;
                retainersExpected += pkgAmt;
                retainersActual += pPaid;
              }

              if (stream.type !== 'Renewal' && planStatus.status === 'Expired') {
                notRenewedCount += 1;
                notRenewedExpected += pkgAmt;
              }
              if (planStatus.status === 'Expiring Soon') {
                expiringSoonCount += 1;
                expiringSoonExpected += pkgAmt;
              }
            });

            const pendingRevenue = Math.max(0, expectedRevenue - actualRevenue);
            const actualPercent = expectedRevenue > 0 ? Math.round((actualRevenue / expectedRevenue) * 100) : 0;
            const currentMonthLabel = (clientStartDate || clientEndDate)
              ? `📅 ${clientStartDate || 'Start'} to ${clientEndDate || 'End'}`
              : (clientMonthFilter === 'all'
                ? 'All Months (All-Time)'
                : (availableClientMonths.find(m => m.key === clientMonthFilter)?.label || clientMonthFilter));

            const totalRenewalPool = renewalsExpected + notRenewedExpected;
            const renewalPercent = totalRenewalPool > 0 ? Math.round((renewalsExpected / totalRenewalPool) * 100) : (renewalsCount > 0 ? 100 : 0);
            const notRenewedPercent = totalRenewalPool > 0 ? Math.round((notRenewedExpected / totalRenewalPool) * 100) : (notRenewedCount > 0 ? 100 : 0);

            return (
              <div className="space-y-6 animate-fade-in text-xs">

                {/* Client Metrics Divided into Actual, Expected & Pending with Stream Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total / Active Clients */}
                  <div 
                    onClick={() => {
                      setClientLifecycleFilter(clientLifecycleFilter === 'active' ? 'all' : 'active');
                      setClientFilterScope('all_clients');
                      setClientMonthFilter('all');
                      setClientStartDate('');
                      setClientEndDate('');
                    }}
                    className={`bg-white dark:bg-slate-900 border p-5 rounded-2xl shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all ${
                      clientLifecycleFilter === 'active'
                        ? 'border-blue-500 ring-2 ring-blue-400/20 bg-blue-50/20 dark:bg-blue-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-300'
                    }`}
                    title="Click to toggle Active Clients filter (Strictly active plan packs)"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Clients / Services</span>
                      <Users className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="my-2">
                      <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {totalActiveClientsInCrm} <span className="text-sm font-semibold text-slate-400">Active</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {totalCrmClientsCount} Total CRM Accounts {clientMonthFilter !== 'all' && `(${filteredClients.length} in ${currentMonthLabel})`}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setClientRevenueStreamFilter(clientRevenueStreamFilter === 'NewPurchase' ? 'all' : 'NewPurchase');
                        }}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition cursor-pointer hover:scale-105 ${
                          clientRevenueStreamFilter === 'NewPurchase'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-800/40'
                        }`}
                        title="Click to filter Sales clients"
                      >
                        🛒 {activeSalesCount} Sales
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setClientRevenueStreamFilter(clientRevenueStreamFilter === 'Renewal' ? 'all' : 'Renewal');
                        }}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition cursor-pointer hover:scale-105 ${
                          clientRevenueStreamFilter === 'Renewal'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border-purple-100 dark:border-purple-800/40'
                        }`}
                        title="Click to filter Renewal clients"
                      >
                        🔄 {activeRenewalsCount} Renewals
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setClientRevenueStreamFilter(clientRevenueStreamFilter === 'ActiveRetainer' ? 'all' : 'ActiveRetainer');
                        }}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition cursor-pointer hover:scale-105 ${
                          clientRevenueStreamFilter === 'ActiveRetainer'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-800/40'
                        }`}
                        title="Click to filter Retainer clients"
                      >
                        💼 {activeRetainersCount} Retainers
                      </button>
                    </div>
                  </div>

                  {/* Actual Revenue (Collected) */}
                  <div 
                    onClick={() => {
                      setClientPaymentFilter(clientPaymentFilter === 'paid_only' ? 'all' : 'paid_only');
                      setClientFilterScope('month');
                    }}
                    className={`bg-white dark:bg-slate-900 border p-5 rounded-2xl shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all ${
                      clientPaymentFilter === 'paid_only' || clientPaymentFilter === 'Full'
                        ? 'border-emerald-500 ring-2 ring-emerald-400/20 bg-emerald-50/20 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300'
                    }`}
                    title="Click to filter paid accounts in selected month (1 to 30 date)"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider">Actual Revenue</span>
                      <DollarSign className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="my-2">
                      <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        ₹{actualRevenue.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Cash Collected / Realized ({actualPercent}%)
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1 text-[9px] font-medium text-slate-500 dark:text-slate-400">
                      <span 
                        onClick={(e) => { e.stopPropagation(); setClientRevenueStreamFilter(clientRevenueStreamFilter === 'NewPurchase' ? 'all' : 'NewPurchase'); }}
                        className="cursor-pointer hover:underline"
                        title="Click to filter Sales clients"
                      >
                        Achieved Sale: <b className="text-emerald-600 font-bold">₹{newPurchasesActual.toLocaleString()}</b>
                      </span>
                      <span>•</span>
                      <span 
                        onClick={(e) => { e.stopPropagation(); setClientRevenueStreamFilter(clientRevenueStreamFilter === 'Renewal' ? 'all' : 'Renewal'); }}
                        className="cursor-pointer hover:underline"
                        title="Click to filter Renewal clients"
                      >
                        Achieved Renewal: <b className="text-purple-600 font-bold">₹{renewalsActual.toLocaleString()}</b>
                      </span>
                      <span>•</span>
                      <span 
                        onClick={(e) => { e.stopPropagation(); setClientRevenueStreamFilter(clientRevenueStreamFilter === 'ActiveRetainer' ? 'all' : 'ActiveRetainer'); }}
                        className="cursor-pointer hover:underline"
                        title="Click to filter Retainer clients"
                      >
                        Ret: <b className="text-blue-600 font-bold">₹{retainersActual.toLocaleString()}</b>
                      </span>
                    </div>
                  </div>

                  {/* Expected Revenue (Total Billing) */}
                  <div 
                    onClick={() => {
                      setClientPaymentFilter('all');
                      setClientLifecycleFilter('all');
                      setClientRevenueStreamFilter('all');
                      setClientFilterScope('all_clients');
                      setClientMonthFilter('all');
                      setClientStartDate('');
                      setClientEndDate('');
                    }}
                    className={`bg-white dark:bg-slate-900 border p-5 rounded-2xl shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all ${
                      clientFilterScope === 'all_clients' && clientPaymentFilter === 'all' && clientLifecycleFilter === 'all' && clientRevenueStreamFilter === 'all'
                        ? 'border-indigo-500 ring-2 ring-indigo-400/20 bg-indigo-50/20 dark:bg-indigo-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                    }`}
                    title="Click to view all 58 clients amount (Reset filters to All Clients)"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase tracking-wider">Expected Revenue</span>
                      <BarChart2 className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="my-2">
                      <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                        ₹{totalAll58ClientsBilling.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        All {clientsList.length} CRM Clients Target Billing
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1 text-[9px] font-medium text-slate-500 dark:text-slate-400">
                      <span 
                        onClick={(e) => { e.stopPropagation(); setClientRevenueStreamFilter(clientRevenueStreamFilter === 'NewPurchase' ? 'all' : 'NewPurchase'); }}
                        className="cursor-pointer hover:underline"
                        title="Click to filter Sales clients"
                      >
                        Target Sale: <b className="text-indigo-600 font-bold">₹{all58SalesExpected.toLocaleString()}</b>
                      </span>
                      <span>•</span>
                      <span 
                        onClick={(e) => { e.stopPropagation(); setClientRevenueStreamFilter(clientRevenueStreamFilter === 'Renewal' ? 'all' : 'Renewal'); }}
                        className="cursor-pointer hover:underline"
                        title="Click to filter Renewal clients"
                      >
                        Target Renewal: <b className="text-purple-600 font-bold">₹{all58RenewalsExpected.toLocaleString()}</b>
                      </span>
                      <span>•</span>
                      <span 
                        onClick={(e) => { e.stopPropagation(); setClientRevenueStreamFilter(clientRevenueStreamFilter === 'ActiveRetainer' ? 'all' : 'ActiveRetainer'); }}
                        className="cursor-pointer hover:underline"
                        title="Click to filter Retainer clients"
                      >
                        Ret: <b className="text-blue-600 font-bold">₹{all58RetainersExpected.toLocaleString()}</b>
                      </span>
                    </div>
                  </div>

                  {/* Pending Revenue (Outstanding) */}
                  <div 
                    onClick={() => setClientPaymentFilter(clientPaymentFilter === 'Pending' ? 'all' : 'Pending')}
                    className={`bg-white dark:bg-slate-900 border p-5 rounded-2xl shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all ${
                      clientPaymentFilter === 'Pending'
                        ? 'border-orange-500 ring-2 ring-orange-400/20 bg-orange-50/20 dark:bg-orange-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-orange-300'
                    }`}
                    title="Click to filter pending balance accounts"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-orange-600 dark:text-orange-400 font-extrabold uppercase tracking-wider">Pending Revenue</span>
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="my-2">
                      <div className="text-2xl font-black text-orange-500">
                        ₹{pendingRevenue.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Outstanding Balance to Collect
                      </div>
                    </div>
                    <span className="text-[9px] text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-full border border-orange-100 dark:border-orange-800/40 w-fit">
                      {paymentPendingCount} Accounts Pending
                    </span>
                  </div>
                </div>

                {/* Plan Renewals vs Non-Renewals Progress Bar Card in CEO CRM */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900">
                        <RefreshCw className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          Renewals vs Non-Renewals Revenue ({currentMonthLabel})
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          Renewed plan revenue vs overdue / unrenewed contract revenue
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg border border-purple-200/60 dark:border-purple-800 w-fit">
                      Renewal Rate: {renewalPercent}%
                    </span>
                  </div>

                  {/* Dual Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-bold gap-1">
                      <span 
                        onClick={() => setClientRevenueStreamFilter(clientRevenueStreamFilter === 'Renewal' ? 'all' : 'Renewal')}
                        className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400 cursor-pointer hover:underline"
                        title="Click to filter renewed clients"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                        🔄 Renewed: ₹{renewalsExpected.toLocaleString()} ({renewalsCount} accounts • {renewalPercent}%)
                      </span>
                      <span 
                        onClick={() => setClientLifecycleFilter(clientLifecycleFilter === 'expired' ? 'all' : 'expired')}
                        className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 cursor-pointer hover:underline"
                        title="Click to filter expired / non-renewed clients"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                        ⚠️ Not Renewed: ₹{notRenewedExpected.toLocaleString()} ({notRenewedCount} accounts • {notRenewedPercent}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-6 rounded-xl overflow-hidden flex shadow-inner p-1 gap-1">
                      {renewalsExpected > 0 && (
                        <div
                          onClick={() => setClientRevenueStreamFilter(clientRevenueStreamFilter === 'Renewal' ? 'all' : 'Renewal')}
                          className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-lg transition-all duration-1000 ease-out flex items-center justify-center text-[9px] font-black text-white px-2 shadow-sm cursor-pointer hover:opacity-90 active:scale-[0.99]"
                          style={{ width: `${Math.max(renewalPercent, 10)}%` }}
                          title={`Click to filter Renewed accounts: ₹${renewalsExpected.toLocaleString()} (${renewalsCount} accounts)`}
                        >
                          {renewalPercent}% Renewed (₹{renewalsExpected.toLocaleString()})
                        </div>
                      )}
                      {notRenewedExpected > 0 && (
                        <div
                          onClick={() => setClientLifecycleFilter(clientLifecycleFilter === 'expired' ? 'all' : 'expired')}
                          className="bg-gradient-to-r from-rose-500 to-red-600 h-full rounded-lg transition-all duration-1000 ease-out flex items-center justify-center text-[9px] font-black text-white px-2 shadow-sm cursor-pointer hover:opacity-90 active:scale-[0.99]"
                          style={{ width: `${Math.max(notRenewedPercent, 10)}%` }}
                          title={`Click to filter Not Renewed / Expired accounts: ₹${notRenewedExpected.toLocaleString()} (${notRenewedCount} accounts)`}
                        >
                          {notRenewedPercent}% Not Renewed (₹{notRenewedExpected.toLocaleString()})
                        </div>
                      )}
                      {totalRenewalPool === 0 && (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-bold">
                          No renewal cycle data in this period
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Unified Lifecycle Status Filter Row across ALL clients */}
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 mr-1">
                        Lifecycle Status:
                      </span>
                      {[
                        { key: 'all', label: 'All Clients', count: globalLifecycleCounts.all, color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200' },
                        { key: 'active', label: 'Active Plans', count: globalLifecycleCounts.active, color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' },
                        { key: 'expiring_soon', label: 'Expiring Soon (7d)', count: globalLifecycleCounts.expiring_soon, color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' },
                        { key: 'expired', label: 'Expired / Due', count: globalLifecycleCounts.expired, color: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300' },
                        { key: 'renewable', label: 'Renewable / Renewed', count: globalLifecycleCounts.renewable, color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300' },
                        { key: 'inactive', label: 'Inactive Accounts', count: globalLifecycleCounts.inactive, color: 'bg-slate-100 dark:bg-slate-800 text-slate-500' }
                      ].map(pill => {
                        const isSelected = clientLifecycleFilter === pill.key;
                        return (
                          <button
                            key={pill.key}
                            onClick={() => {
                              setClientLifecycleFilter(pill.key);
                              if (pill.key !== 'all') {
                                setClientFilterScope('all_clients');
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${isSelected
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                              }`}
                          >
                            <span>{pill.label}</span>
                            <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black ${isSelected ? 'bg-white/20 text-white' : pill.color
                              }`}>
                              {pill.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Scope Selector: All Clients (Global) vs Selected Month */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setClientFilterScope('all_clients')}
                        className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${clientFilterScope === 'all_clients'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-black'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        title="Search and filter across entire client base (all months)"
                      >
                        🌐 All Clients (Global)
                      </button>
                      <button
                        type="button"
                        onClick={() => setClientFilterScope('month')}
                        className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${clientFilterScope === 'month'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-black'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        title="Filter within the selected calendar month"
                      >
                        📅 Month Specific
                      </button>
                    </div>
                  </div>

                  {/* Active filter informational breadcrumb */}
                  {clientLifecycleFilter !== 'all' && (
                    <div className="flex items-center justify-between text-[11px] bg-blue-50/70 dark:bg-blue-950/30 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900/40 text-blue-800 dark:text-blue-300">
                      <span>
                        Showing <strong>{
                          clientLifecycleFilter === 'active' ? 'Active Plans' :
                            clientLifecycleFilter === 'expiring_soon' ? 'Expiring Soon (Within 7 Days)' :
                              clientLifecycleFilter === 'expired' ? 'Expired / Renewal Due' :
                                clientLifecycleFilter === 'renewable' ? 'Renewable / Renewed Subscriptions' : 'Inactive Accounts'
                        }</strong> from {clientFilterScope === 'all_clients' ? '🌐 All Clients in the agency (not restricted by month)' : `📅 ${currentMonthLabel}`}.
                      </span>
                      <button
                        onClick={() => {
                          setClientLifecycleFilter('all');
                          setClientFilterScope('all_clients');
                        }}
                        className="font-bold underline hover:text-blue-950 dark:hover:text-white cursor-pointer ml-2"
                      >
                        Show All
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Toolbar with Filters */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 flex-wrap">
                    <div className="relative flex items-center flex-1 min-w-[200px] max-w-md">
                      <Search className="absolute left-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search business, name, ID, sector, services..."
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:outline-none focus:border-blue-600 text-xs transition"
                      />
                    </div>

                    {/* Month Filter Selector */}
                    <div className="flex items-center gap-1.5">
                      <select
                        value={clientMonthFilter}
                        onChange={(e) => handleMonthRangeChange(e.target.value, setClientMonthFilter, setClientStartDate, setClientEndDate)}
                        className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-600 cursor-pointer shadow-sm"
                      >
                        <option value="all">📅 All Months</option>
                        {availableClientMonths.map(m => (
                          <option key={m.key} value={m.key}>
                            📅 {m.label} ({m.count} clients)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date Range: Starting to Ending Date */}
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">From</span>
                        <input
                          type="date"
                          value={clientStartDate}
                          onChange={(e) => { setClientStartDate(e.target.value); setClientMonthFilter('custom'); }}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-600 cursor-pointer shadow-inner"
                        />
                      </div>
                      <span className="text-slate-400 font-bold text-xs">-</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">To</span>
                        <input
                          type="date"
                          value={clientEndDate}
                          onChange={(e) => { setClientEndDate(e.target.value); setClientMonthFilter('custom'); }}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-600 cursor-pointer shadow-inner"
                        />
                      </div>
                      {(clientStartDate || clientEndDate) && (
                        <button
                          onClick={() => { setClientStartDate(''); setClientEndDate(''); setClientMonthFilter('all'); }}
                          className="ml-1 px-1.5 py-0.5 text-[10px] font-black text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition cursor-pointer"
                          title="Clear Date Range"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Revenue Stream Filter Selector */}
                    <div className="flex items-center gap-1.5">
                      <select
                        value={clientRevenueStreamFilter}
                        onChange={(e) => setClientRevenueStreamFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-600 cursor-pointer shadow-sm"
                      >
                        <option value="all">🌐 All Streams</option>
                        <option value="NewPurchase">🛒 New Plan Purchases</option>
                        <option value="Renewal">🔄 Plan Renewals</option>
                        <option value="ActiveRetainer">💼 Active Retainers</option>
                      </select>
                    </div>

                    {/* Payment Status Filter Selector */}
                    <div className="flex items-center gap-1.5">
                      <select
                        value={clientPaymentFilter}
                        onChange={(e) => setClientPaymentFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-600 cursor-pointer shadow-sm"
                      >
                        <option value="all">💳 All Payments</option>
                        <option value="Full">✅ Fully Paid</option>
                        <option value="Partial">⏳ Partial / Half</option>
                        <option value="Pending">⚠️ Pending / Unpaid</option>
                      </select>
                    </div>

                    {(clientMonthFilter !== 'all' || clientStartDate || clientEndDate || clientRevenueStreamFilter !== 'all' || clientPaymentFilter !== 'all' || clientLifecycleFilter !== 'all' || searchQuery) && (
                      <button
                        onClick={() => {
                          setClientMonthFilter('all');
                          setClientStartDate('');
                          setClientEndDate('');
                          setClientRevenueStreamFilter('all');
                          setClientPaymentFilter('all');
                          setClientLifecycleFilter('all');
                          setClientFilterScope('all_clients');
                          setSearchQuery('');
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => { setExcelModalType('clients'); setExcelModalOpen(true); }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-xs shadow-md shadow-emerald-500/10 shrink-0 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Import via Excel
                  </button>

                  <button
                    onClick={() => { resetClientForm(); setShowAddClientModal(true); }}
                    className="bg-blue-800 hover:bg-blue-900 text-white py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-xs shadow-md shadow-blue-500/10 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Onboard New Client
                  </button>
                </div>

                {/* Table List */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider">
                          <th className="p-4">ID</th>
                          <th className="p-4">Business / Client Name</th>
                          <th className="p-4">Service & Plan Stream</th>
                          <th className="p-4">Amount & Payment</th>
                          <th className="p-4">Plan Cycle & Expiry</th>
                          <th className="p-4 text-center">Page Ready?</th>
                          <th className="p-4 text-center">Active?</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredClients.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                              No clients found matching the selected filter ({currentMonthLabel}).
                            </td>
                          </tr>
                        ) : (
                          filteredClients.map((client) => {
                            const stream = getClientRevenueStream(client, clientMonthFilter);
                            const pInfo = getClientPaymentInfo(client);
                            const planInfo = getClientPlanInfo(client);
                            return (
                              <tr key={client.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition">
                                <td className="p-4 font-bold text-slate-450">{client.clientId}</td>
                                <td className="p-4">
                                  <div className="font-bold text-slate-900 dark:text-white">{client.businessName}</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">{client.clientName || 'No Contact Person'}</div>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-slate-800 dark:text-slate-250">{client.services}</span>
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${stream.badgeClass}`}>
                                      {stream.badge}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                                      {planInfo.durationLabel}
                                    </span>
                                    {planInfo.isRenewed && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                                        🔄 Cycle #{(client.renewalHistory?.length || 0) + 1}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[9px] text-slate-400 mt-0.5">{client.packageName}</div>
                                </td>
                                <td className="p-4">
                                  <div className="font-extrabold text-slate-900 dark:text-white">
                                    ₹{client.packageAmount.toLocaleString()}
                                  </div>
                                  {pInfo.pStatus === 'Full' ? (
                                    <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                      ✓ Full Paid (₹{pInfo.paidAmount.toLocaleString()})
                                    </div>
                                  ) : (pInfo.pStatus === 'Partial' || pInfo.pStatus === 'Half') ? (
                                    <div className="text-[9px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                                      Paid: ₹{pInfo.paidAmount.toLocaleString()} • Due: ₹{pInfo.pendingBalance.toLocaleString()}
                                    </div>
                                  ) : (
                                    <div className="text-[9px] font-bold text-red-500 mt-0.5">
                                      ⚠️ Pending (₹{client.packageAmount.toLocaleString()})
                                    </div>
                                  )}
                                </td>
                                <td className="p-4">
                                  <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                    {client.joiningDate} → {planInfo.expiryDateStr}
                                  </div>
                                  <div className="mt-1 flex items-center gap-1.5">
                                    {planInfo.isExpired ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                                        Expired ({Math.abs(planInfo.daysLeft)}d ago)
                                      </span>
                                    ) : planInfo.isExpiringSoon ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 animate-pulse">
                                        ⚠️ {planInfo.daysLeft}d left (Due: {planInfo.renewalDueDateStr})
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                                        ✓ {planInfo.daysLeft}d left (Due: {planInfo.renewalDueDateStr})
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${client.accountReady ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : 'bg-red-50 dark:bg-red-950/40 text-red-600'}`}>
                                    {client.accountReady ? 'Yes' : 'No'}
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${client.active ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                                    {client.active ? 'ACTIVE' : 'INACTIVE'}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => {
                                        setSelectedClient(client);
                                        setShowClientDetailModal(true);
                                        refreshClientTasks(client.id);
                                        setClientTaskFormId(`${client.clientId}-TASK-01`);
                                        setClientTaskFormTitle('');
                                        setClientTaskFormDate(new Date().toISOString().split('T')[0]);
                                        setClientTaskFormAssignTo('Graphic Designer');
                                        setClientTaskFormWorkingOn('');
                                        setClientTaskFormStatus('Not Started');
                                        setClientTaskFormPostType('Graphic');
                                        setClientTaskFormNotes('');
                                        setClientTaskEditMode(false);
                                      }}
                                      className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-lg transition"
                                    >
                                      Details
                                    </button>
                                    <button
                                      onClick={() => { resetClientForm(client); setShowEditClientModal(true); }}
                                      className="p-1.5 border border-slate-200 dark:border-slate-855 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition"
                                      title="Edit"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClient(client.id, client.businessName)}
                                      className="p-1.5 border border-slate-200 dark:border-slate-855 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-red-650 transition"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </main>

      {/* --- ADD USER MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900 shrink-0">
              <h3 className="font-extrabold text-sm text-slate-950 dark:text-white">Add New Staff Member</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition text-sm">✕</button>
            </div>

            <form onSubmit={handleAddUser} autoComplete="off" className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
                {formError && (
                  <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Name</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Alice Cooper"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. alice@company.com"
                      autoComplete="off"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Password</label>
                    <input
                      type="password"
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="e.g. SecurePass123"
                      autoComplete="new-password"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Monthly Salary ($)</label>
                    <input
                      type="number"
                      required
                      value={formSalary}
                      onChange={(e) => setFormSalary(e.target.value)}
                      placeholder="e.g. 6000"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Role</label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                    >
                      <option value="EMPLOYEE">Employee</option>
                      <option value="SALES">Sales Executive / Person</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Department</label>
                    <select
                      value={formDept}
                      onChange={(e) => setFormDept(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                    >
                      <option value="Executive">Executive</option>
                      <option value="Social Media Marketing">Social Media Marketing</option>
                      <option value="Video Editing / Content Creator">Video Editing / Content Creator</option>
                      <option value="Graphics">Graphics</option>
                      <option value="Software Development">Software Development</option>
                      <option value="Sales">Sales</option>
                      <option value="HR">HR</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Profile Emoji Avatar</label>
                    <input
                      type="text"
                      value={formAvatar}
                      onChange={(e) => setFormAvatar(e.target.value)}
                      placeholder="e.g. 👩‍💻"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white text-center focus:outline-none"
                    />
                  </div>
                </div>

              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col-reverse sm:flex-row justify-end gap-2 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-2.5 px-4 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="py-2.5 px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50 text-center"
                >
                  {formLoading ? 'Creating...' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT USER MODAL --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900 shrink-0">
              <h3 className="font-extrabold text-sm text-slate-950 dark:text-white">Modify Staff Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 transition text-sm">✕</button>
            </div>

            <form onSubmit={handleEditUser} autoComplete="off" className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
                {formError && (
                  <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Name</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      autoComplete="off"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Update Password (Leave blank to keep current)</label>
                    <input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="New password (optional)"
                      autoComplete="new-password"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Monthly Salary ($)</label>
                    <input
                      type="number"
                      required
                      value={formSalary}
                      onChange={(e) => setFormSalary(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Role</label>
                    <select
                      value={formRole}
                      disabled={selectedUser && selectedUser.id === currentUser.id}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 disabled:opacity-50"
                    >
                      <option value="EMPLOYEE">Employee</option>
                      <option value="SALES">Sales Executive / Person</option>
                      <option value="ADMIN">Admin</option>
                      <option value="CEO">CEO</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Department</label>
                    <select
                      value={formDept}
                      onChange={(e) => setFormDept(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                    >
                      <option value="Executive">Executive</option>
                      <option value="Social Media Marketing">Social Media Marketing</option>
                      <option value="Video Editing / Content Creator">Video Editing / Content Creator</option>
                      <option value="Graphics">Graphics</option>
                      <option value="Software Development">Software Development</option>
                      <option value="Sales">Sales</option>
                      <option value="HR">HR</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Profile Emoji Avatar</label>
                    <input
                      type="text"
                      value={formAvatar}
                      onChange={(e) => setFormAvatar(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white text-center focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Status</label>
                    <select
                      value={formStatus}
                      disabled={selectedUser && selectedUser.id === currentUser.id}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 disabled:opacity-50"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>

              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col-reverse sm:flex-row justify-end gap-2 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="py-2.5 px-4 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="py-2.5 px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50 text-center"
                >
                  {formLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD CLIENT MODAL --- */}
      {showAddClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-fade-in text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-855 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900 shrink-0">
              <h3 className="font-extrabold text-sm text-slate-950 dark:text-white">Onboard New Client Account</h3>
              <button onClick={() => setShowAddClientModal(false)} className="text-slate-400 hover:text-slate-650 transition text-sm">✕</button>
            </div>

            <form onSubmit={handleAddClient} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                {formError && (
                  <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-350">Client ID (Auto Generated)</label>
                    <input
                      type="text"
                      required
                      value={clientFormId}
                      onChange={(e) => setClientFormId(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-350">Business Name</label>
                    <input
                      type="text"
                      required
                      value={clientFormBiz}
                      onChange={(e) => setClientFormBiz(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-350">Client Contact Person Name</label>
                    <input
                      type="text"
                      value={clientFormName}
                      onChange={(e) => setClientFormName(e.target.value)}
                      placeholder="e.g. John Miller"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-350">Joining Date</label>
                    <input
                      type="text"
                      required
                      value={clientFormDate}
                      onChange={(e) => setClientFormDate(e.target.value)}
                      placeholder="e.g. 02-May-2026"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-350">Services Category</label>
                    <select
                      value={clientFormServices}
                      onChange={(e) => setClientFormServices(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="Meta Ads">Meta Ads</option>
                      <option value="Google Ads">Google Ads</option>
                      <option value="Social media Posts">Social media Posts</option>
                      <option value="AI Videos">AI Videos</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-350">Package Description</label>
                    <input
                      type="text"
                      required
                      value={clientFormPkg}
                      onChange={(e) => setClientFormPkg(e.target.value)}
                      placeholder="e.g. Premium(Google Ads)"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-355">Package Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={clientFormAmt}
                      onChange={(e) => setClientFormAmt(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-350">Contact Number</label>
                    <input
                      type="text"
                      value={clientFormContact}
                      onChange={(e) => setClientFormContact(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-350">Email Address</label>
                    <input
                      type="email"
                      value={clientFormEmail}
                      onChange={(e) => setClientFormEmail(e.target.value)}
                      placeholder="e.g. client@domain.com"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-350">Website</label>
                    <input
                      type="text"
                      value={clientFormWebsite}
                      onChange={(e) => setClientFormWebsite(e.target.value)}
                      placeholder="e.g. www.domain.com"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-355">Business Sector</label>
                    <input
                      type="text"
                      value={clientFormSector}
                      onChange={(e) => setClientFormSector(e.target.value)}
                      placeholder="e.g. E-Commerce"
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-4 sm:gap-6 items-center pt-2 sm:pt-5">
                    <label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={clientFormReady}
                        onChange={(e) => setClientFormReady(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>Account / Page Ready?</span>
                    </label>
                    <label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={clientFormActive}
                        onChange={(e) => setClientFormActive(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>Active Client?</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-355">Service Deliverables / Requirement</label>
                  <textarea
                    value={clientFormReq}
                    onChange={(e) => setClientFormReq(e.target.value)}
                    placeholder="e.g. Daily Activity: 5 Creatives, 3 Reels, 2 Ai Videos"
                    rows="2"
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-355">Execution Notes / Payments Details</label>
                  <textarea
                    value={clientFormNotes}
                    onChange={(e) => setClientFormNotes(e.target.value)}
                    placeholder="Notes regarding client onboarding, custom package adjustments..."
                    rows="2"
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col-reverse sm:flex-row justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  className="py-2.5 px-4 border border-slate-200 dark:border-slate-755 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="py-2.5 px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-lg transition disabled:opacity-50 text-center"
                >
                  {formLoading ? 'Onboarding...' : 'Onboard Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT CLIENT MODAL --- */}
      {showEditClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-fade-in text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-855 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900 shrink-0">
              <h3 className="font-extrabold text-sm text-slate-950 dark:text-white">Modify Client Profile</h3>
              <button onClick={() => setShowEditClientModal(false)} className="text-slate-400 hover:text-slate-655 transition text-sm">✕</button>
            </div>

            <form onSubmit={handleEditClient} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                {formError && (
                  <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-355">Client ID</label>
                    <input
                      type="text"
                      required
                      value={clientFormId}
                      onChange={(e) => setClientFormId(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none font-semibold text-slate-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-355">Business Name</label>
                    <input
                      type="text"
                      required
                      value={clientFormBiz}
                      onChange={(e) => setClientFormBiz(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-355">Client Contact Person Name</label>
                    <input
                      type="text"
                      value={clientFormName}
                      onChange={(e) => setClientFormName(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-355">Joining Date</label>
                    <input
                      type="text"
                      required
                      value={clientFormDate}
                      onChange={(e) => setClientFormDate(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-355">Services Category</label>
                    <select
                      value={clientFormServices}
                      onChange={(e) => setClientFormServices(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="Meta Ads">Meta Ads</option>
                      <option value="Google Ads">Google Ads</option>
                      <option value="Social media Posts">Social media Posts</option>
                      <option value="AI Videos">AI Videos</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-355">Package Description</label>
                    <input
                      type="text"
                      required
                      value={clientFormPkg}
                      onChange={(e) => setClientFormPkg(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-355">Package Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={clientFormAmt}
                      onChange={(e) => setClientFormAmt(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-355">Contact Number</label>
                    <input
                      type="text"
                      value={clientFormContact}
                      onChange={(e) => setClientFormContact(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-355">Email Address</label>
                    <input
                      type="email"
                      value={clientFormEmail}
                      onChange={(e) => setClientFormEmail(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-355">Website</label>
                    <input
                      type="text"
                      value={clientFormWebsite}
                      onChange={(e) => setClientFormWebsite(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-355">Business Sector</label>
                    <input
                      type="text"
                      value={clientFormSector}
                      onChange={(e) => setClientFormSector(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-4 sm:gap-6 items-center pt-2 sm:pt-5">
                    <div className="space-y-1 flex-1 min-w-[140px]">
                      <label className="font-bold text-slate-700 dark:text-slate-300">Page Created / Account Ready?</label>
                      <select
                        value={clientFormReady ? "Yes" : "No"}
                        onChange={(e) => setClientFormReady(e.target.value === "Yes")}
                        className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                      >
                        <option value="Yes">Yes (Page Created & Ready)</option>
                        <option value="No">No (Page Creation Required)</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 cursor-pointer pt-4">
                      <input
                        type="checkbox"
                        checked={clientFormActive}
                        onChange={(e) => setClientFormActive(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>Active Client?</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-355">Service Deliverables / Requirement</label>
                  <textarea
                    value={clientFormReq}
                    onChange={(e) => setClientFormReq(e.target.value)}
                    rows="2"
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-355">Execution Notes / Payments Details</label>
                  <textarea
                    value={clientFormNotes}
                    onChange={(e) => setClientFormNotes(e.target.value)}
                    rows="2"
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col-reverse sm:flex-row justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditClientModal(false)}
                  className="py-2.5 px-4 border border-slate-200 dark:border-slate-755 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="py-2.5 px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-lg transition disabled:opacity-50 text-center"
                >
                  {formLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CLIENT DETAIL VIEW MODAL --- */}
      {showClientDetailModal && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-fade-in text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-855 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden animate-scale-up text-slate-800 dark:text-slate-200 max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900 shrink-0">
              <div>
                <h3 className="font-extrabold text-sm text-slate-950 dark:text-white">{selectedClient.businessName}</h3>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase mt-0.5 tracking-wider">Client ID: {selectedClient.clientId}</span>
              </div>
              <button onClick={() => setShowClientDetailModal(false)} className="text-slate-400 hover:text-slate-655 transition text-sm">✕</button>
            </div>

            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1">

              {/* Left Column: Client Details */}
              <div className="lg:col-span-5 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800/60 pb-6 lg:pb-0 pr-0 lg:pr-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase">Contact Person</span>
                    <p className="font-bold text-slate-900 dark:text-white text-[11px] mt-0.5">{selectedClient.clientName || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase">Joining Date</span>
                    <p className="font-bold text-slate-900 dark:text-white text-[11px] mt-0.5">{selectedClient.joiningDate}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase">Services Category</span>
                    <p className="font-bold text-slate-900 dark:text-white text-[11px] mt-0.5">{selectedClient.services}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase">Monthly Package Cost</span>
                    <p className="font-extrabold text-blue-750 dark:text-blue-400 text-[11px] mt-0.5">₹{selectedClient.packageAmount.toLocaleString()}/mo</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase">Contact Number</span>
                    <p className="font-semibold text-slate-700 dark:text-slate-350 mt-0.5 truncate" title={selectedClient.contact}>{selectedClient.contact || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase">Email Address</span>
                    <p className="font-semibold text-slate-700 dark:text-slate-355 mt-0.5 truncate" title={selectedClient.email}>{selectedClient.email || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase">Website</span>
                    <p className="font-semibold text-slate-700 dark:text-slate-355 mt-0.5 truncate" title={selectedClient.website}>{selectedClient.website || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase">Sector</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-300 mt-0.5">{selectedClient.sector || 'N/A'}</p>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase block font-semibold">Page Ready</span>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold mt-1 ${selectedClient.accountReady ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-655 border border-red-200'}`}>
                        {selectedClient.accountReady ? 'READY' : 'PENDING'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase block font-semibold">Contract</span>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold mt-1 ${selectedClient.active ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {selectedClient.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">Execution Requirement</span>
                  <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border border-slate-200/50 dark:border-slate-800 text-[11px] font-medium leading-relaxed">
                    {selectedClient.requirement || <span className="text-slate-400 italic">No specific instructions specified.</span>}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">Audit & Execution Notes</span>
                  <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border border-slate-200/50 dark:border-slate-800 text-[11px] font-medium leading-relaxed">
                    {selectedClient.notes || <span className="text-slate-400 italic">No additional notes added.</span>}
                  </div>
                </div>
              </div>

              {/* Right Column: CRM Tasks Deliverables board */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">CRM Tasks Deliverables</h4>
                  <button
                    type="button"
                    onClick={() => resetClientTaskForm()}
                    className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    + Reset Form
                  </button>
                </div>

                {/* Client Task Form */}
                <form onSubmit={handleAddOrEditClientTask} className="bg-slate-50 dark:bg-slate-850/50 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Task ID</label>
                      <input
                        type="text"
                        required
                        value={clientTaskFormId}
                        onChange={(e) => setClientTaskFormId(e.target.value)}
                        className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Task Deliverable</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. SM Reels 1"
                        value={clientTaskFormTitle}
                        onChange={(e) => setClientTaskFormTitle(e.target.value)}
                        className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Date</label>
                      <input
                        type="text"
                        required
                        value={clientTaskFormDate}
                        onChange={(e) => setClientTaskFormDate(e.target.value)}
                        className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Assign To</label>
                      <select
                        value={clientTaskFormAssignTo}
                        onChange={(e) => setClientTaskFormAssignTo(e.target.value)}
                        className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded text-slate-900 dark:text-white focus:outline-none"
                      >
                        <option value="Graphic Designer">Graphic Designer</option>
                        <option value="Ads Campaign Manager">Ads Campaign Manager</option>
                        <option value="AI Video Lead">AI Video Lead</option>
                        <option value="AI Video Editor">AI Video Editor</option>
                        <option value="Social Media Executive">Social Media Executive</option>
                        <option value="Video Editor">Video Editor</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Working On</label>
                      <input
                        type="text"
                        placeholder="Staff name"
                        value={clientTaskFormWorkingOn}
                        onChange={(e) => setClientTaskFormWorkingOn(e.target.value)}
                        className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Status</label>
                      <select
                        value={clientTaskFormStatus}
                        onChange={(e) => setClientTaskFormStatus(e.target.value)}
                        className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded text-slate-900 dark:text-white focus:outline-none"
                      >
                        <option value="Not Started">Not Started</option>
                        <option value="Processing">Processing</option>
                        <option value="Client Review">Client Review</option>
                        <option value="Revision">Revision</option>
                        <option value="Completion">Completion</option>
                        <option value="Pending">Pending</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 items-end">
                    <div className="col-span-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Post Type</label>
                      <select
                        value={clientTaskFormPostType}
                        onChange={(e) => setClientTaskFormPostType(e.target.value)}
                        className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded text-slate-900 dark:text-white focus:outline-none"
                      >
                        <option value="Graphic">Graphic</option>
                        <option value="Reel">Reel</option>
                        <option value="AI Video">AI Video</option>
                        <option value="None">None</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Task Notes</label>
                      <input
                        type="text"
                        placeholder="e.g. Graphic approved by client"
                        value={clientTaskFormNotes}
                        onChange={(e) => setClientTaskFormNotes(e.target.value)}
                        className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1">
                      <button
                        type="submit"
                        disabled={formLoading}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition disabled:opacity-50"
                      >
                        {clientTaskEditMode ? 'Save' : 'Add Task'}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Tasks Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  <div className="max-h-60 overflow-y-auto overflow-x-auto">
                    {loadingTasks ? (
                      <div className="p-8 text-center text-slate-400">Loading deliverables...</div>
                    ) : selectedClientTasks.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 italic">No task deliverables created.</div>
                    ) : (
                      <table className="w-full min-w-[550px] text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                            <th className="p-2.5">Date & ID</th>
                            <th className="p-2.5">Deliverable</th>
                            <th className="p-2.5">Owner / Dept</th>
                            <th className="p-2.5">Status</th>
                            <th className="p-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                          {selectedClientTasks.map((task) => (
                            <tr key={task.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition">
                              <td className="p-2.5 font-semibold">
                                <div className="text-slate-800 dark:text-slate-200">
                                  {task.postType === 'Posting' || (task.taskTitle && task.taskTitle.toLowerCase().startsWith('post ')) ? (
                                    <span className="text-amber-600 dark:text-amber-400 font-extrabold text-[9px] uppercase tracking-wider">Trigger on Approval (24h)</span>
                                  ) : (
                                    task.date
                                  )}
                                </div>
                                <div className="text-[8px] text-slate-400 mt-0.5 font-bold uppercase">{task.taskId}</div>
                              </td>
                              <td className="p-2.5">
                                <div className="font-bold text-slate-900 dark:text-white">{task.taskTitle}</div>
                                {task.notes && <div className="text-[9px] text-slate-400 mt-0.5 font-medium italic">"{task.notes}"</div>}
                              </td>
                              <td className="p-2.5">
                                <div className="font-semibold text-slate-700 dark:text-slate-350">{task.workingOn || 'Unassigned'}</div>
                                <div className="text-[8px] text-slate-450 mt-0.5 uppercase tracking-wide font-bold">{task.assignTo}</div>
                              </td>
                              <td className="p-2.5">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase
                                  ${task.status === 'Complete Task'
                                    ? 'bg-emerald-500 text-white'
                                    : task.status === 'Working On It'
                                      ? 'bg-orange-500 text-white'
                                      : 'bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-400'}`}
                                >
                                  {task.status}
                                </span>
                                {task.postType && task.postType !== 'None' && (
                                  <div className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Type: {task.postType}</div>
                                )}
                              </td>
                              <td className="p-2.5 text-right">
                                <div className="flex gap-1.5 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => resetClientTaskForm(task)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-500 rounded transition"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteClientTask(task.id, task.taskTitle)}
                                    className="p-1 hover:bg-red-50 dark:hover:bg-red-955/20 border border-slate-250 dark:border-slate-700 text-red-550 rounded transition"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
              <button
                onClick={() => setShowClientDetailModal(false)}
                className="py-2 px-5 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Sheet Bulk Upload Modal */}
      <ExcelImportModal
        isOpen={excelModalOpen}
        onClose={() => setExcelModalOpen(false)}
        panelType={excelModalType}
        onSuccess={() => {
          refreshData();
          showToast('Data imported successfully!', 'success');
        }}
      />

    </div>
  );
}
