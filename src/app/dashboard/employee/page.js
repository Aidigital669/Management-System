'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ClientOnboardingInspector from './ClientOnboardingInspector';
import {
  Clock,
  CheckSquare,
  Calendar,
  LogOut,
  Plus,
  Building,
  UserCheck,
  CheckCircle,
  FileText,
  AlertCircle,
  Briefcase,
  Play,
  Check,
  Moon,
  Sun,
  DollarSign,
  TrendingUp,
  Download,
  Users,
  FileDown,
  User,
  ExternalLink,
  Search,
  BarChart2,
  Lock,
  Menu,
  X
} from 'lucide-react';
import { uploadFileAction } from '@/app/actions/uploadAction';
import AdminPreviewBanner from '@/components/AdminPreviewBanner';

const convertDbDateToIso = (dateStr) => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parts[0];
    const monthName = parts[1];
    const year = parts[2];
    
    const months = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const month = months[monthName.toLowerCase()];
    if (month && day && year) {
      return `${year}-${month}-${day.padStart(2, '0')}`;
    }
  }
  
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return '';
};

const getFilterFormats = (isoDateStr) => {
  if (!isoDateStr) return { dbFormat: '', isoFormat: '' };
  const d = new Date(isoDateStr);
  if (isNaN(d.getTime())) return { dbFormat: '', isoFormat: '' };
  
  const dbFormat = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  const isoFormat = isoDateStr;
  return { dbFormat, isoFormat };
};

