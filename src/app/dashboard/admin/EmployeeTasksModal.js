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
  Sparkles
} from 'lucide-react';

export default function EmployeeTasksModal({ employee, onClose }) {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'OVERDUE' | 'IN_PROGRESS' | 'COMPLETED'
  const [taskTypeFilter, setTaskTypeFilter] = useState('ALL'); // 'ALL' | 'Client Task' | 'Delivery' | 'Internal Task'
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('tasks'); // 'tasks' | 'scorecard'
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const allTasks = employee?.allTasksList || [];

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

  const overdueCount = allTasks.filter(t => t.status === 'Overdue').length;
  const completedCount = allTasks.filter(t => t.status === 'Completed' || t.status === 'Delivered').length;
  const inProgressCount = allTasks.length - overdueCount - completedCount;

  // Unconditional render guard placed AFTER all hooks have executed
  if (!employee || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      style={{ zIndex: 999999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Total Tasks
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
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-500">
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
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-500">
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
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Completed
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {completedCount}
                  </div>
                </button>

              </div>

              {/* 2. Filter Bar & Search Box */}
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

                <div className="relative flex-grow max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={`Search ${employee.name}'s tasks by client, title, ID...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* 3. Filtered Tasks Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="min-w-[700px] w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider">
                        <th className="p-3.5 pl-5">Task Details</th>
                        <th className="p-3.5">Client</th>
                        <th className="p-3.5 text-center">Type</th>
                        <th className="p-3.5 text-center">Due Date</th>
                        <th className="p-3.5 text-center">Priority</th>
                        <th className="p-3.5 text-center">Status</th>
                        <th className="p-3.5 pr-5 text-right">Work Sample</th>
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

                              {/* Work Sample / External Link */}
                              <td className="p-3.5 pr-5 text-right">
                                {t.workSampleUrl ? (
                                  <a
                                    href={t.workSampleUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                                  >
                                    View Work
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="text-[11px] text-slate-400">-</span>
                                )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. Timeliness */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      1. On-Time Delivery Rate (40% Weight)
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {employee.onTimeRate}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${employee.onTimeRate}%` }}></div>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    Completed On-Time: {employee.completedOnTime} | Overdue Penalty: -{employee.overdueCount * 5}%
                  </div>
                </div>

                {/* 2. Completion */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      2. Completion & Volume (30% Weight)
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {employee.completionRate}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${employee.completionRate}%` }}></div>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    Finished {employee.completedCount} out of {employee.totalAssigned} deliverables.
                  </div>
                </div>

                {/* 3. Attendance */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-amber-500" />
                      3. Attendance & Punctuality (15% Weight)
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {employee.attendanceScore}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
                    <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${employee.attendanceScore}%` }}></div>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    Present: {employee.attendanceSummary?.presentDays || 0} days | Late: {employee.attendanceSummary?.lateDays || 0}
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
    </div>,
    document.body
  );
}

