'use client';

// Harshit TL dashboard removed

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, CheckSquare, Calendar, LogOut, Plus, Building, UserCheck,
  CheckCircle, FileText, AlertCircle, Briefcase, Play, Check, Moon,
  Sun, DollarSign, TrendingUp, Download, Users, FileDown, Activity,
  BarChart2, Lock, Menu, X
} from 'lucide-react';
import { uploadFileAction } from '@/app/actions/uploadAction';

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

export default function TLDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); 
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // Tabs: overview, team-overview, assign-task, tasks, directory, client-tasks, leaves, payroll
  const [loading, setLoading] = useState(true);

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
  };

  // Data states
  const [allTasksList, setAllTasksList] = useState([]);
  const [myTasksList, setMyTasksList] = useState([]);
  const [tlTasksList, setTlTasksList] = useState([]);
  const [leavesList, setLeavesList] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [todayLog, setTodayLog] = useState(null);
  const [clientsList, setClientsList] = useState([]);
  const [allClientTasks, setAllClientTasks] = useState([]);
  const [allClientDeliveries, setAllClientDeliveries] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [allLeavesList, setAllLeavesList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // TL Metrics
  const [metrics, setMetrics] = useState({
    teamMembers: 0,
    activeTasks: 0,
    completedTasks: 0,
  });

  // Assign Task Form Fields
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState(''); // Text URL
  const [taskFile, setTaskFile] = useState(null); // File upload
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Timer States
  const [timeStr, setTimeStr] = useState('');
  const [workDuration, setWorkDuration] = useState('00:00:00');

  // Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedTaskForStatus, setSelectedTaskForStatus] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [workSampleFile, setWorkSampleFile] = useState(null);

  // Leave Form Fields
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });

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

        if (!res.ok || !data.user || data.user.role !== 'TL') {
          router.push('/');
          return;
        }

        setCurrentUser(data.user);
      } catch (err) {
        console.error(err);
        router.push('/');
      }
    }
    initDashboard();
  }, [router]);

  useEffect(() => {
    if (currentUser) {
      refreshData();
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const refreshData = async () => {
    try {
      const [
        usersRes,
        tasksRes,
        leavesRes,
        attRes,
        clientsRes,
        ctRes,
        cdRes
      ] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/tasks'),
        fetch('/api/leaves'),
        fetch('/api/attendance'),
        fetch('/api/clients'),
        fetch('/api/client-tasks'),
        fetch('/api/client-deliveries')
      ]);

      const [
        usersData,
        tasksData,
        leavesData,
        attData,
        clientsData,
        ctData,
        cdData
      ] = await Promise.all([
        usersRes.json(),
        tasksRes.json(),
        leavesRes.json(),
        attRes.json(),
        clientsRes.json(),
        ctRes.json(),
        cdRes.json()
      ]);

      const fetchedUsers = usersData.users || [];
      
      // Team members matching TL department or designation
      const baseDept = currentUser?.department ? currentUser.department.replace(' Lead', '').toLowerCase() : '';
      const baseDesig = currentUser?.designation ? currentUser.designation.replace(' Lead', '').toLowerCase() : '';
      const targetRole = baseDept || baseDesig || 'ai video';
      const employees = fetchedUsers.filter(u => {
        if (u.role !== 'EMPLOYEE') return false;
        const uRole = ((u.department || '') + ' ' + (u.designation || '')).toLowerCase();
        return uRole.includes(targetRole) || uRole.includes('video editor') || u.name.toLowerCase() === 'sanmeet';
      });
      
      setUsersList(employees);
      setEmployeesList(employees);

      if (employees.length > 0 && !taskAssignee) {
        setTaskAssignee(employees[0].id.toString());
      }

      const fetchedTasks = tasksData.tasks || [];
      setAllTasksList(fetchedTasks);
      
      const myTasks = fetchedTasks.filter(t => t.assignedToId === currentUser?.id);
      setMyTasksList(myTasks);

      const teamTasks = fetchedTasks.filter(t => t.createdById === currentUser?.id || t.createdBy?.role === 'TL');
      setTlTasksList(teamTasks);

      setMetrics({
        teamMembers: employees.length,
        activeTasks: teamTasks.filter(t => t.status !== 'DONE').length,
        completedTasks: teamTasks.filter(t => t.status === 'DONE').length
      });

      const fetchedLeaves = leavesData.leaves || [];
      setAllLeavesList(fetchedLeaves);
      const myLeaves = fetchedLeaves.filter(l => l.userId === currentUser?.id);
      setLeavesList(myLeaves);

      setTodayLog(attData.todayLog);
      setAttendanceLogs(attData.logs || []);

      setClientsList(clientsData.clients || []);

      setAllClientTasks(ctData.tasks || []);

      setAllClientDeliveries(cdData.deliveries || []);

    } catch (err) {
      console.error('Error refreshing TL dashboard:', err);
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

  // Task operation (Own tasks)
  const handleToggleTaskStatus = async (taskId, currentStatus) => {
    let nextStatus = 'TODO';
    if (currentStatus === 'TODO') nextStatus = 'IN_PROGRESS';
    else if (currentStatus === 'IN_PROGRESS') nextStatus = 'DONE';
    else return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        showToast('Task updated successfully.');
        await refreshData();
      }
    } catch (err) {
      showToast('Failed to update task.', 'error');
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
      showToast('Re-upload error', 'error');
    }
  };

  // TL Task Status Change (Assigned scripts)
  const handleTLStatusChange = async (taskId, newStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showToast('Task status updated successfully.');
        await refreshData();
      } else {
        showToast('Failed to update task status.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating status.', 'error');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      let finalDescription = taskDesc;

      if (taskFile) {
        const formData = new FormData();
        formData.append('file', taskFile);

        const uploadData = await uploadFileAction(formData);
        if (uploadData.error) throw new Error(uploadData.error || 'Failed to upload PDF file');

        finalDescription = uploadData.fileUrl;
      }

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle,
          description: finalDescription,
          assignedToId: taskAssignee,
          dueDate: taskDueDate
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign task');

      showToast('Task assigned successfully!');
      
      setTaskTitle('');
      setTaskDesc('');
      setTaskFile(null);
      setTaskDueDate('');
      
      await refreshData();
      setActiveTab('tasks');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

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

    const isCompleted = ['DONE', 'Completed', 'Client Review', 'Completion'].includes(newStatus);
    
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
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-semibold animate-pulse">Loading TL Console...</p>
        </div>
      </div>
    );
  }

  const completedMyTasks = myTasksList.filter(t => t.status === 'DONE').length;
  const pendingMyTasks = myTasksList.filter(t => t.status !== 'DONE').length;

  const todayIso = new Date().toISOString().split('T')[0];

  const tlMyClientTasks = allClientTasks.filter(t => {
    const isAssignedToMe = t.workingOn && currentUser?.name && t.workingOn.toLowerCase().includes(currentUser.name.toLowerCase());
    const baseDept = currentUser?.department?.replace(' Lead', '')?.toLowerCase() || '';
    const assignToDept = t.assignTo?.toLowerCase() || '';
    const isDeptMatch = !t.workingOn && baseDept && assignToDept.startsWith(baseDept);
    return isAssignedToMe || isDeptMatch;
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

  const todaysClientTasksList = tlMyClientTasks.filter(ct => {
    const isPosting = ct.postType === 'Posting' || (ct.taskTitle && ct.taskTitle.toLowerCase().startsWith('post '));
    if (isPosting) {
      return isTaskReadyToPostToday(ct) || ['Completion', 'Completed', 'DONE', 'Posted'].includes(ct.status);
    }
    const ctIso = convertDbDateToIso(ct.date);
    if (['Posted', 'Completion', 'Completed', 'DONE'].includes(ct.status)) {
      if (ctIso !== todayIso) return false;
    }
    if (ctIso && ctIso <= todayIso) return true;
    return false;
  });

  const todaysTasksCount = [
    ...myTasksList.filter(t => t.status !== 'DONE' && t.dueDate && t.dueDate <= todayIso),
    ...todaysClientTasksList.filter(ct => !['Posted', 'Completion', 'Completed', 'DONE'].includes(ct.status))
  ].length;

  const renderTodayTasksByTeamEmployee = () => (
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5 animate-fade-in mt-8">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-2">
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-indigo-500 shrink-0" />
          <span>Today&apos;s Tasks by Team Employee</span>
          <span className="text-[11px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800/30 ml-1 shrink-0">
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </h3>
        <span className="text-xs font-bold text-slate-400 shrink-0">{employeesList.length} Team Members</span>
      </div>

      {employeesList.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-xs font-semibold">
          No team members assigned under your supervision yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
          {employeesList.map((emp) => {
            const empInternalTasks = allTasksList.filter(t => t.assignedToId === emp.id || t.assignedTo?.name === emp.name);
            const empClientTasks = allClientTasks.filter(t => t.workingOn === emp.name);

            const internalItems = empInternalTasks.map(t => ({
              id: `t-${t.id}`,
              title: t.title,
              sub: t.description || 'Internal Duty',
              status: t.status,
              _type: 'task'
            }));

            const clientItems = empClientTasks.map(t => ({
              id: `ct-${t.id}`,
              title: t.taskTitle,
              sub: `${t.businessName} · ${t.postType || 'Deliverable'}`,
              status: t.status,
              _type: 'delivery'
            }));

            const allEmpItems = [...internalItems, ...clientItems];
            const doneCount = allEmpItems.filter(i => ['DONE', 'Completed', 'Completion', 'Delivered'].includes(i.status)).length;
            const pendingCount = allEmpItems.length - doneCount;

            const avatarColors = [
              'from-cyan-400 to-blue-500',
              'from-violet-400 to-purple-500',
              'from-emerald-400 to-teal-500',
              'from-orange-400 to-rose-500'
            ];
            const colorIdx = emp.name.charCodeAt(0) % avatarColors.length;

            return (
              <div key={emp.id} className="bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xs min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarColors[colorIdx]} text-white flex items-center justify-center text-sm font-black shadow-sm shrink-0`}>
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{emp.name}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-bold flex-wrap">
                        <span className="text-emerald-600 dark:text-emerald-400">{doneCount} done</span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-orange-500">{pendingCount} pending</span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-purple-500">{internalItems.length}T</span>
                        <span className="text-blue-500">{clientItems.length}D</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-700 px-2.5 py-1 rounded-lg shrink-0">
                    {allEmpItems.length}
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 max-h-48 overflow-y-auto pr-1">
                  {allEmpItems.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-2">No tasks assigned to {emp.name} today.</p>
                  ) : (
                    allEmpItems.map(item => (
                      <div key={item.id} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs gap-2">
                        <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase shrink-0 ${item._type === 'task' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'}`}>
                              {item._type}
                            </span>
                            <p className="font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">{item.sub}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${['DONE', 'Completed', 'Completion', 'Delivered'].includes(item.status) ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                          {item.status || 'Not Started'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderTeamLeaveAndAbsences = () => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6 animate-fade-in mt-8">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            Team Leave Approvals & Absences
            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
              <Lock className="w-2.5 h-2.5 text-amber-500" /> Read-Only View (TL Access)
            </span>
          </h4>
          <p className="text-xs text-slate-400 mt-1">View leave request status and attendance records for your team members ({employeesList.map(e => e.name).join(', ') || 'No team members'}).</p>
        </div>
      </div>

      {/* Team Leave Requests Table */}
      <div>
        <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Team Leave Requests</h5>
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[600px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-extrabold border-b border-slate-200 dark:border-slate-800">
                <th className="p-3.5 uppercase tracking-wider">Employee</th>
                <th className="p-3.5 uppercase tracking-wider">Reason / Details</th>
                <th className="p-3.5 uppercase tracking-wider">Date Interval</th>
                <th className="p-3.5 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(() => {
                const teamLeavesList = allLeavesList.filter(l => 
                  employeesList.some(e => e.id === l.userId || e.name === l.user?.name)
                );

                if (teamLeavesList.length === 0) {
                  return (
                    <tr>
                      <td colSpan="4" className="p-6 text-center text-slate-400 font-medium">No leave requests logged for your team members.</td>
                    </tr>
                  );
                }

                return teamLeavesList.map((leave) => {
                  const empName = leave.user?.name || employeesList.find(e => e.id === leave.userId)?.name || `Employee #${leave.userId}`;
                  return (
                    <tr key={leave.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-extrabold flex items-center justify-center text-[10px]">
                          {empName.charAt(0)}
                        </div>
                        <span>{empName}</span>
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">"{leave.reason}"</td>
                      <td className="p-3.5 text-slate-500 font-semibold">{leave.startDate} to {leave.endDate}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          leave.status === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800' :
                          leave.status === 'REJECTED' ? 'bg-red-50 dark:bg-red-950/40 text-red-600 border border-red-200 dark:border-red-800' :
                          'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800'
                        }`}>
                          {leave.status}
                        </span>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Today's Team Attendance / Absences */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
        <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Today's Team Attendance & Absences</h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {employeesList.map(emp => {
            const todayStr = new Date().toISOString().split('T')[0];
            const log = attendanceLogs.find(a => (a.userId === emp.id || a.user?.name === emp.name) && a.date === todayStr);
            const status = log ? log.status : 'ABSENT';

            return (
              <div key={emp.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">{emp.name}</p>
                    <p className="text-[10px] text-slate-400">{emp.department || 'Team Member'}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                  status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                  status === 'LATE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                  'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                }`}>
                  {status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      
      {/* Toast Alert */}
      {toast.message && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-semibold animate-slide-in
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

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${
        mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}>
        <div className="overflow-y-auto flex-1">
          {/* Brand */}
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-sm">
                <Building className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                WorkForce TL
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
              {currentUser.avatar || '👨‍💼'}
            </div>
            <div className="overflow-hidden">
              <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{currentUser.name}</div>
              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold tracking-widest uppercase">
                {currentUser.department} LEAD
              </div>
            </div>
          </div>

          {/* Sidebar Navigation */}
          <nav className="p-3 sm:p-4 flex flex-col gap-1">
            <p className="px-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 mt-2">Personal</p>
            
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
              {pendingMyTasks > 0 && (
                <span className="ml-auto w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                  {pendingMyTasks}
                </span>
              )}
            </button>

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


            
            <p className="px-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 mt-6">Team Leader</p>

            <button
              onClick={() => handleSelectTab('team-tasks')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === 'team-tasks'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              Team Tasks Monitor
            </button>

            <button
              onClick={() => handleSelectTab('team-leaves')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === 'team-leaves'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Team Leaves & Absences
            </button>

            <button
              onClick={() => handleSelectTab('assign-task')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === 'assign-task'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              Assign Script
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
      <main className="flex-grow flex flex-col min-w-0 overflow-y-auto h-screen">
        
        {/* Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-3 sm:px-6 lg:px-8 shrink-0 sticky top-0 z-20 transition-colors">
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
          
          {/* TAB 1: OVERVIEW & CLOCK (Personal) */}
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
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Today's Tasks Checklist</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Assigned deliverables and checklist duties for today.</p>
                    </div>
                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[9px] font-bold rounded-lg uppercase">Today ({todaysTasksCount})</span>
                  </div>

                  <div className="space-y-3">
                    {[
                      ...myTasksList
                        .filter(t => t.dueDate === todayIso)
                        .map(t => ({ ...t, type: 'internal' })),
                      ...todaysClientTasksList
                        .map(ct => ({ ...ct, type: 'client' }))
                    ].length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6 italic font-medium">No tasks scheduled for today.</p>
                    ) : (
                      [
                        ...myTasksList
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
                              <span className="truncate">{item.type === 'internal' ? `Assigned by: ${item.createdBy?.name || 'Admin'}` : `Client: ${item.businessName}`}</span>
                              {item.priority && (
                                <>
                                  <span>•</span>
                                  <span className={`uppercase text-[8px] font-bold ${item.priority === 'Urgent' ? 'text-red-500' : item.priority === 'High' ? 'text-orange-500' : 'text-slate-400'}`}>
                                    {item.priority}
                                  </span>
                                </>
                              )}
                            </div>
                            {/* Approved Content Link / Work Sample */}
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
                                      <FileDown className="w-3 h-3" /> View Approved Content / Work Sample
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
                                    <a 
                                      href={scriptUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/40"
                                    >
                                      <FileDown className="w-3 h-3" /> View Script PDF
                                    </a>
                                  )}

                                </div>
                              );
                            })()}
                          </div>
                          
                          <div className="shrink-0 flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider
                              ${item.status === 'Completion' || item.status === 'DONE' 
                                ? 'bg-emerald-100 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                : item.status === 'Processing' || item.status === 'IN_PROGRESS'
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
                              onClick={() => openStatusModal(item, item.type === 'internal' ? 'INTERNAL' : 'CLIENT')}
                              className="py-1 px-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg text-[9px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition flex items-center gap-0.5 cursor-pointer"
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
                
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border-l-4 border-l-blue-600 flex items-center justify-between transition hover:shadow-md animate-slide-up">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-450 font-extrabold uppercase tracking-widest block">Today's Assigned Tasks</span>
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
                    <h3 className="text-2xl font-black dark:text-white">{pendingMyTasks}</h3>
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
                  <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Completed Actions</span>
                    <h3 className="text-2xl font-black dark:text-white">{completedMyTasks}</h3>
                  </div>
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>

              </div>

              {/* Today's Tasks by Team Employee embedded in Overview */}
              <div className="lg:col-span-12 w-full">
                {renderTodayTasksByTeamEmployee()}
              </div>

            </div>
          )}
          {/* TAB 2: MY TASKS (Personal & Team Overview merged) */}
          {activeTab === 'tasks' && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Assigned Duties checklist</h4>
                  <p className="text-xs text-slate-400 mt-1">Review task details and report updates by clicking status transitions.</p>
                </div>

                <div className="p-6 space-y-4">
                  {myTasksList.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No tasks assigned yet.</p>
                  ) : (
                    myTasksList.map((task) => (
                      <div 
                        key={task.id} 
                        className={`p-4 border rounded-xl flex items-center justify-between transition duration-300
                          ${task.status === 'DONE' 
                            ? 'border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40 opacity-75' 
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 hover:-translate-y-1 cursor-default'}`}
                      >
                        <div className="space-y-1 pr-6 overflow-hidden">
                          <p className={`text-xs font-bold leading-tight ${task.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                            {task.title}
                          </p>
                          {task.description && (task.description.startsWith('http') || task.description.startsWith('/uploads/')) ? (
                            <a 
                              href={task.description} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md"
                            >
                              <FileDown className="w-3.5 h-3.5" /> View Script PDF
                            </a>
                          ) : (
                            <p className="text-[10px] text-slate-455 truncate mt-1">{task.description}</p>
                          )}
                          <p className="text-[9px] text-slate-400 font-medium mt-1.5">Assigned by: {task.createdBy?.name || 'Admin'} ({task.createdBy?.role || ''}) | Due: {task.dueDate || 'No Limit'}</p>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {task.status === 'TODO' && (
                            <button 
                              onClick={() => handleToggleTaskStatus(task.id, 'TODO')}
                              className="py-1 px-3 border border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400 rounded-lg text-[9px] font-bold hover:bg-blue-50 dark:hover:bg-blue-950/20 transition flex items-center gap-1"
                            >
                              <Play className="w-2.5 h-2.5" /> Start Work
                            </button>
                          )}
                          {task.status === 'IN_PROGRESS' && (
                            <button 
                              onClick={() => handleToggleTaskStatus(task.id, 'IN_PROGRESS')}
                              className="py-1 px-3 border border-indigo-200 text-indigo-600 dark:border-indigo-800 dark:text-indigo-400 rounded-lg text-[9px] font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Mark Completed
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
                </div>
              </div>

              {/* Merged Team Overview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {/* Team Members Card */}
                <div className="relative bg-white dark:bg-slate-900 p-5 xl:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex items-center justify-between hover:translate-y-[-2px] transition duration-200 group">
                  <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-50 dark:bg-blue-900/20 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-24 h-24 bg-blue-50/80 dark:bg-blue-900/40 rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-500"></div>
                  
                  <div className="space-y-1 relative z-10 min-w-0 pr-2">
                    <div className="text-[10px] xl:text-xs text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider truncate">Team Members</div>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <h3 className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white truncate">{metrics.teamMembers}</h3>
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Employees</span>
                    </div>
                  </div>
                  <div className="shrink-0 relative z-10 w-10 h-10 xl:w-12 xl:h-12 rounded-xl bg-white/90 dark:bg-slate-800 backdrop-blur-sm shadow-md border border-white dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Users className="w-5 h-5 xl:w-6 xl:h-6" />
                  </div>
                </div>

                {/* Active Scripts Card */}
                <div className="relative bg-white dark:bg-slate-900 p-5 xl:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex items-center justify-between hover:translate-y-[-2px] transition duration-200 group">
                  <div className="absolute -right-6 -top-6 w-32 h-32 bg-purple-50 dark:bg-purple-900/20 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-24 h-24 bg-purple-50/80 dark:bg-purple-900/40 rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-500"></div>
                  
                  <div className="space-y-1 relative z-10 min-w-0 pr-2">
                    <div className="text-[10px] xl:text-xs text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider truncate">Active Scripts</div>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <h3 className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white truncate">{metrics.activeTasks}</h3>
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Pending</span>
                    </div>
                  </div>
                  <div className="shrink-0 relative z-10 w-10 h-10 xl:w-12 xl:h-12 rounded-xl bg-white/90 dark:bg-slate-800 backdrop-blur-sm shadow-md border border-white dark:border-slate-700 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <CheckSquare className="w-5 h-5 xl:w-6 xl:h-6" />
                  </div>
                </div>

                {/* Completed Scripts Card */}
                <div className="relative bg-white dark:bg-slate-900 p-5 xl:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex items-center justify-between hover:translate-y-[-2px] transition duration-200 group">
                  <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/20 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-24 h-24 bg-emerald-50/80 dark:bg-emerald-900/40 rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-500"></div>
                  
                  <div className="space-y-1 relative z-10 min-w-0 pr-2">
                    <div className="text-[10px] xl:text-xs text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider truncate">Completed Scripts</div>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <h3 className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white truncate">{metrics.completedTasks}</h3>
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Done</span>
                    </div>
                  </div>
                  <div className="shrink-0 relative z-10 w-10 h-10 xl:w-12 xl:h-12 rounded-xl bg-white/90 dark:bg-slate-800 backdrop-blur-sm shadow-md border border-white dark:border-slate-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="w-5 h-5 xl:w-6 xl:h-6" />
                  </div>
                </div>
              </div>

              {/* Merged Assigned Scripts Tracking Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white">Assigned Scripts Tracking</h4>
                  <button 
                    onClick={() => setActiveTab('assign-task')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-xs font-bold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Assign New
                  </button>
                </div>
                
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                        <th className="py-3 px-4 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-1/3">Task & Script</th>
                        <th className="py-3 px-4 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Assignee</th>
                        <th className="py-3 px-4 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Due Date</th>
                        <th className="py-3 px-4 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(() => {
                        const clientScriptTasks = allClientTasks
                          .filter(t => t.postType === 'Script' || t.taskTitle?.toLowerCase().includes('script'))
                          .map(t => {
                            const videoTask = allClientTasks.find(v => v.clientId === t.clientId && v.taskTitle === t.taskTitle.replace(' Script', ''));
                            return {
                              id: t.id,
                              isClientTask: true,
                              title: `${t.taskTitle} (${t.businessName})`,
                              pdfUrl: t.workSampleUrl || null,
                              assignedToName: videoTask?.workingOn || t.workingOn || 'AI Video Editor',
                              assignedToAvatar: '👤',
                              dueDate: t.date || '-',
                              status: t.status === 'Completion' ? 'DONE' : t.status === 'In Progress' ? 'IN_PROGRESS' : 'TODO',
                              rawTask: t
                            };
                          });

                        const internalScriptTasks = tlTasksList.map(t => ({
                          id: t.id,
                          isClientTask: false,
                          title: t.title,
                          pdfUrl: (t.description && (t.description.startsWith('http') || t.description.startsWith('/uploads/'))) ? t.description : t.workSampleUrl || null,
                          assignedToName: t.assignedTo?.name || 'Unknown',
                          assignedToAvatar: t.assignedTo?.avatar || '👤',
                          dueDate: t.dueDate || '-',
                          status: t.status,
                          rawTask: t
                        }));

                        const allScripts = [...internalScriptTasks, ...clientScriptTasks];

                        if (allScripts.length === 0) {
                          return (
                            <tr>
                              <td colSpan="4" className="py-8 text-center text-slate-500 font-semibold text-sm">
                                No scripts assigned yet.
                              </td>
                            </tr>
                          );
                        }

                        return allScripts.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                            <td className="py-3 px-4">
                              <div className="font-bold text-sm text-slate-900 dark:text-white">{item.title}</div>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                {item.pdfUrl && (
                                  <a 
                                    href={item.pdfUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md"
                                  >
                                    <FileDown className="w-3 h-3" /> View Script PDF
                                  </a>
                                )}

                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs">
                                  {item.assignedToAvatar}
                                </div>
                                <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                                  {item.assignedToName}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-medium text-sm text-slate-600 dark:text-slate-400">
                              {item.dueDate}
                            </td>
                            <td className="py-3 px-4">
                              <select 
                                value={item.status}
                                onChange={(e) => {
                                  if (item.isClientTask) {
                                    fetch(`/api/client-tasks/${item.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: e.target.value === 'DONE' ? 'Completion' : e.target.value === 'IN_PROGRESS' ? 'In Progress' : 'Not Started' })
                                    }).then(() => refreshData());
                                  } else {
                                    handleTLStatusChange(item.id, e.target.value);
                                  }
                                }}
                                className={`text-xs font-bold px-2 py-1 rounded-md outline-none border cursor-pointer ${
                                  item.status === 'DONE' 
                                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                                    : item.status === 'IN_PROGRESS'
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <option value="TODO">TODO</option>
                                <option value="IN_PROGRESS">IN PROGRESS</option>
                                <option value="DONE">DONE</option>
                              </select>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CLIENT TASKS */}
          {activeTab === 'client-tasks' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">CRM Deliverables</h4>
                  <p className="text-xs text-slate-400 mt-1">View and manage client tasks assigned to you or your department.</p>
                </div>
              </div>
              <div className="p-6 space-y-8">
                
                {/* Client Tasks Section */}
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Client Tasks</h5>
                  <div className="space-y-4">
                    {allClientTasks.filter(t => {
                      const baseDept = currentUser?.department?.replace(' Lead', '')?.toLowerCase() || '';
                      const assignToDept = t.assignTo?.toLowerCase() || '';
                      const isDeptMatch = baseDept && assignToDept.startsWith(baseDept);
                      return t.workingOn === currentUser?.name || isDeptMatch || employeesList.some(e => e.name === t.workingOn);
                    }).length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">No client tasks found for you.</p>
                    ) : (
                      allClientTasks
                        .filter(t => {
                          const baseDept = currentUser?.department?.replace(' Lead', '')?.toLowerCase() || '';
                          const assignToDept = t.assignTo?.toLowerCase() || '';
                          const isDeptMatch = baseDept && assignToDept.startsWith(baseDept);
                          return t.workingOn === currentUser?.name || isDeptMatch || employeesList.some(e => e.name === t.workingOn);
                        })
                        .map((task) => (
                          <div key={task.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/20">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{task.taskTitle} <span className="text-[10px] text-slate-400 font-normal ml-2">({task.taskId})</span></p>
                                <p className="text-xs text-slate-500">
                                  Client: <span className="font-semibold text-slate-700 dark:text-slate-300">{task.businessName}</span> | 
                                  Type: {task.postType} | 
                                  Date: <input 
                                    type="date" 
                                    className="bg-transparent border-b border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 mx-1 px-1"
                                    defaultValue={task.date || ''}
                                    onChange={async (e) => {
                                      await fetch(`/api/client-tasks/${task.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ date: e.target.value })
                                      });
                                      refreshData();
                                    }}
                                  />
                                </p>
                                {/* Display script link for AI Video tasks */}
                                {task.postType === 'AI Video' && (() => {
                                  const scriptTitle = `${task.taskTitle} Script`;
                                  const scriptTask = allClientTasks.find(t => t.clientId === task.clientId && t.taskTitle === scriptTitle);
                                  if (scriptTask && scriptTask.workSampleUrl) {
                                    return (
                                      <a 
                                        href={scriptTask.workSampleUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md"
                                      >
                                        <FileText className="w-3 h-3" /> View Script
                                      </a>
                                    );
                                  }
                                  return null;
                                })()}
                                {/* Display own work sample if uploaded */}
                                {task.workSampleUrl && (
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <a 
                                      href={task.workSampleUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-md"
                                    >
                                      <FileDown className="w-3 h-3" /> View Work Sample
                                    </a>
                                    <label className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md cursor-pointer transition border border-blue-200/60 dark:border-blue-800/40">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                      Re-Upload Content
                                      <input 
                                        type="file" 
                                        className="hidden"
                                        onChange={(e) => {
                                          if (e.target.files && e.target.files[0]) {
                                            handleReuploadContent(task.id, e.target.files[0], true);
                                          }
                                        }}
                                      />
                                    </label>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {task.status !== 'Completion' && (
                                  <button onClick={() => openStatusModal(task, 'CLIENT')} className="py-1 px-3 border border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400 rounded-lg text-[9px] font-bold hover:bg-blue-50 dark:hover:bg-blue-950/20 transition flex items-center gap-1 shrink-0">
                                    <Play className="w-2.5 h-2.5" /> Update Status
                                  </button>
                                )}
                                {task.status === 'Completion' && (
                                  <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-[9px] font-bold rounded-lg uppercase tracking-wider">
                                    Completed
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Client Deliveries Section */}
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 border-t border-slate-200 dark:border-slate-800 pt-6">Client Deliveries</h5>
                  <div className="space-y-4">
                    {allClientDeliveries.filter(d => {
                      const baseDept = currentUser?.department?.replace(' Lead', '')?.toLowerCase() || '';
                      const assignToDept = d.assignTo?.toLowerCase() || '';
                      const isDeptMatch = baseDept && assignToDept.startsWith(baseDept);
                      return d.workingOn === currentUser?.name || isDeptMatch || employeesList.some(e => e.name === d.workingOn);
                    }).length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">No client deliveries found for you.</p>
                    ) : (
                      allClientDeliveries
                        .filter(d => {
                          const baseDept = currentUser?.department?.replace(' Lead', '')?.toLowerCase() || '';
                          const assignToDept = d.assignTo?.toLowerCase() || '';
                          const isDeptMatch = baseDept && assignToDept.startsWith(baseDept);
                          return d.workingOn === currentUser?.name || isDeptMatch || employeesList.some(e => e.name === d.workingOn);
                        })
                        .map((delivery) => (
                          <div key={delivery.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/20">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{delivery.businessName} <span className="text-[10px] text-slate-400 font-normal ml-2">({delivery.clientId})</span></p>
                                <p className="text-xs text-slate-500">
                                  Amount: <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{delivery.amount}</span> | 
                                  Date: <input 
                                    type="date" 
                                    className="bg-transparent border-b border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 mx-1 px-1"
                                    defaultValue={delivery.date || ''}
                                    onChange={async (e) => {
                                      await fetch(`/api/client-deliveries/${delivery.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ date: e.target.value })
                                      });
                                      refreshData();
                                    }}
                                  /> | Note: {delivery.notes || '-'}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <select
                                  value={delivery.status}
                                  onChange={async (e) => {
                                    await fetch(`/api/client-deliveries/${delivery.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: e.target.value })
                                    });
                                    refreshData();
                                  }}
                                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border outline-none
                                    ${['Completed', 'DONE', 'Completion', 'Delivered'].includes(delivery.status) ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400'
                                    : ['Processing', 'In Progress'].includes(delivery.status) ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}
                                  `}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Delivered">Delivered</option>
                                  <option value="Not Started">Not Started</option>
                                  <option value="Processing">Processing</option>
                                  <option value="Client Review">Client Review</option>
                                  <option value="Revision">Revision</option>
                                  <option value="Completion">Completion</option>
                                  <option value="Posted">Posted</option>
                                  <option value="Overdue">Overdue</option>
                                </select>
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

              {/* Read-Only Team Leave Requests & Absences embedded under Leaves tab */}
              {renderTeamLeaveAndAbsences()}

            </div>
          )}

          {/* TAB: TEAM TASKS MONITOR */}
          {activeTab === 'team-tasks' && (
            <div className="space-y-6 animate-fade-in">
              {renderTodayTasksByTeamEmployee()}
            </div>
          )}

          {/* TAB: TEAM LEAVES & ABSENCES (READ-ONLY) */}
          {activeTab === 'team-leaves' && (
            <div className="space-y-6 animate-fade-in">
              {renderTeamLeaveAndAbsences()}
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
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Employee Directory</h4>
                  <p className="text-xs text-slate-400 mt-1">View your colleagues and their departments.</p>
                </div>
                <div className="relative w-full md:w-64">
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {usersList
                    .filter(u => {
                      if (!searchQuery) return true;
                      const query = searchQuery.toLowerCase();
                      return (
                        u.name.toLowerCase().includes(query) ||
                        u.email.toLowerCase().includes(query) ||
                        (u.department && u.department.toLowerCase().includes(query)) ||
                        (u.role && u.role.toLowerCase().includes(query)) ||
                        (u.designation && u.designation.toLowerCase().includes(query))
                      );
                    })
                    .map((u) => (
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



          {/* TL SPECIFIC: ASSIGN TASK */}
          {activeTab === 'assign-task' && (
            <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm animate-fade-in-up">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Assign New Script</h3>
                  <p className="text-xs font-semibold text-slate-500">Provide a link to the script PDF and assign it to an employee.</p>
                </div>
              </div>

              {formError && (
                <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold rounded-lg border border-red-100 dark:border-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateTask} className="space-y-5">
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Script Title</label>
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="e.g. YouTube Reel Script - Top 10 Places"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Assign To Employee</label>
                  <select
                    required
                    value={taskAssignee}
                    onChange={e => setTaskAssignee(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
                  >
                    {employeesList.map(u => (
                      <option key={u.id} value={u.id}>{u.name} (Employee)</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Script / PDF Link (URL)</label>
                    <input
                      type="url"
                      value={taskDesc}
                      onChange={e => setTaskDesc(e.target.value)}
                      disabled={!!taskFile}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                      placeholder="https://drive.google.com/file/d/... (Optional)"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">OR</span>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Upload Document (PDF/Word)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="application/pdf,.doc,.docx"
                        onChange={e => setTaskFile(e.target.files[0] || null)}
                        disabled={!!taskDesc}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={e => setTaskDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition shadow-md shadow-blue-600/20 disabled:opacity-50"
                  >
                    {formLoading ? 'Assigning...' : 'Assign Script'}
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {/* LEAVE REQUEST MODAL (Only when showRequestModal is true) */}
          {showRequestModal && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-slide-up">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                  <h3 className="font-bold text-slate-900 dark:text-white">Request Time-Off</h3>
                  <button onClick={() => setShowRequestModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    ✕
                  </button>
                </div>
                
                <form onSubmit={handleRequestLeave} className="p-6 space-y-4">
                  {formError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {formError}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Start Date</label>
                      <input 
                        type="date" 
                        required
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full text-sm px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">End Date</label>
                      <input 
                        type="date" 
                        required
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full text-sm px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Reason for leave</label>
                    <textarea 
                      required
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      rows="3"
                      className="w-full text-sm px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                      placeholder="Medical, vacation, personal, etc."
                    ></textarea>
                  </div>
                  
                  <div className="pt-2 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowRequestModal(false)}
                      className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={formLoading}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition shadow-md shadow-blue-600/20 disabled:opacity-50"
                    >
                      {formLoading ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* --- STATUS UPDATE MODAL --- */}
          {showStatusModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-fade-in animate-duration-200">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up animate-duration-200">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
                  <h3 className="font-extrabold text-sm text-slate-950 dark:text-white">Update Task Status</h3>
                  <button onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-slate-600 transition text-sm">✕</button>
                </div>
                
                <form onSubmit={handleUpdateStatusSubmit}>
                  <div className="p-6 space-y-4 text-xs">
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
                        ) : (['preet', 'pujan', 'rama'].some(n => (selectedTaskForStatus?.workingOn || '').toLowerCase().includes(n))) ? (
                           <>
                             <option value="Not Started">Not Started</option>
                             <option value="Processing">Processing</option>
                             <option value="Completion">Completion</option>
                             <option value="Posted">Posted</option>
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
                             <option value="Posted">Posted</option>
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

                    {['DONE', 'Completed', 'Client Review', 'Completion'].includes(newStatus) && (
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
                      {formLoading ? 'Submitting...' : 'Update Status'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