export default function EmployeeDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, tasks, leaves, payroll
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
  };

  // Data states
  const [tasksList, setTasksList] = useState([]);
  const [leavesList, setLeavesList] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [todayLog, setTodayLog] = useState(null);
  const [clientsList, setClientsList] = useState([]);
  const [allClientTasks, setAllClientTasks] = useState([]);
  const [allClientDeliveries, setAllClientDeliveries] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Timer States
  const [timeStr, setTimeStr] = useState('');
  const [workDuration, setWorkDuration] = useState('00:00:00');

  // Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Status Modal States
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedTaskForStatus, setSelectedTaskForStatus] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [workSampleFile, setWorkSampleFile] = useState(null);

  // Form Fields
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

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

  // Clock ticks
  useEffect(() => {
    const clock = setInterval(() => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString());
    }, 1000);
    return () => clearInterval(clock);
  }, []);

  // Work timer tick when clocked in
  useEffect(() => {
    let timer;
    if (todayLog && !todayLog.clockOut) {
      timer = setInterval(() => {
        const start = new Date(todayLog.clockIn).getTime();
        const now = new Date().getTime();
        const diff = now - start;

        const hrs = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);

        setWorkDuration(
          `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      }, 1000);
    } else {
      setWorkDuration('00:00:00');
    }
    return () => clearInterval(timer);
  }, [todayLog]);

  // Auth fetch
  useEffect(() => {
    async function initDashboard() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();

        if (!res.ok || !data.user || data.user.role !== 'EMPLOYEE') {
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
        tasksRes,
        leavesRes,
        attRes,
        clientsRes,
        ctRes,
        cdRes,
        usersRes
      ] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/leaves'),
        fetch('/api/attendance'),
        fetch('/api/clients'),
        fetch('/api/client-tasks'),
        fetch('/api/client-deliveries'),
        fetch('/api/users')
      ]);

      const [
        tasksData,
        leavesData,
        attData,
        clientsData,
        ctData,
        cdData,
        usersData
      ] = await Promise.all([
        tasksRes.json(),
        leavesRes.json(),
        attRes.json(),
        clientsRes.json(),
        ctRes.json(),
        cdRes.json(),
        usersRes.json()
      ]);

      setTasksList(tasksData.tasks || []);
      setLeavesList(leavesData.leaves || []);
      setTodayLog(attData.todayLog);
      setAttendanceLogs(attData.logs || []);
      setClientsList(clientsData.clients || []);
      setAllClientTasks(ctData.tasks || []);
      setAllClientDeliveries(cdData.deliveries || []);
      setUsersList(usersData.users || []);
    } catch (err) {
      console.error('Error refreshing employee dashboard:', err);
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

  // Clock operations
  const handleClockToggle = async () => {
    try {
      let locationLink = null;
      
      // If it's a clock-in (todayLog doesn't exist or clockOut exists), try to get location
      if (!todayLog || todayLog.clockOut) {
        if (navigator.geolocation) {
          try {
            const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
            });
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            locationLink = `https://www.google.com/maps?q=${lat},${lng}`;
          } catch (geoErr) {
            console.warn('Geolocation failed or blocked', geoErr);
            locationLink = 'Location Blocked/Unavailable';
          }
        } else {
          locationLink = 'Geolocation not supported by browser';
        }
      }

      const res = await fetch('/api/attendance', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: locationLink })
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Clocking action failed.', 'error');
        return;
      }

      showToast(data.message);
      await refreshData();
    } catch (err) {
      showToast('Connection error.', 'error');
    }
  };

  // Direct Script PDF Upload for Assigned Tasks
  const handleDirectScriptFileUpload = async (taskId, fileObj, isClientTask) => {
    if (!fileObj) return;
    try {
      showToast('Uploading script document...');
      const formData = new FormData();
      formData.append('file', fileObj);

      const uploadData = await uploadFileAction(formData);
      const uploadedUrl = uploadData.fileUrl;

      if (uploadData.error || !uploadedUrl) {
        showToast(uploadData.error || 'Upload failed', 'error');
        return;
      }

      if (isClientTask) {
        const updateRes = await fetch(`/api/client-tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            workSampleUrl: uploadedUrl,
            status: 'Completion'
          }),
        });

        if (updateRes.ok) {
          showToast('Script PDF uploaded and task marked as completed!');
          await refreshData();
        } else {
          showToast('Failed to save script URL', 'error');
        }
      } else {
        const updateRes = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            workSampleUrl: uploadedUrl,
            description: uploadedUrl,
            status: 'DONE'
          }),
        });

        if (updateRes.ok) {
          showToast('Script PDF uploaded and task marked as completed!');
          await refreshData();
        } else {
          showToast('Failed to save script URL', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Script upload error', 'error');
    }
  };

  const handleReuploadContent = async (taskId, fileObj, isClientTask = true) => {
    if (!fileObj) return;
    try {
      showToast('Re-uploading content...');
      const formData = new FormData();
      formData.append('file', fileObj);

      const uploadData = await uploadFileAction(formData);
      const uploadedUrl = uploadData.fileUrl;

      if (uploadData.error || !uploadedUrl) {
        showToast(uploadData.error || 'Upload failed', 'error');
        return;
      }

      if (isClientTask) {
        const updateRes = await fetch(`/api/client-tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            workSampleUrl: uploadedUrl,
            status: 'Completion'
          }),
        });

        if (updateRes.ok) {
          showToast('Content re-uploaded successfully!');
          await refreshData();
        } else {
          showToast('Failed to save new content URL', 'error');
        }
      } else {
        const updateRes = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            workSampleUrl: uploadedUrl,
            description: uploadedUrl,
            status: 'DONE'
          }),
        });

        if (updateRes.ok) {
          showToast('Content re-uploaded successfully!');
          await refreshData();
        } else {
          showToast('Failed to save new content URL', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Upload error', 'error');
    }
  };

  // Task operation Modal Trigger
  const openStatusModal = (task, type = 'INTERNAL') => {
    setSelectedTaskForStatus({ ...task, type });
    setNewStatus(task.status);
    setStatusReason(task.reason || '');
    setWorkSampleFile(null);
    setShowStatusModal(true);
  };

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    if (!newStatus) return;
    if ((newStatus === 'PENDING' || newStatus === 'OVERDUE' || newStatus === 'Pending' || newStatus === 'Overdue') && !statusReason) {
      setFormError('Reason is required for pending or overdue tasks.');
      return;
    }

    const isCompleted = ['DONE', 'Completed', 'Client Review', 'Completion', 'Posted'].includes(newStatus);
    const isPostingTask = selectedTaskForStatus?.postType === 'Posting' || (selectedTaskForStatus?.taskTitle && selectedTaskForStatus.taskTitle.toLowerCase().startsWith('post '));
    const isExempt = (currentUser && ['pujan', 'preet', 'rama'].includes(currentUser.name.toLowerCase())) || isPostingTask;
    
    if (isCompleted && !isExempt && !workSampleFile && (!selectedTaskForStatus?.workSampleUrl)) {
      setFormError('A work sample file is required to submit work for client review / completion.');
      return;
    }

    setFormError('');
    setFormLoading(true);

    try {
      let finalWorkSampleUrl = selectedTaskForStatus?.workSampleUrl || undefined;

      if (workSampleFile) {
        const formData = new FormData();
        formData.append('file', workSampleFile);
        const uploadData = await uploadFileAction(formData);
        if (uploadData.success) {
          finalWorkSampleUrl = uploadData.fileUrl;
        } else {
          setFormError(uploadData.error || 'Failed to upload work sample.');
          setFormLoading(false);
          return;
        }
      }

      if (selectedTaskForStatus.type === 'INTERNAL') {
        const res = await fetch(`/api/tasks/${selectedTaskForStatus.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, reason: statusReason, workSampleUrl: finalWorkSampleUrl })
        });
        if (res.ok) {
          showToast('Task updated.');
          setShowStatusModal(false);
          await refreshData();
        } else {
          setFormError('Failed to update task.');
        }
      } else {
        const res = await fetch(`/api/client-tasks/${selectedTaskForStatus.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, reason: statusReason, workSampleUrl: finalWorkSampleUrl })
        });
        if (res.ok) {
          showToast('Client task updated.');
          setShowStatusModal(false);
          await refreshData();
        } else {
          setFormError('Failed to update client task.');
        }
      }
    } catch (err) {
      setFormError('Connection error.');
    } finally {
      setFormLoading(false);
    }
  };

  // Leave request submission
  const handleRequestLeave = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) {
      setFormError('Please fill out all required fields.');
      return;
    }
    setFormError('');
    setFormLoading(true);

    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, reason })
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to submit leave.');
        setFormLoading(false);
        return;
      }

      showToast('Leave request submitted successfully.');
      setShowRequestModal(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      await refreshData();
    } catch (err) {
      setFormError('Connection error.');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Loading Employee Console...</p>
        </div>
      </div>
    );
  }

  const todayIso = new Date().toISOString().split('T')[0];

  const employeeTasksList = tasksList;

  const userRoleStr = currentUser ? ((currentUser.department || '') + ' ' + (currentUser.designation || '')).toLowerCase() : '';
  const isSocialMediaStaff = currentUser && (
    userRoleStr.includes('social media') ||
    userRoleStr.includes('digital marketing') ||
    userRoleStr.includes('graphic designer') ||
    userRoleStr.includes('posting')
  );

  const isPostingTaskReady = (task, allTasks) => {
    const isPosting = task.postType === 'Posting' || (task.taskTitle && task.taskTitle.toLowerCase().startsWith('post '));
    if (!isPosting) return true;

    if (['Completion', 'Completed', 'DONE', 'Done', 'Posted', 'Processing', 'In Progress'].includes(task.status)) {
      return true;
    }

    const contentTitle = task.taskTitle.replace(/^Post\s+/i, '');
    const contentTask = allTasks.find(t => 
      t.clientId === task.clientId && 
      (t.taskTitle.toLowerCase() === contentTitle.toLowerCase() || (task.notes && t.taskId === task.notes))
    );

    if (contentTask) {
      if (['Completion', 'Completed', 'DONE', 'Done'].includes(contentTask.status)) {
        return true;
      }
      if (contentTask.status === 'Client Review') {
        const changedTime = contentTask.statusChangedAt ? new Date(contentTask.statusChangedAt).getTime() : new Date(contentTask.createdAt).getTime();
        const timeDiffHours = (new Date().getTime() - changedTime) / (1000 * 60 * 60);
        if (timeDiffHours >= 24) {
          return true;
        }
      }
      return false;
    }

    if (task.status === 'Client Review') {
      const changedTime = task.statusChangedAt ? new Date(task.statusChangedAt).getTime() : new Date(task.createdAt).getTime();
      const timeDiffHours = (new Date().getTime() - changedTime) / (1000 * 60 * 60);
      return timeDiffHours >= 24;
    }

    return false;
  };

  const employeeMyClientTasks = allClientTasks
    .filter(task => {
      const isAssignedToMe = task.workingOn && currentUser?.name && task.workingOn.toLowerCase().includes(currentUser.name.toLowerCase());
      const userDeptDesig = ((currentUser?.department || '') + ' ' + (currentUser?.designation || '')).toLowerCase();
      const taskAssignTo = (task.assignTo || '').toLowerCase();
      const isDeptMatch = taskAssignTo && (
        userDeptDesig.includes(taskAssignTo) ||
        (taskAssignTo.includes('digital marketing') || taskAssignTo.includes('social media') ? (userDeptDesig.includes('marketing') || userDeptDesig.includes('social') || userDeptDesig.includes('digital')) : false)
      );
      const isDeptUnclaimed = !task.workingOn && isDeptMatch;
      const isPosting = task.postType === 'Posting' || (task.taskTitle && task.taskTitle.toLowerCase().startsWith('post '));
      const isUnclaimedPosting = !task.workingOn && isPosting && (userDeptDesig.includes('posting') || userDeptDesig.includes('marketing') || userDeptDesig.includes('social') || userDeptDesig.includes('digital'));

      if (isAssignedToMe || isDeptUnclaimed || isUnclaimedPosting) {
        return isPostingTaskReady(task, allClientTasks);
      }

      return false;
    });

  const isTaskReadyToPostToday = (ct) => {
    const isPosting = ct.postType === 'Posting' || (ct.taskTitle && ct.taskTitle.toLowerCase().startsWith('post '));
    if (isPosting) {
      const contentTitle = ct.taskTitle.replace(/^Post\s+/i, '');
      const contentTask = allClientTasks.find(t => 
        t.clientId === ct.clientId && 
        (t.taskTitle.toLowerCase() === contentTitle.toLowerCase() || (ct.notes && t.taskId === ct.notes))
      );
      if (contentTask) {
        const isApproved = ['Completion', 'Completed', 'DONE', 'Done'].includes(contentTask.status);
        const changedTime = contentTask.statusChangedAt ? new Date(contentTask.statusChangedAt).getTime() : new Date(contentTask.createdAt).getTime();
        const isAutoApproved = contentTask.status === 'Client Review' && ((new Date().getTime() - changedTime) / (1000 * 60 * 60) >= 24);
        if (isApproved || isAutoApproved) return true;
      }
    }
    return false;
  };

  const completedTasks = employeeTasksList.filter(t => t.status === 'DONE').length;
  const pendingTasks = employeeTasksList.filter(t => t.status !== 'DONE').length;

  const formats = getFilterFormats(filterDate);

  const filteredTasksList = employeeTasksList.filter(task => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!task.title?.toLowerCase().includes(q) && !task.description?.toLowerCase().includes(q) && !task.createdBy?.name?.toLowerCase().includes(q)) return false;
    }
    if (task.dueDate && task.dueDate < todayIso) {
      if (filterDate && task.dueDate === formats.isoFormat) return true;
      return false;
    }
    if (!filterDate) return true;
    return task.dueDate === formats.isoFormat;
  });

  const filteredClientTasks = employeeMyClientTasks.filter(ct => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!ct.taskTitle?.toLowerCase().includes(q) && !ct.businessName?.toLowerCase().includes(q) && !ct.notes?.toLowerCase().includes(q)) return false;
    }
    const ctIso = convertDbDateToIso(ct.date);
    if (ctIso && ctIso < todayIso) {
      if (filterDate && ctIso === formats.isoFormat) return true;
      return false;
    }
    if (!filterDate) return true;
    if (isTaskReadyToPostToday(ct) && filterDate === todayIso) return true;
    return ctIso === formats.isoFormat;
  });

  const myDepartmentClientTasks = allClientTasks.filter(t => {
    if (t.workingOn && currentUser?.name && t.workingOn.toLowerCase().includes(currentUser.name.toLowerCase())) return true;
    const userDeptDesig = ((currentUser?.department || '') + ' ' + (currentUser?.designation || '')).toLowerCase();
    const taskAssignTo = (t.assignTo || '').toLowerCase();
    if (!t.workingOn && taskAssignTo) {
      if (userDeptDesig.includes(taskAssignTo)) return true;
      if (taskAssignTo.includes('digital marketing') || taskAssignTo.includes('social media')) {
        return userDeptDesig.includes('marketing') || userDeptDesig.includes('social') || userDeptDesig.includes('digital');
      }
    }
    return false;
  });

  const filteredDeptClientTasks = myDepartmentClientTasks.filter(ct => {
    if (!filterDate) return true;
    return convertDbDateToIso(ct.date) === formats.isoFormat;
  });

  const todaysClientTasksList = employeeMyClientTasks.filter(ct => {
    const isPosting = ct.postType === 'Posting' || (ct.taskTitle && ct.taskTitle.toLowerCase().startsWith('post '));
    if (isPosting) {
      return isTaskReadyToPostToday(ct) || ['Completion', 'Completed', 'DONE', 'Posted'].includes(ct.status);
    }
    if (ct.status === 'Posted' || ct.status === 'Completion' || ct.status === 'Completed' || ct.status === 'DONE') {
      if (convertDbDateToIso(ct.date) !== todayIso) return false;
    }
    if (convertDbDateToIso(ct.date) === todayIso) return true;
    return false;
  });

  const todaysTasksCount = [
    ...employeeTasksList.filter(t => t.status !== 'DONE' && t.dueDate === todayIso),
    ...todaysClientTasksList.filter(ct => ct.status !== 'Posted')
  ].length;

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-300 overflow-hidden">

      {/* Admin Preview Mode Banner — shown when Admin is previewing this employee's dashboard */}
      <AdminPreviewBanner currentUserName={currentUser?.name} />

      {/* Toast Alert */}
      {toast.message && (
        <div className={`fixed bottom-5 right-5 z-[70] p-4 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-semibold animate-slide-in
          ${toast.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300' 
            : 'bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-900 text-red-850 dark:text-red-300'
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

      {/* Dashboard Body: Sidebar + Main Content Side-by-Side */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden relative">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-full ${
          mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}>
        <div className="overflow-y-auto flex-1">
          {/* Brand */}
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-sm">
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

          {/* User profile details */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-800/20">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-lg font-bold shadow-md">
              {currentUser.avatar || '👤'}
            </div>
            <div className="overflow-hidden">
              <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{currentUser.name}</div>
              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold tracking-widest uppercase">
                {currentUser.department} STAFF
              </div>
            </div>
          </div>

          {/* Sidebar Navigation */}
          <nav className="p-3 sm:p-4 flex flex-col gap-1">
            <button
              onClick={() => handleSelectTab('overview')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === 'overview'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              Overview & Clock
            </button>
            
            <button
              onClick={() => handleSelectTab('tasks')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === 'tasks'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              My Assigned Tasks
              {pendingTasks > 0 && (
                <span className="ml-auto w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                  {pendingTasks}
                </span>
              )}
            </button>

            <button
              onClick={() => handleSelectTab('directory')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === 'directory'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              Employee Directory
            </button>


            {(() => {
              const isSocialOrDigital = currentUser && (
                (currentUser.department && (currentUser.department.toLowerCase().includes('social media') || currentUser.department.toLowerCase().includes('digital media') || currentUser.department.toLowerCase().includes('digital marketing'))) ||
                (currentUser.designation && (currentUser.designation.toLowerCase().includes('social media') || currentUser.designation.toLowerCase().includes('digital media') || currentUser.designation.toLowerCase().includes('digital marketing')))
              );
              return isSocialOrDigital ? (
                <button
                  onClick={() => handleSelectTab('client-tasks')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                    activeTab === 'client-tasks'
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  Client Deliverables
                </button>
              ) : null;
            })()}

            <button
              onClick={() => handleSelectTab('leaves')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === 'leaves'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Time-Off Requests
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

        {/* Main Panel Content */}
        <main className="flex-grow flex flex-col min-w-0 overflow-y-auto h-full">
          
          {/* Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-3 sm:px-6 lg:px-8 shrink-0 transition-colors">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition shrink-0"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm sm:text-base lg:text-xl font-bold tracking-tight text-slate-900 dark:text-white capitalize truncate">
              {activeTab === 'overview' ? 'Personal workspace' : activeTab.replace('-', ' ')}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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

        {/* Tab Content Container */}
        <div className="p-3 sm:p-5 lg:p-8 flex-grow overflow-x-hidden">
          
          {/* TAB 1: OVERVIEW & CLOCK */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
              
              {/* Left Column: Clock and Attendance info */}
              <div className="lg:col-span-7 space-y-8">
                
                {/* Clock Card Panel */}
                <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center text-center gap-6 overflow-hidden animate-slide-up" style={{ animationDelay: '100ms' }}>
                  <div className="absolute inset-0 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl animate-pulse-soft pointer-events-none"></div>
                  <div className="absolute -left-12 -top-12 w-40 h-40 bg-blue-100/50 dark:bg-blue-800/20 rounded-full blur-3xl pointer-events-none animate-pulse-soft" style={{ animationDelay: '1s' }}></div>
                  <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-cyan-100/50 dark:bg-cyan-800/20 rounded-full blur-3xl pointer-events-none animate-pulse-soft" style={{ animationDelay: '2s' }}></div>
                  
                  <div className="relative z-10 w-full flex flex-col items-center justify-center gap-6">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest mb-1">Punctuality Clock</h3>
                      <div className="text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                        {timeStr || '00:00:00'}
                      </div>
                    </div>

                    {todayLog && !todayLog.clockOut ? (
                      <div className="space-y-1">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Shift Duration (Today)</div>
                        <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">{workDuration}</div>
                      </div>
                    ) : null}

                    <div className="flex flex-col items-center gap-2">
                      <button 
                        onClick={handleClockToggle}
                        className={`h-12 px-8 font-extrabold text-sm tracking-wider uppercase rounded-full shadow-lg transition flex items-center gap-2 text-white hover:scale-105 active:scale-95
                          ${todayLog && !todayLog.clockOut
                            ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' 
                            : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'}`}
                      >
                        <Clock className="w-4 h-4 animate-pulse" />
                        <span>{todayLog && !todayLog.clockOut ? 'Clock Out' : 'Clock In'}</span>
                      </button>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {todayLog && !todayLog.clockOut 
                          ? `Clocked in today at ${new Date(todayLog.clockIn).toLocaleTimeString()}`
                          : todayLog
                          ? `Shift completed today at ${new Date(todayLog.clockOut).toLocaleTimeString()}`
                          : 'No session active for today.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Today's Tasks List Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm mt-6">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Today's Tasks Checklist</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Assigned deliverables and checklist duties for today.</p>
                    </div>
                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[9px] font-bold rounded-lg uppercase">Today ({todaysTasksCount})</span>
                  </div>

                  <div className="space-y-3">
                    {[
                      ...employeeTasksList
                        .filter(t => t.dueDate === todayIso)
                        .map(t => ({ ...t, type: 'internal' })),
                      ...todaysClientTasksList
                        .map(ct => ({ ...ct, type: 'client' }))
                    ].length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6 italic font-medium">No tasks scheduled for today.</p>
                    ) : (
                      [
                        ...employeeTasksList
                          .filter(t => t.dueDate === todayIso)
                          .map(t => ({ ...t, type: 'internal' })),
                        ...todaysClientTasksList
                          .map(ct => ({ ...ct, type: 'client' }))
                      ].map((item) => (
                        <div 
                          key={item.type === 'internal' ? `today-int-${item.id}` : `today-cli-${item.id}`}
                          className="p-3.5 border border-slate-200/60 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/10 flex items-center justify-between gap-3 text-xs shadow-sm hover:shadow transition duration-200"
                        >
                          <div className="space-y-1 overflow-hidden pr-2">
                            <p className="font-bold text-slate-900 dark:text-white truncate">
                              {item.type === 'internal' ? item.title : item.taskTitle}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] font-semibold text-slate-500">
                              {(() => {
                                const isPostingTask = item.type === 'client' && (item.postType === 'Posting' || (item.taskTitle && item.taskTitle.toLowerCase().startsWith('post ')));
                                return (
                                  <span className={`px-1 rounded text-[8px] font-bold uppercase ${
                                    item.type === 'internal'
                                      ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                      : isPostingTask
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                      : 'bg-blue-50 text-blue-600 dark:bg-blue-900/25 dark:text-blue-400'
                                  }`}>
                                    {item.type === 'internal' ? 'Internal' : isPostingTask ? 'Posting Task' : 'Client Task'}
                                  </span>
                                );
                              })()}
                              <span>•</span>
                              <span className="truncate">{item.type === 'internal' ? `Assigned by: ${item.createdBy.name}` : `Client: ${item.businessName}`}</span>
                              {item.priority && (
                                <>
                                  <span>•</span>
                                  <span className={`uppercase text-[8px] font-bold ${item.priority === 'Urgent' ? 'text-red-500' : item.priority === 'High' ? 'text-orange-500' : 'text-slate-400'}`}>
                                    {item.priority}
                                  </span>
                                </>
                              )}
                            </div>
                            {/* Approved Content Link for Posting Tasks & Deliverables */}
                            {item.type === 'client' && (() => {
                              const mediaUrl = item.workSampleUrl || (() => {
                                const contentTitle = item.taskTitle.replace(/^Post\s+/i, '');
                                const contentTask = allClientTasks.find(t => t.clientId === item.clientId && (t.taskTitle === contentTitle || t.taskTitle.toLowerCase() === contentTitle.toLowerCase()));
                                return contentTask?.workSampleUrl;
                              })();
                              
                              if (mediaUrl) {
                                return (
                                  <div className="mt-1">
                                    <a 
                                      href={mediaUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 dark:text-amber-400 hover:underline bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200/60 dark:border-amber-800/40"
                                    >
                                      <FileDown className="w-3 h-3" /> View Approved Content {item.workingOn ? `(by ${item.workingOn})` : ''}
                                    </a>
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            {/* Script PDF Access & Direct Upload Options */}
                            {(() => {
                              const scriptUrl = item.workSampleUrl || (item.description && (item.description.startsWith('http') || item.description.startsWith('/uploads/')) ? item.description : null);

                              return (
                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                  {scriptUrl && (
                                    <>
                                      <a 
                                        href={scriptUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/40"
                                      >
                                        <FileDown className="w-3 h-3" /> {item.postType === 'Script' || (item.taskTitle && item.taskTitle.toLowerCase().includes('script')) ? 'View Script PDF' : 'View Work Sample'}
                                      </a>
                                      <label className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded cursor-pointer transition border border-blue-200/60 dark:border-blue-800/40">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                        Re-Upload Content
                                        <input 
                                          type="file" 
                                          className="hidden"
                                          onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                              handleReuploadContent(item.id, e.target.files[0], item.type === 'client');
                                            }
                                          }}
                                        />
                                      </label>
                                    </>
                                  )}
                                  {(currentUser?.department?.toLowerCase().includes('ai video') || currentUser?.role === 'ADMIN' || currentUser?.role === 'TL' || currentUser?.name?.toLowerCase().includes('masoom') || currentUser?.name?.toLowerCase().includes('divyansh') || currentUser?.name?.toLowerCase().includes('nouman')) && (
                                    <label className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded cursor-pointer transition border border-indigo-200/60 dark:border-indigo-800/40">
                                      <Plus className="w-3 h-3" /> {scriptUrl ? 'Change Script PDF' : 'Upload Script PDF'}
                                      <input 
                                        type="file" 
                                        accept="application/pdf,video/*,.pdf,.mp4,.mov,.mkv,.avi,.doc,.docx" 
                                        className="hidden" 
                                        onChange={(e) => {
                                          if (e.target.files && e.target.files[0]) {
                                            handleDirectScriptFileUpload(item.id, e.target.files[0], item.type === 'client');
                                          }
                                        }}
                                      />
                                    </label>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          
                          <div className="shrink-0 flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider
                              ${item.status === 'Completion' || item.status === 'DONE' 
                                ? 'bg-emerald-100 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                : item.status === 'Processing' 
                                ? 'bg-blue-100 text-blue-850 dark:bg-blue-950/40 dark:text-blue-400' 
                                : item.status === 'Client Review'
                                ? 'bg-amber-100 text-amber-850 dark:bg-amber-950/40 dark:text-amber-400'
                                : item.status === 'Revision'
                                ? 'bg-red-100 text-red-850 dark:bg-red-955/40 dark:text-red-400'
                                : 'bg-slate-100 text-slate-755 dark:bg-slate-800 dark:text-slate-400'}`}
                            >
                              {item.status === 'DONE' || item.status === 'Completion' ? 'Done' : item.status}
                            </span>
                            <button 
                              onClick={() => {
                                setSelectedTaskForStatus(item);
                                setNewStatus(item.status);
                                setStatusReason(item.reason || '');
                                setShowStatusModal(true);
                              }}
                              className="py-1 px-2.5 bg-blue-55 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg text-[9px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition flex items-center gap-0.5 cursor-pointer"
                            >
                              Update
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Clock Logs history */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4">My Sign-in Sheet (Recent)</h4>
                  
                  <div className="space-y-3">
                    {attendanceLogs.length === 0 ? (
                      <p className="text-xs text-slate-400">No shift hours logged.</p>
                    ) : (
                      attendanceLogs.slice(0, 3).map((log) => (
                        <div key={log.id} className="flex justify-between items-center text-xs p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-800 rounded-xl">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{log.date}</span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              In: {new Date(log.clockIn).toLocaleTimeString()} 
                              {log.clockOut ? ` | Out: ${new Date(log.clockOut).toLocaleTimeString()}` : ' | Active'}
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase
                            ${log.status === 'PRESENT' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : 'bg-red-50 dark:bg-red-950/40 text-red-600'}`}
                          >
                            {log.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column: Brief summary cards */}
              <div className="lg:col-span-5 space-y-6">
                
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border-l-4 border-l-blue-600 flex items-center justify-between transition hover:shadow-md animate-slide-up" style={{ animationDelay: '150ms' }}>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-455 font-extrabold uppercase tracking-widest block">Today's Assigned Tasks</span>
                    <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400">{todaysTasksCount}</h3>
                    <p className="text-[9px] text-slate-400 font-medium">Scheduled for today</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Active Deliverables</span>
                    <h3 className="text-2xl font-black dark:text-white">{pendingTasks}</h3>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Approved Absences</span>
                    <h3 className="text-2xl font-black dark:text-white">
                      {leavesList.filter(l => l.status === 'APPROVED').length}
                    </h3>
                  </div>
                  <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:emerald-400 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Completed Actions</span>
                    <h3 className="text-2xl font-black dark:text-white">{completedTasks}</h3>
                  </div>
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mt-6">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4">Today's Priorities</h4>
                  <div className="space-y-3">
                    {(() => {
                      const todayIso = new Date().toISOString().split('T')[0];
                      const todayTasks = [
                        ...employeeTasksList
                          .filter(t => t.status !== 'DONE' && t.dueDate && t.dueDate === todayIso)
                          .map(t => ({ ...t, type: 'internal', isOverdue: false })),
                        ...employeeMyClientTasks
                          .filter(ct => !['Completed', 'Done', 'DONE', 'Posted', 'Completion'].includes(ct.status) && convertDbDateToIso(ct.date) && convertDbDateToIso(ct.date) === todayIso)
                          .map(ct => ({ ...ct, type: 'client', isOverdue: false }))
                      ];
                      
                      if (todayTasks.length === 0) {
                        return <p className="text-[10px] text-slate-400 text-center py-4 font-semibold">No pending tasks for today!</p>;
                      }
                      
                      return todayTasks
                        .sort((a, b) => {
                          if (a.isOverdue && !b.isOverdue) return -1;
                          if (!a.isOverdue && b.isOverdue) return 1;
                          const p = { Urgent: 3, High: 2, Normal: 1 };
                          return (p[b.priority] || 1) - (p[a.priority] || 1);
                        })
                        .slice(0, 5)
                        .map(item => (
                          item.type === 'internal' ? (
                            <div key={`int-${item.id}`} className={`p-3 border rounded-xl ${item.isOverdue ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30'}`}>
                              <div className="flex justify-between items-start gap-2">
                                <div className="space-y-0.5">
                                  {item.isOverdue && (
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-rose-500 text-white mb-1">
                                      ⚠️ Yesterday / Overdue
                                    </span>
                                  )}
                                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
                                </div>
                                <span className={`shrink-0 inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase
                                  ${item.priority === 'Urgent' ? 'bg-red-500 text-white' 
                                    : item.priority === 'High' ? 'bg-orange-400 text-white' 
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                  {item.priority || 'Normal'}
                                </span>
                              </div>
                              <p className="text-[9px] text-slate-400 mt-1.5 font-bold">Due: {item.dueDate || 'No limit'}</p>
                            </div>
                          ) : (
                            <div key={`cli-${item.id}`} className={`p-3 border rounded-xl ${item.isOverdue ? 'border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/30' : 'border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10'}`}>
                              <div className="flex justify-between items-start gap-2">
                                <div className="space-y-0.5">
                                  {item.isOverdue && (
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-rose-500 text-white mb-1">
                                      ⚠️ Yesterday / Overdue
                                    </span>
                                  )}
                                  <p className="text-xs font-bold text-blue-900 dark:text-blue-100 truncate">{item.taskTitle}</p>
                                </div>
                                <span className={`shrink-0 inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase
                                  ${item.priority === 'Urgent' ? 'bg-red-500 text-white' 
                                    : item.priority === 'High' ? 'bg-orange-400 text-white' 
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                  {item.priority || 'Normal'}
                                </span>
                              </div>
                              <p className="text-[9px] text-blue-600/70 dark:text-blue-400/70 mt-1.5 font-bold">
                                Client: {item.businessName} | {item.postType === 'Posting' || (item.taskTitle && item.taskTitle.toLowerCase().startsWith('post ')) ? 'Trigger: Auto on Client Approval / 24h' : `Date: ${item.date}`}
                              </p>
                            </div>
                          )
                        ));
                    })()}
                  </div>
                  <button onClick={() => setActiveTab('tasks')} className="mt-4 w-full py-2 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition uppercase tracking-wider">
                    View All Tasks →
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: MY TASKS */}
          {activeTab === 'tasks' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Assigned Duties checklist</h4>
                  <p className="text-xs text-slate-400 mt-1">Review task details and report updates by clicking status transitions.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 w-full sm:w-48 transition"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider sm:ml-2">Date:</span>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="p-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                  {filterDate && (
                    <button 
                      onClick={() => setFilterDate('')}
                      className="py-1 px-2.5 bg-red-55 hover:bg-red-100 dark:hover:bg-red-950/20 text-red-600 rounded-lg text-[10px] font-bold transition"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-4">
                {(() => {
                  const overdueCount = [
                    ...filteredTasksList.filter(t => ['OVERDUE', 'Overdue'].includes(t.status) && t.dueDate === todayIso),
                    ...filteredClientTasks.filter(ct => ['Overdue', 'OVERDUE'].includes(ct.status) && convertDbDateToIso(ct.date) === todayIso)
                  ].length;

                  if (overdueCount > 0) {
                    return (
                      <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center justify-between gap-3 text-red-700 dark:text-red-300 mb-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                          <span className="text-xs font-bold">
                            ⚠️ You have {overdueCount} Overdue / Pending Task{overdueCount > 1 ? 's' : ''} from past days requiring immediate action!
                          </span>
                        </div>
                        <span className="text-[10px] bg-red-600 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Action Needed
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {filteredTasksList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No tasks assigned yet for this date.</p>
                ) : (
                  filteredTasksList.map((task) => (
                    <div 
                      key={task.id} 
                      className={`p-4 border rounded-xl flex items-center justify-between transition duration-300
                        ${task.status === 'DONE' 
                          ? 'border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40 opacity-75' 
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 hover:-translate-y-1 cursor-default'}`}
                    >
                      <div className="space-y-1 pr-6 overflow-hidden">
                        <p className={`text-xs font-bold leading-tight flex items-center gap-2 ${task.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                          {task.title}
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase w-max no-underline
                            ${task.priority === 'Urgent' ? 'bg-red-500 text-white' 
                              : task.priority === 'High' ? 'bg-orange-400 text-white' 
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                            {task.priority || 'Normal'}
                          </span>
                        </p>
                        {task.description && (task.description.startsWith('http') || task.description.startsWith('/uploads/')) ? (
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <a 
                              href={task.description} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md"
                            >
                              <FileDown className="w-3.5 h-3.5" /> View Script PDF
                            </a>
                            <label className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md cursor-pointer transition border border-indigo-200/60 dark:border-indigo-800/40">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                              Re-Upload Content
                              <input 
                                type="file" 
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleReuploadContent(task.id, e.target.files[0], false);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-450 truncate mt-1">{task.description}</p>
                        )}
                        <p className="text-[9px] text-slate-400 font-medium mt-1.5">Assigned by: {task.createdBy.name} ({task.createdBy.role}) | Due: {task.dueDate || 'No Limit'}</p>
                        {task.reason && (
                           <p className="text-[10px] text-red-500 font-medium italic mt-1.5 bg-red-50 dark:bg-red-950/20 p-1.5 rounded-md border border-red-100 dark:border-red-900/30">Reason: {task.reason}</p>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {task.status !== 'DONE' && (
                          <button 
                            onClick={() => openStatusModal(task, 'INTERNAL')}
                            className="py-1 px-3 border border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400 rounded-lg text-[9px] font-bold hover:bg-blue-50 dark:hover:bg-blue-950/20 transition flex items-center gap-1"
                          >
                            <Play className="w-2.5 h-2.5" /> Update Status
                          </button>
                        )}
                        {task.status === 'DONE' && (
                          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-[9px] font-bold rounded-lg uppercase tracking-wider">
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {/* Client Tasks Section */}
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4">Assigned Client & Posting Tasks</h4>
                  <div className="space-y-4">
                    {filteredClientTasks.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">No client tasks assigned yet for this date.</p>
                    ) : (
                      filteredClientTasks.map((ct) => (
                        <div 
                          key={ct.id} 
                          className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition duration-300 hover:shadow-md"
                        >
                          <div className="space-y-1 pr-6 overflow-hidden">
                            <p className="text-xs font-bold leading-tight text-slate-900 dark:text-white flex items-center gap-2">
                              {ct.taskTitle} 
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase
                                ${ct.priority === 'Urgent' ? 'bg-red-500 text-white' 
                                  : ct.priority === 'High' ? 'bg-orange-400 text-white' 
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                {ct.priority || 'Normal'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal ml-1">({ct.taskId})</span>
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium mt-1">
                              <Building className="w-3 h-3 inline-block mr-1 text-slate-400" /> Client: <span className="font-bold">{ct.businessName}</span> | Post Type: {ct.postType || 'N/A'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">
                              {ct.postType === 'Posting' || (ct.taskTitle && ct.taskTitle.toLowerCase().startsWith('post ')) ? 'Trigger: Auto on Client Approval / 24h' : `Date: ${ct.date}`} | Status: <span className={`font-bold ${['Completed', 'DONE', 'Completion'].includes(ct.status) ? 'text-emerald-500' : ['Overdue', 'OVERDUE'].includes(ct.status) ? 'text-red-500' : ['Pending', 'PENDING'].includes(ct.status) ? 'text-yellow-500' : 'text-blue-500'}`}>{ct.status}</span>
                            </p>
                            {/* Display target Video Editor for Script tasks (Harshit) */}
                            {(ct.postType === 'Script' || (ct.taskTitle && ct.taskTitle.toLowerCase().includes('script'))) && (() => {
                              const normTitle = ct.taskTitle.toLowerCase().replace(/\s*script\s*/i, '').trim();
                              const videoTask = allClientTasks.find(t => 
                                t.clientId === ct.clientId && 
                                (t.taskTitle.toLowerCase().trim() === normTitle || t.taskTitle.toLowerCase().trim() === normTitle.replace('script', '').trim())
                              );
                              const editorName = videoTask?.workingOn || 'Unassigned';

                              return (
                                <div className="mt-2 p-2 bg-indigo-50/80 dark:bg-indigo-955/40 border border-indigo-200/80 dark:border-indigo-800/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px]">
                                  <div className="flex items-center gap-1.5 font-bold text-indigo-800 dark:text-indigo-300">
                                    <User className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>Assigned Video Editor: <strong className="text-indigo-955 dark:text-indigo-100 uppercase font-extrabold">{editorName}</strong></span>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold w-fit ${ct.workSampleUrl || ct.notes ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-955 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-955 dark:text-amber-300'}`}>
                                    {ct.workSampleUrl || ct.notes ? `✓ Script Shared with ${editorName}` : `⏳ Awaiting Script Upload for ${editorName}`}
                                  </span>
                                </div>
                              );
                            })()}

                            {/* Display script link for AI Video & Reel tasks (Editors) */}
                            {(ct.postType === 'AI Video' || ct.postType === 'Reel' || (ct.taskTitle && (ct.taskTitle.toLowerCase().includes('video') || ct.taskTitle.toLowerCase().includes('reel')))) && (() => {
                              const normTitle = ct.taskTitle.toLowerCase();
                              const scriptTask = allClientTasks.find(t => 
                                t.clientId === ct.clientId && (
                                  t.taskTitle.toLowerCase() === `${normTitle} script` ||
                                  t.taskTitle.toLowerCase() === normTitle.replace('ai video', 'ai video script') ||
                                  t.taskTitle.toLowerCase().includes('script')
                                )
                              );
                              if (scriptTask && (scriptTask.workSampleUrl || scriptTask.notes)) {
                                return (
                                  <div className="mt-1.5 flex flex-col gap-1">
                                    {scriptTask.workSampleUrl && (
                                      <a 
                                        href={scriptTask.workSampleUrl.startsWith('http://') || scriptTask.workSampleUrl.startsWith('https://') || scriptTask.workSampleUrl.startsWith('/') ? scriptTask.workSampleUrl : `https://${scriptTask.workSampleUrl}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md w-fit"
                                      >
                                        <FileText className="w-3.5 h-3.5" /> View Script
                                      </a>
                                    )}
                                    {scriptTask.notes && (
                                      <p className="text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20 p-1.5 rounded border border-indigo-100 dark:border-indigo-900/30 italic">
                                        Script Notes: {scriptTask.notes}
                                      </p>
                                    )}
                                  </div>
                                );
                              }
                              return (
                                <span className="inline-block mt-1.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-955/30 px-2 py-0.5 rounded border border-amber-200/50">
                                  ⏳ Script Pending
                                </span>
                              );
                            })()}
                            {/* Display own work sample if uploaded */}
                            {ct.workSampleUrl && (
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <a 
                                  href={ct.workSampleUrl.startsWith('http://') || ct.workSampleUrl.startsWith('https://') || ct.workSampleUrl.startsWith('/') ? ct.workSampleUrl : `https://${ct.workSampleUrl}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-md w-fit"
                                >
                                  <FileDown className="w-3.5 h-3.5" /> View Work Sample
                                </a>
                                <label className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md cursor-pointer transition border border-blue-200/60 dark:border-blue-800/40">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                  Re-Upload Content
                                  <input 
                                    type="file" 
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        handleReuploadContent(ct.id, e.target.files[0], true);
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            )}
                            {/* Display approved content link for Posting tasks */}
                            {(ct.postType === 'Posting' || (ct.taskTitle && ct.taskTitle.toLowerCase().startsWith('post '))) && (() => {
                              const contentTitle = ct.taskTitle.replace(/^Post\s+/i, '');
                              const contentTask = allClientTasks.find(t => t.clientId === ct.clientId && (t.taskTitle === contentTitle || t.taskTitle.toLowerCase() === contentTitle.toLowerCase()));
                              if (contentTask && contentTask.workSampleUrl) {
                                return (
                                  <div className="mt-1.5">
                                    <a 
                                      href={contentTask.workSampleUrl.startsWith('http://') || contentTask.workSampleUrl.startsWith('https://') || contentTask.workSampleUrl.startsWith('/') ? contentTask.workSampleUrl : `https://${contentTask.workSampleUrl}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-md w-fit border border-amber-200/70 dark:border-amber-800/40"
                                    >
                                      <FileDown className="w-3.5 h-3.5" /> View Approved Content {contentTask.workingOn ? `(by ${contentTask.workingOn})` : ''}
                                    </a>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            {ct.reason && (
                              <p className="text-[10px] text-red-500 font-medium italic mt-1.5 bg-red-50 dark:bg-red-950/20 p-1.5 rounded-md border border-red-100 dark:border-red-900/30">Reason: {ct.reason}</p>
                            )}
                          </div>
                          
                          <div className="shrink-0 flex items-center gap-2">
                             {!['Completion', 'Completed', 'DONE', 'Done', 'Posted'].includes(ct.status) && (
                               <button onClick={() => openStatusModal(ct, 'CLIENT')} className="py-1 px-3 border border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400 rounded-lg text-[9px] font-bold hover:bg-blue-50 dark:hover:bg-blue-950/20 transition flex items-center gap-1 shrink-0">
                                 <Play className="w-2.5 h-2.5" /> Update Status
                               </button>
                             )}
                             {['Completion', 'Completed', 'DONE', 'Done', 'Posted'].includes(ct.status) && (
                               <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[9px] font-extrabold rounded-lg uppercase tracking-wider flex items-center gap-1">
                                 ✓ {ct.status === 'Posted' ? 'Posted (Done)' : 'Completed'}
                               </span>
                             )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LEAVE REQUESTS */}
          {activeTab === 'leaves' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Absence & Leave tracker</h4>
                  <p className="text-xs text-slate-400 mt-1">Submit new leave requests and track pending approvals.</p>
                </div>
                <button
                  onClick={() => { setFormError(''); setShowRequestModal(true); }}
                  className="bg-blue-800 hover:bg-blue-900 text-white py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  Submit Request
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[550px] text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="p-4 uppercase tracking-wider">Reason / Details</th>
                        <th className="p-4 uppercase tracking-wider">Date Interval</th>
                        <th className="p-4 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leavesList.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="p-8 text-center text-slate-400">No leave history found.</td>
                        </tr>
                      ) : (
                        leavesList.map((leave) => (
                          <tr key={leave.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50/30 transition">
                            <td className="p-4 font-bold text-slate-900 dark:text-white">"{leave.reason}"</td>
                            <td className="p-4 text-slate-550 font-semibold">{leave.startDate} to {leave.endDate}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase
                                ${leave.status === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : leave.status === 'REJECTED' ? 'bg-red-50 dark:bg-red-950/40 text-red-650' : 'bg-orange-50 dark:bg-orange-950/40 text-orange-600'}`}
                              >
                                {leave.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PAYSLIPS */}
          {activeTab === 'payroll' && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white">Active Compensation Details</h4>
                    <p className="text-xs text-slate-400 mt-1">Estimations and detailed structures of your corporate payroll.</p>
                  </div>
                  <button 
                    onClick={() => alert("Payroll statement PDF print request triggers mock download.")}
                    className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition flex items-center gap-1.5 text-xs font-bold"
                  >
                    <Download className="w-4.5 h-4.5" />
                    Download Pay Stub
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Monthly Base Salary</span>
                    <h3 className="text-xl font-bold dark:text-white">${currentUser.salary.toLocaleString()}</h3>
                    <p className="text-[10px] text-emerald-500 font-semibold">Verified Ledger Record</p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Estimated Net Pay (After Tax)</span>
                    <h3 className="text-xl font-bold dark:text-white">${(currentUser.salary * 0.78).toLocaleString()}</h3>
                    <p className="text-[10px] text-slate-400">Assumes 22% overall tax deductions</p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Annual Salary Equivalent</span>
                    <h3 className="text-xl font-bold dark:text-white">${(currentUser.salary * 12).toLocaleString()}</h3>
                    <p className="text-[10px] text-slate-400">Based on active corporate contract</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: EMPLOYEE DIRECTORY */}
          {activeTab === 'directory' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Employee Directory</h4>
                <p className="text-xs text-slate-400 mt-1">View your colleagues and their departments.</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {usersList.map((u) => (
                    <div key={u.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-3 bg-slate-50 dark:bg-slate-800/20">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                        {u.avatar || '👤'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{u.name}</p>
                        <p className="text-[10px] text-slate-500">{u.department} - {u.role}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{u.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}


          {/* TAB: CLIENT TASKS */}
          {activeTab === 'client-tasks' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">CRM Deliverables</h4>
                  <p className="text-xs text-slate-400 mt-1">View and manage client tasks assigned to you or your department.</p>
                </div>
                <div className="relative w-full md:w-64">
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Date:</span>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="p-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                  {filterDate && (
                    <button 
                      onClick={() => setFilterDate('')}
                      className="py-1 px-2.5 bg-red-55 hover:bg-red-100 dark:hover:bg-red-950/20 text-red-600 rounded-lg text-[10px] font-bold transition"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="p-6 space-y-8">
                
                {/* Client Onboarding Form Data Inspector */}
                <ClientOnboardingInspector currentUser={currentUser} allClientTasks={allClientTasks} />

                {/* Client Tasks Section */}
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Client Tasks</h5>
                  <div className="space-y-4">
                    {filteredDeptClientTasks.filter(t => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        (t.taskTitle && t.taskTitle.toLowerCase().includes(q)) ||
                        (t.businessName && t.businessName.toLowerCase().includes(q)) ||
                        (t.taskId && t.taskId.toLowerCase().includes(q))
                      );
                    }).length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">No client tasks found for this date.</p>
                    ) : (
                      filteredDeptClientTasks
                        .filter(t => {
                          if (!searchQuery) return true;
                          const q = searchQuery.toLowerCase();
                          return (
                            (t.taskTitle && t.taskTitle.toLowerCase().includes(q)) ||
                            (t.businessName && t.businessName.toLowerCase().includes(q)) ||
                            (t.taskId && t.taskId.toLowerCase().includes(q))
                          );
                        })
                        .map((task) => (
                          <div key={task.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/20">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                  {task.taskTitle} 
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase
                                    ${task.priority === 'Urgent' ? 'bg-red-500 text-white' 
                                      : task.priority === 'High' ? 'bg-orange-400 text-white' 
                                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                    {task.priority || 'Normal'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-normal ml-1">({task.taskId})</span>
                                  {(() => {
                                      const changedTime = task.statusChangedAt ? new Date(task.statusChangedAt).getTime() : new Date(task.createdAt).getTime();
                                      const timeDiffHours = (new Date().getTime() - changedTime) / (1000 * 60 * 60);
                                      const isApproved = task.status === 'Completion' || task.status === 'Completed' || task.status === 'DONE';
                                      const isAutoApproved = task.status === 'Client Review' && timeDiffHours >= 24;
                                      
                                      if (isApproved) {
                                        return (
                                          <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                                            Approved - Ready to Post
                                          </span>
                                        );
                                      } else if (isAutoApproved) {
                                        return (
                                          <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-amber-100 text-amber-855 dark:bg-amber-955/40 dark:text-amber-400 animate-pulse">
                                            Auto-Approved (24h) - Ready to Post
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Client: <span className="font-semibold text-slate-700 dark:text-slate-300">{task.businessName}</span> | 
                                  Type: {task.postType} | 
                                  {task.postType === 'Posting' || (task.taskTitle && task.taskTitle.toLowerCase().startsWith('post ')) ? (
                                    <span className="font-bold text-amber-600 dark:text-amber-400 ml-1">Trigger: Auto on Client Approval / 24h</span>
                                  ) : (
                                    <>
                                      Date: <input 
                                        type="date" 
                                        className="bg-transparent border-b border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 mx-1 px-1"
                                        value={convertDbDateToIso(task.date)}
                                        onChange={async (e) => {
                                          await fetch(`/api/client-tasks/${task.id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ date: e.target.value })
                                          });
                                          refreshData();
                                        }}
                                      />
                                    </>
                                  )}
                                </p>
                                <div className="text-xs text-slate-500 flex items-center gap-2 mt-2">
                                  <span>Assigned to:</span>
                                  <span className={`px-2 py-0.5 rounded-full font-semibold ${task.workingOn ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'}`}>
                                    {task.workingOn || 'Unclaimed'}
                                  </span>
                                  {!task.workingOn && (
                                    <button 
                                      onClick={async () => {
                                        await fetch(`/api/client-tasks/${task.id}`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ workingOn: currentUser.name })
                                        });
                                        refreshData();
                                      }}
                                      className="text-blue-600 hover:underline cursor-pointer font-bold"
                                    >
                                      Claim Task
                                    </button>
                                  )}
                                </div>
                                {/* Display target Video Editor for Script tasks */}
                                {(task.postType === 'Script' || (task.taskTitle && task.taskTitle.toLowerCase().includes('script'))) && (() => {
                                  const normTitle = task.taskTitle.toLowerCase().replace(/\s*script\s*/i, '').trim();
                                  const videoTask = allClientTasks.find(t => 
                                    t.clientId === task.clientId && 
                                    (t.taskTitle.toLowerCase().trim() === normTitle || t.taskTitle.toLowerCase().trim() === normTitle.replace('script', '').trim())
                                  );
                                  const editorName = videoTask?.workingOn || 'Unassigned';

                                  return (
                                    <div className="mt-1.5 p-1.5 bg-indigo-50/80 dark:bg-indigo-955/40 border border-indigo-200/80 dark:border-indigo-800/50 rounded-lg flex items-center justify-between gap-2 text-[10px]">
                                      <div className="flex items-center gap-1.5 font-bold text-indigo-800 dark:text-indigo-300">
                                        <User className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>Target Video Editor: <strong className="text-indigo-955 dark:text-indigo-100 uppercase font-extrabold">{editorName}</strong></span>
                                      </div>
                                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${task.workSampleUrl || task.notes ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-955 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-955 dark:text-amber-300'}`}>
                                        {task.workSampleUrl || task.notes ? `✓ Script Shared with ${editorName}` : `⏳ Awaiting Script`}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </div>
                              <div className="flex flex-col items-end justify-between gap-2">
                                <select 
                                  className="text-[10px] font-bold uppercase px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500"
                                  value={task.status}
                                  onChange={async (e) => {
                                    await fetch(`/api/client-tasks/${task.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: e.target.value })
                                    });
                                    refreshData();
                                  }}
                                >
                                  <option value="Not Started">Not Started</option>
                                  <option value="Processing">Processing</option>
                                  {!(['preet', 'pujan', 'rama'].some(n => (currentUser?.name || '').toLowerCase().includes(n)) || ['preet', 'pujan', 'rama'].some(n => (task.workingOn || '').toLowerCase().includes(n))) && (
                                    <>
                                      <option value="Client Review">Client Review</option>
                                      <option value="Revision">Revision</option>
                                    </>
                                  )}
                                  <option value="Completion">Completion</option>
                                  <option value="Posted">Posted</option>
                                  <option value="Pending">Pending</option>
                                  <option value="Overdue">Overdue</option>
                                </select>
                                <textarea
                                  className="text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 w-48 resize-none"
                                  placeholder="Add notes..."
                                  defaultValue={task.notes || ''}
                                  onBlur={async (e) => {
                                    if (e.target.value !== task.notes) {
                                      await fetch(`/api/client-tasks/${task.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ notes: e.target.value })
                                      });
                                      refreshData();
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                <hr className="border-slate-200 dark:border-slate-800" />

                {/* Client Deliverables Section */}
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Client Deliveries</h5>
                  <div className="space-y-4">
                    {allClientDeliveries.filter(d => d.workingOn === currentUser?.name).length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">No active deliveries assigned to you.</p>
                    ) : (
                      allClientDeliveries
                        .filter(d => d.workingOn === currentUser?.name)
                        .map((delivery) => (
                          <div key={delivery.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/20">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{delivery.clientName} <span className="text-[10px] text-slate-400 font-normal ml-2">({delivery.deliveryId})</span></p>
                                <p className="text-xs text-slate-500">
                                  Type: {delivery.postType} | 
                                  Post Date: <input 
                                    type="date" 
                                    className="bg-transparent border-b border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 mx-1 px-1"
                                    defaultValue={delivery.postDate || ''}
                                    onChange={async (e) => {
                                      await fetch(`/api/client-deliveries/${delivery.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ postDate: e.target.value })
                                      });
                                      refreshData();
                                    }}
                                  />
                                </p>
                              </div>
                              <div className="flex flex-col items-end justify-between gap-2">
                                <select 
                                  className="text-[10px] font-bold uppercase px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500"
                                  value={delivery.status}
                                  onChange={async (e) => {
                                    await fetch(`/api/client-deliveries/${delivery.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: e.target.value })
                                    });
                                    refreshData();
                                  }}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Delivered">Delivered</option>
                                </select>
                                <textarea
                                  className="text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 w-48 resize-none"
                                  placeholder="Add notes..."
                                  defaultValue={delivery.notes || ''}
                                  onBlur={async (e) => {
                                    if (e.target.value !== delivery.notes) {
                                      await fetch(`/api/client-deliveries/${delivery.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ notes: e.target.value })
                                      });
                                      refreshData();
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>
      </div>

      {/* --- STATUS UPDATE MODAL --- */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
              <h3 className="font-extrabold text-sm text-slate-950 dark:text-white">Update Task Status</h3>
              <button onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-slate-600 transition text-sm">✕</button>
            </div>
            
            <form onSubmit={handleUpdateStatusSubmit}>
              <div className="p-6 space-y-4 text-xs">
                {/* Target Video Editor Banner for Script tasks */}
                {(selectedTaskForStatus?.postType === 'Script' || (selectedTaskForStatus?.taskTitle && selectedTaskForStatus.taskTitle.toLowerCase().includes('script'))) && (() => {
                  const normTitle = selectedTaskForStatus.taskTitle.toLowerCase().replace(/\s*script\s*/i, '').trim();
                  const videoTask = allClientTasks.find(t => 
                    t.clientId === selectedTaskForStatus.clientId && 
                    (t.taskTitle.toLowerCase().trim() === normTitle || t.taskTitle.toLowerCase().trim() === normTitle.replace('script', '').trim())
                  );
                  const editorName = videoTask?.workingOn || 'Unassigned';

                  return (
                    <div className="p-3 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-955/40 dark:to-blue-955/40 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200">
                        <span className="flex items-center gap-1.5">
                          <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span>Assigned Video Editor: <strong className="uppercase font-black text-indigo-700 dark:text-indigo-300">{editorName}</strong></span>
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-200 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 rounded text-[9px] font-extrabold">Script Recipient</span>
                      </div>
                      <p className="text-[10px] text-indigo-700/80 dark:text-indigo-300/80 font-medium">
                        When you submit or update this script, it will be automatically shared with <strong>{editorName}</strong> for AI Video editing.
                      </p>
                    </div>
                  );
                })()}

                {formError && (
                  <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">New Status</label>
                  <select
                    required
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none uppercase tracking-wider font-bold"
                  >
                    {selectedTaskForStatus?.type === 'INTERNAL' ? (
                       <>
                         <option value="TODO">To Do</option>
                         <option value="DONE">Done / Completed</option>
                         <option value="PENDING">Pending (Blocked)</option>
                         <option value="OVERDUE">Overdue</option>
                       </>
                    ) : (selectedTaskForStatus?.postType === 'Posting' || (selectedTaskForStatus?.taskTitle && selectedTaskForStatus.taskTitle.toLowerCase().startsWith('post '))) ? (
                       <>
                          <option value="Not Started">Not Posted</option>
                          <option value="Posted">Posted</option>
                       </>
                    ) : (['preet', 'pujan', 'rama'].some(n => (currentUser?.name || '').toLowerCase().includes(n)) || ['preet', 'pujan', 'rama'].some(n => (selectedTaskForStatus?.workingOn || '').toLowerCase().includes(n))) ? (
                       <>
                         <option value="Not Started">Not Started</option>
                         <option value="Processing">Processing</option>
                         <option value="Completion">Completion</option>
                         <option value="Pending">Pending (Blocked)</option>
                         <option value="Overdue">Overdue</option>
                       </>
                    ) : (
                       <>
                         <option value="Not Started">Not Started</option>
                         <option value="Processing">Processing</option>
                         <option value="Client Review">Client Review</option>
                         <option value="Revision">Revision</option>
                         <option value="Completion">Completion</option>
                         <option value="Pending">Pending (Blocked)</option>
                         <option value="Overdue">Overdue</option>
                       </>
                    )}
                  </select>
                </div>

                {(newStatus === 'PENDING' || newStatus === 'OVERDUE' || newStatus === 'Pending' || newStatus === 'Overdue') && (
                  <div className="space-y-1">
                    <label className="font-bold text-red-600 dark:text-red-400">Reason for Delay <span className="text-red-500">*</span></label>
                    <textarea
                      value={statusReason}
                      required
                      onChange={(e) => setStatusReason(e.target.value)}
                      placeholder="Explain why this task is pending or overdue..."
                      rows="3"
                      className="w-full p-2.5 border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                )}

                {['DONE', 'Completed', 'Client Review', 'Completion'].includes(newStatus) && currentUser && !['pujan', 'preet', 'rama'].includes(currentUser.name.toLowerCase()) && !(selectedTaskForStatus?.postType === 'Posting' || (selectedTaskForStatus?.taskTitle && selectedTaskForStatus.taskTitle.toLowerCase().startsWith('post '))) && (
                  <div className="space-y-1 mt-2">
                    <label className="font-bold text-blue-600 dark:text-blue-400">Upload Work Sample <span className="text-red-500">*</span></label>
                    <p className="text-[10px] text-slate-500 mb-1">Creative team members must attach today's work sample to submit for client review / completion.</p>
                    <input
                      type="file"
                      required={!selectedTaskForStatus?.workSampleUrl}
                      onChange={(e) => setWorkSampleFile(e.target.files[0])}
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {selectedTaskForStatus?.workSampleUrl && (
                      <p className="text-[9px] text-emerald-600 font-bold mt-1">✓ Work sample already uploaded.</p>
                    )}
                  </div>
                )}

              </div>
              <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center justify-center min-w-[120px] transition disabled:opacity-70"
                >
                  {formLoading ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- LEAVE REQUEST MODAL --- */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
              <h3 className="font-extrabold text-sm text-slate-950 dark:text-white">Submit Leave Request</h3>
              <button onClick={() => setShowRequestModal(false)} className="text-slate-400 hover:text-slate-600 transition text-sm">✕</button>
            </div>
            
            <form onSubmit={handleRequestLeave}>
              <div className="p-6 space-y-4 text-xs">
                {formError && (
                  <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">End Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Reason / Details</label>
                  <textarea
                    value={reason}
                    required
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Medical appointment, family event..."
                    rows="3"
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="py-2 px-4 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="py-2 px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-lg transition disabled:opacity-50"
                >
                  {formLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
