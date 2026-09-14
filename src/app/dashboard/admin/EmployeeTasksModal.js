import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Layers,
  Filter,
  Calendar,
  ShieldCheck,
  TrendingUp,
  FileText,
  User,
  Sparkles,
  ArrowRightLeft,
  Check,
  Loader2,
  UserCheck
} from 'lucide-react';

export default function EmployeeTasksModal({ employee, employees = [], onClose, onTaskTransferred }) {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'OVERDUE' | 'IN_PROGRESS' | 'COMPLETED'
  const [taskTypeFilter, setTaskTypeFilter] = useState('ALL'); // 'ALL' | 'Client Task' | 'Delivery' | 'Internal Task'
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('tasks'); // 'tasks' | 'scorecard'
  const [mounted, setMounted] = useState(false);

  // Task Transfer States
  const [localTasks, setLocalTasks] = useState(employee?.allTasksList || []);
  const [staffList, setStaffList] = useState(employees || []);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [taskToTransfer, setTaskToTransfer] = useState(null); // null = bulk transfer of filtered tasks
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferFeedback, setTransferFeedback] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (employee?.allTasksList) {
      setLocalTasks(employee.allTasksList);
    }
  }, [employee]);

  useEffect(() => {
    if (employees && employees.length > 0) {
      setStaffList(employees);
    } else {
      fetch('/api/users')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setStaffList(data);
          else if (data?.users) setStaffList(data.users);
        })
        .catch(() => {});
    }
  }, [employees]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (transferModalOpen) {
          setTransferModalOpen(false);
          setTaskToTransfer(null);
          setSelectedStaff(null);
          setTransferFeedback(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, transferModalOpen]);

  const allTasks = localTasks;

  // Filter tasks - Hook called unconditionally on every render
  const filteredTasks = useMemo(() => {
    if (!employee) return [];
    return allTasks.filter(task => {
      // Status Filter Tab
      if (activeTab === 'OVERDUE' && task.status !== 'Overdue') return false;
      if (activeTab === 'COMPLETED' && task.status !== 'Completed' && task.status !== 'Delivered') return false;
      if (activeTab === 'IN_PROGRESS' && (task.status === 'Completed' || task.status === 'Delivered' || task.status === 'Overdue')) return false;

      // Type Filter
      if (taskTypeFilter !== 'ALL' && task.type !== taskTypeFilter) return false;

      // Search Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = (task.title || '').toLowerCase().includes(query);
        const matchesClient = (task.client || '').toLowerCase().includes(query);
        const matchesId = (task.taskId || '').toLowerCase().includes(query);
        const matchesCategory = (task.category || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesClient && !matchesId && !matchesCategory) return false;
      }

      return true;
    });
  }, [allTasks, activeTab, taskTypeFilter, searchQuery, employee]);

  // Filter staff list for transfer selector
  const filteredStaffList = useMemo(() => {
    const currentName = (employee?.name || '').toLowerCase().trim();
    const list = staffList.filter(s => s && s.name && s.name.toLowerCase().trim() !== currentName);
    if (!staffSearchQuery.trim()) return list;
    const q = staffSearchQuery.toLowerCase();
    return list.filter(s => 
      (s.name || '').toLowerCase().includes(q) ||
      (s.department || '').toLowerCase().includes(q) ||
      (s.designation || '').toLowerCase().includes(q) ||
      (s.role || '').toLowerCase().includes(q)
    );
  }, [staffList, staffSearchQuery, employee]);

  const overdueCount = allTasks.filter(t => t.status === 'Overdue').length;
  const completedCount = allTasks.filter(t => t.status === 'Completed' || t.status === 'Delivered').length;
  const inProgressCount = allTasks.length - overdueCount - completedCount;

  // Handler to open transfer popup
  const handleOpenTransferModal = (task) => {
    setTaskToTransfer(task);
    setSelectedStaff(null);
    setStaffSearchQuery('');
    setTransferFeedback(null);
    setTransferModalOpen(true);
  };

  // Handler to submit transfer
  const handleConfirmTransfer = async () => {
    if (!selectedStaff) return;
    setIsTransferring(true);
    setTransferFeedback(null);

    try {
      let payload = {};
      if (taskToTransfer) {
        // Single task transfer
        payload = {
          taskId: taskToTransfer.taskId,
          rawId: taskToTransfer.rawId,
          taskType: taskToTransfer.type || taskToTransfer.rawType,
          targetUserId: selectedStaff.id,
          targetUserName: selectedStaff.name
        };
      } else {
        // Bulk transfer of currently filtered tasks
        payload = {
          tasks: filteredTasks.map(t => ({
            taskId: t.taskId,
            rawId: t.rawId,
            taskType: t.type || t.rawType
          })),
          fromUserName: employee.name,
          targetUserId: selectedStaff.id,
          targetUserName: selectedStaff.name
        };
      }

      const res = await fetch('/api/admin/tasks/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to transfer task(s)');
      }

      // Update local state immediately so transferred tasks disappear from this employee's list
      if (taskToTransfer) {
        setLocalTasks(prev => prev.filter(t => t.id !== taskToTransfer.id));
      } else {
        const transferredIds = new Set(filteredTasks.map(t => t.id));
        setLocalTasks(prev => prev.filter(t => !transferredIds.has(t.id)));
      }

      setTransferFeedback({
        type: 'success',
        message: data.message || `Successfully transferred to ${selectedStaff.name}!`
      });

      if (onTaskTransferred) {
        onTaskTransferred();
      }

      setTimeout(() => {
        setTransferModalOpen(false);
        setTaskToTransfer(null);
        setSelectedStaff(null);
        setTransferFeedback(null);
      }, 1200);

    } catch (err) {
      setTransferFeedback({
        type: 'error',
        message: err.message || 'An error occurred while transferring the task.'
      });
    } finally {
      setIsTransferring(false);
    }
  };

  // Unconditional render guard placed AFTER all hooks have executed
  if (!employee || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      style={{ zIndex: 999999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !transferModalOpen) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl lg:max-w-6xl max-h-[92vh] flex flex-col overflow-hidden relative">
        
        {/* Modal Header & Employee Profile Strip */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600 text-white font-black text-xl flex items-center justify-center shadow-lg border border-indigo-400/30 shrink-0">
              {employee.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
                  {employee.name}
                </h3>
                {employee.tier?.badge && (
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black border ${employee.tier.badgeColor}`}>
                    {employee.tier.badge}
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Score: {employee.compositeScore || 0}/100
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">
                {employee.designation || 'Specialist'} • <span className="text-indigo-600 dark:text-indigo-400 font-bold">{employee.department}</span> • Assigned across {employee.clientsCount || 0} Clients
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
            {/* View Switcher: Tasks View vs Scorecard */}
            <div className="bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-xl flex items-center gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('tasks')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'tasks'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Filtered Tasks ({allTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('scorecard')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'scorecard'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Scorecard
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition border border-slate-200 dark:border-slate-700"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-grow space-y-6">

          {viewMode === 'tasks' ? (
            <>
              {/* 1. Quick Filter Status Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                
                {/* ALL */}
                <button
                  type="button"
                  onClick={() => setActiveTab('ALL')}
                  className={`p-3.5 rounded-2xl border text-left transition ${
                    activeTab === 'ALL'
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      All Tasks
                    </span>
                    <Layers className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {allTasks.length}
                  </div>
                </button>

                {/* OVERDUE */}
                <button
                  type="button"
                  onClick={() => setActiveTab('OVERDUE')}
                  className={`p-3.5 rounded-2xl border text-left transition ${
                    activeTab === 'OVERDUE'
                      ? 'bg-red-50/80 dark:bg-red-950/40 border-red-300 dark:border-red-700 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                      Overdue
                    </span>
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">
                    {overdueCount}
                  </div>
                </button>

                {/* IN PROGRESS */}
                <button
                  type="button"
                  onClick={() => setActiveTab('IN_PROGRESS')}
                  className={`p-3.5 rounded-2xl border text-left transition ${
                    activeTab === 'IN_PROGRESS'
                      ? 'bg-orange-50/80 dark:bg-orange-950/40 border-orange-300 dark:border-orange-700 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                      In Progress
                    </span>
                    <Clock className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-1">
                    {inProgressCount}
                  </div>
                </button>

                {/* COMPLETED */}
                <button
                  type="button"
                  onClick={() => setActiveTab('COMPLETED')}
                  className={`p-3.5 rounded-2xl border text-left transition ${
                    activeTab === 'COMPLETED'
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Completed
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {completedCount}
                  </div>
                </button>

              </div>

              {/* 2. Filter Bar, Search Box & Transfer Action */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0">
                    <Filter className="w-3.5 h-3.5 text-indigo-500" />
                    Type:
                  </span>
                  <select
                    value={taskTypeFilter}
                    onChange={(e) => setTaskTypeFilter(e.target.value)}
                    className="p-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="ALL">All Task Types</option>
                    <option value="Client Task">Client Tasks</option>
                    <option value="Delivery">Deliveries (Reels / Posts)</option>
                    <option value="Internal Task">Internal Duties</option>
                  </select>
                </div>

                <div className="flex items-center gap-2.5 flex-grow max-w-lg">
                  <div className="relative flex-grow">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={`Search ${employee.name}'s tasks by client, title, ID...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Bulk Transfer Button */}
                  <button
                    type="button"
                    disabled={filteredTasks.length === 0}
                    onClick={() => handleOpenTransferModal(null)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs shrink-0 cursor-pointer ${
                      filteredTasks.length === 0
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white active:scale-95'
                    }`}
                    title={`Transfer all ${filteredTasks.length} filtered tasks to another staff member`}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Transfer Filtered</span> ({filteredTasks.length})
                  </button>
                </div>
              </div>

              {/* 3. Filtered Tasks Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="min-w-[750px] w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider">
                        <th className="p-3.5 pl-5">Task Details</th>
                        <th className="p-3.5">Client</th>
                        <th className="p-3.5 text-center">Type</th>
                        <th className="p-3.5 text-center">Due Date</th>
                        <th className="p-3.5 text-center">Priority</th>
                        <th className="p-3.5 text-center">Status</th>
                        <th className="p-3.5 pr-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredTasks.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                            No tasks found matching the filter criteria for {employee.name}.
                          </td>
                        </tr>
                      ) : (
                        filteredTasks.map((t, idx) => {
                          const isDone = t.status === 'Completed' || t.status === 'Delivered';
                          const isOverdue = t.status === 'Overdue';

                          return (
                            <tr key={`${t.id || t.taskId || 'task'}-${idx}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                              
                              {/* Task Title & ID */}
                              <td className="p-3.5 pl-5">
                                <div className="font-extrabold text-slate-900 dark:text-white text-xs">
                                  {t.title}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono">{t.taskId}</span>
                                  {t.category && <span>• {t.category}</span>}
                                </div>
                              </td>

                              {/* Client */}
                              <td className="p-3.5">
                                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                  {t.client}
                                </span>
                              </td>

                              {/* Type */}
                              <td className="p-3.5 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                  t.type === 'Client Task'
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                                    : t.type === 'Delivery'
                                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}>
                                  {t.type}
                                </span>
                              </td>

                              {/* Due Date */}
                              <td className="p-3.5 text-center">
                                <div className={`inline-flex items-center gap-1 text-xs font-bold ${
                                  isOverdue ? 'text-red-600 dark:text-red-400 font-extrabold' : 'text-slate-600 dark:text-slate-400'
                                }`}>
                                  <Calendar className="w-3 h-3" />
                                  {t.date || 'No Date'}
                                </div>
                              </td>

                              {/* Priority */}
                              <td className="p-3.5 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  t.priority === 'Urgent' || t.priority === 'High'
                                    ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}>
                                  {t.priority || 'Normal'}
                                </span>
                              </td>

                              {/* Status Badge */}
                              <td className="p-3.5 text-center">
                                <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black border ${
                                  isDone
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                                    : isOverdue
                                    ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800'
                                    : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800'
                                }`}>
                                  {t.status}
                                </span>
                              </td>

                              {/* Actions: Work Sample + Transfer Button */}
                              <td className="p-3.5 pr-5 text-right">
                                <div className="inline-flex items-center justify-end gap-2">
                                  {t.workSampleUrl && (
                                    <a
                                      href={t.workSampleUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline mr-1"
                                      title="View Work Sample"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenTransferModal(t)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 transition cursor-pointer shadow-2xs active:scale-95"
                                    title={`Transfer this task from ${employee.name} to another staff member`}
                                  >
                                    <ArrowRightLeft className="w-3 h-3 text-indigo-500" />
                                    Transfer
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
            </>
          ) : (
            /* Scorecard View */
            <div className="space-y-6">
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800/80">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-extrabold text-sm mb-1">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  Scorecard Calculation Formula
                </div>
                <p className="text-xs text-indigo-700 dark:text-indigo-400 leading-relaxed font-medium">
                  The composite score of <strong>{employee.compositeScore}/100</strong> is weighted from four core performance pillars:
                  On-Time Delivery (40%), Task Volume (30%), Attendance & Punctuality (15%), and Quality/Client Approvals (15%).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. On-Time Delivery */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      1. On-Time Delivery (40% Weight)
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {employee.onTimeRate}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${employee.onTimeRate}%` }}></div>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    {employee.completedOnTime} completed on schedule vs {employee.completedLate} delivered late.
                  </div>
                </div>

                {/* 2. Volume Completion */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      2. Volume Completion (30% Weight)
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {employee.completionRate}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${employee.completionRate}%` }}></div>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    {employee.completedTasks} completed out of {employee.totalAssigned} assigned work items.
                  </div>
                </div>

                {/* 3. Attendance */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      3. Attendance & Reliability (15% Weight)
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {employee.attendanceScore}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${employee.attendanceScore}%` }}></div>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    {employee.presentDays} active present days recorded in this timeframe.
                  </div>
                </div>

                {/* 4. Quality */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-500" />
                      4. Quality & Approvals (15% Weight)
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {employee.qualityScore}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${employee.qualityScore}%` }}></div>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    Calculated from client concerns, revision rates, and ratings.
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/70 shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing {filteredTasks.length} of {allTasks.length} total tasks for <span className="font-bold text-slate-700 dark:text-slate-200">{employee.name}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-sm"
          >
            Close
          </button>
        </div>

      </div>

      {/* Pop-up Transfer Task Dialog */}
      {transferModalOpen && (
        <div
          className="fixed inset-0 z-[1000000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isTransferring) {
              setTransferModalOpen(false);
              setTaskToTransfer(null);
            }
          }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
            
            {/* Transfer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    {taskToTransfer ? 'Transfer Single Task' : `Bulk Transfer Tasks (${filteredTasks.length})`}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Reassign from <span className="font-bold text-slate-700 dark:text-slate-200">{employee.name}</span> to another employee or TL
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isTransferring}
                onClick={() => {
                  setTransferModalOpen(false);
                  setTaskToTransfer(null);
                }}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Task Summary Box */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs shrink-0">
              {taskToTransfer ? (
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                    {taskToTransfer.title}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] flex-wrap">
                    <span>Client: <strong className="text-slate-700 dark:text-slate-200">{taskToTransfer.client}</strong></span>
                    <span>•</span>
                    <span>ID: <strong className="font-mono">{taskToTransfer.taskId}</strong></span>
                    <span>•</span>
                    <span>Due: <strong>{taskToTransfer.date || 'N/A'}</strong></span>
                  </div>
                </div>
              ) : (
                <div className="font-bold text-indigo-600 dark:text-indigo-400">
                  Transferring all {filteredTasks.length} currently filtered tasks of {employee.name}
                </div>
              )}
            </div>

            {/* Staff Search Box */}
            <div className="mt-4 relative shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff by name, role, department..."
                value={staffSearchQuery}
                onChange={(e) => setStaffSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Staff Selection List */}
            <div className="mt-3 overflow-y-auto flex-grow max-h-[260px] space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800/40">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Choose New Staff Member ({filteredStaffList.length}):
              </div>
              {filteredStaffList.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 font-medium">
                  No staff members match the search.
                </div>
              ) : (
                filteredStaffList.map((staff) => {
                  const isSelected = selectedStaff?.id === staff.id;
                  return (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => setSelectedStaff(staff)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {staff.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {staff.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {staff.department || 'Staff'} {staff.designation ? `• ${staff.designation}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {staff.role}
                        </span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Feedback Message */}
            {transferFeedback && (
              <div className={`mt-3 p-3 rounded-xl text-xs font-bold shrink-0 ${
                transferFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800'
              }`}>
                {transferFeedback.message}
              </div>
            )}

            {/* Modal Actions */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                disabled={isTransferring}
                onClick={() => {
                  setTransferModalOpen(false);
                  setTaskToTransfer(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedStaff || isTransferring}
                onClick={handleConfirmTransfer}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
                  !selectedStaff || isTransferring
                    ? 'bg-indigo-300 dark:bg-indigo-900/50 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                }`}
              >
                {isTransferring ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    {selectedStaff ? `Transfer to ${selectedStaff.name}` : 'Choose Staff'}
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>,
    document.body
  );
}
