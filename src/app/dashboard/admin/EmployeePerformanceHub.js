'use client';

import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Search,
  Filter,
  Users,
  ChevronRight,
  TrendingUp,
  X,
  ExternalLink,
  Calendar,
  Sparkles,
  ShieldCheck,
  Zap,
  Star
} from 'lucide-react';
import {
  ROLE_CATEGORIES,
  ROLE_LABELS,
  calculateEmployeePerformance
} from '@/lib/performanceUtils';
import EmployeeTasksModal from './EmployeeTasksModal';

export default function EmployeePerformanceHub({
  employees = [],
  clientTasks = [],
  clientDeliveries = [],
  internalTasks = [],
  attendanceLogs = [],
  feedbacks = []
}) {
  const [selectedRole, setSelectedRole] = useState(ROLE_CATEGORIES.ALL);
  const [timeRange, setTimeRange] = useState('this_month');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEmployeeModal, setActiveEmployeeModal] = useState(null);

  // Calculate dynamic performance metrics
  const performanceResult = useMemo(() => {
    return calculateEmployeePerformance({
      employees,
      clientTasks,
      clientDeliveries,
      internalTasks,
      attendanceLogs,
      feedbacks,
      timeRange
    });
  }, [employees, clientTasks, clientDeliveries, internalTasks, attendanceLogs, feedbacks, timeRange]);

  const { employees: allRankedEmployees, summary } = performanceResult;

  // Filter by role and search query
  const filteredEmployees = useMemo(() => {
    return allRankedEmployees.filter(emp => {
      // Role filter
      if (selectedRole !== ROLE_CATEGORIES.ALL && emp.roleCategory !== selectedRole) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = emp.name.toLowerCase().includes(query);
        const matchesDept = emp.department.toLowerCase().includes(query);
        const matchesDesig = emp.designation.toLowerCase().includes(query);
        if (!matchesName && !matchesDept && !matchesDesig) return false;
      }
      return true;
    });
  }, [allRankedEmployees, selectedRole, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* 1. Header & Summary Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-indigo-900/50 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-16 w-60 h-60 rounded-full bg-blue-500/10 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Productivity & Accountability Engine
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Employee Performance Hub
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-medium">
              Multi-pillar performance evaluation tracking on-time delivery rates, output efficiency, attendance punctuality, and client approval quality.
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/60 self-start lg:self-auto shadow-inner">
            <span className="text-xs font-bold text-slate-400 px-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Period:
            </span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="this_month">This Month</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="last_month">Last Month</option>
              <option value="all_time">All Time</option>
            </select>
          </div>
        </div>

        {/* Top Summary Metrics Row */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Team Performance Index */}
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Team Score</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">{summary.teamAverageScore}</span>
                <span className="text-xs text-slate-400 font-bold">/100</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Trophy className="w-5 h-5" />
            </div>
          </div>

          {/* On-Time Delivery Rate */}
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">On-Time Rate</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-400">{summary.teamOnTimeRate}%</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Overdue Tasks Alert */}
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Overdue Deliverables</span>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black ${summary.totalOverdueTasksAcrossTeam > 0 ? 'text-red-400' : 'text-slate-200'}`}>
                  {summary.totalOverdueTasksAcrossTeam}
                </span>
                {summary.totalOverdueTasksAcrossTeam > 0 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse">
                    Action Needed
                  </span>
                )}
              </div>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              summary.totalOverdueTasksAcrossTeam > 0 
                ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                : 'bg-slate-700/30 text-slate-400 border-slate-700/50'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          {/* Top Performer Spotlight */}
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50 flex items-center justify-between">
            <div className="space-y-1 overflow-hidden">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400" /> Star Performer
              </span>
              <p className="text-sm font-black text-white truncate">
                {summary.topPerformer ? summary.topPerformer.name : 'N/A'}
              </p>
              <span className="text-[10px] font-bold text-slate-400">
                Score: {summary.topPerformer ? `${summary.topPerformer.compositeScore}/100` : '-'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 flex-shrink-0">
              <Flame className="w-5 h-5 fill-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Department Category Filter Chips & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        
        {/* Role Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {[
            { id: ROLE_CATEGORIES.ALL, label: 'All Departments' },
            { id: ROLE_CATEGORIES.AI_VIDEO, label: 'AI Video Editors' },
            { id: ROLE_CATEGORIES.GRAPHICS, label: 'Graphic Designers' },
            { id: ROLE_CATEGORIES.SOCIAL_MEDIA, label: 'Social Media Execs' },
            { id: ROLE_CATEGORIES.SALES, label: 'Sales Reps' }
          ].map((tab) => {
            const isActive = selectedRole === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedRole(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Box */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* 3. Performance Leaderboard Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-850/40">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-500" />
              Staff Performance Leaderboard
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Ranked by composite score calculated from On-Time Delivery, Work Volume, Attendance, and Client Quality.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {filteredEmployees.length} Staff Member{filteredEmployees.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-800/50 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider">
                <th className="p-4 pl-6 w-16 text-center">Rank</th>
                <th className="p-4">Employee</th>
                <th className="p-4 text-center">Performance Score</th>
                <th className="p-4 text-center">On-Time Rate</th>
                <th className="p-4 text-center">Tasks Done / Total</th>
                <th className="p-4 text-center">Overdue</th>
                <th className="p-4 text-center">Attendance</th>
                <th className="p-4 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    No employees match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, idx) => {
                  const isTop3 = emp.rank <= 3;
                  return (
                    <tr
                      key={emp.id ? `emp-${emp.id}-${idx}` : `emp-${emp.name}-${idx}`}
                      onClick={() => setActiveEmployeeModal(emp)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition cursor-pointer group"
                    >
                      {/* Rank */}
                      <td className="p-4 pl-6 text-center">
                        <div className="inline-flex items-center justify-center">
                          {emp.rank === 1 && (
                            <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-black text-xs border border-amber-300 dark:border-amber-700 flex items-center justify-center shadow-sm">
                              🥇
                            </div>
                          )}
                          {emp.rank === 2 && (
                            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-xs border border-slate-300 dark:border-slate-600 flex items-center justify-center shadow-sm">
                              🥈
                            </div>
                          )}
                          {emp.rank === 3 && (
                            <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-black text-xs border border-orange-300 dark:border-orange-700 flex items-center justify-center shadow-sm">
                              🥉
                            </div>
                          )}
                          {emp.rank > 3 && (
                            <span className="text-xs font-extrabold text-slate-400">
                              #{emp.rank}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Employee Info */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/60 dark:to-purple-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-black border border-indigo-200 dark:border-indigo-800 flex-shrink-0">
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                              {emp.name}
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${emp.tier.badgeColor}`}>
                                {emp.tier.badge}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {emp.designation} • <span className="text-indigo-500 dark:text-indigo-400">{emp.department}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Composite Performance Score */}
                      <td className="p-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <div className="flex items-baseline gap-1">
                            <span className="text-base font-black text-slate-900 dark:text-white">
                              {emp.compositeScore}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">/100</span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="w-20 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`${emp.tier.progressColor} h-1.5 rounded-full transition-all duration-500`}
                              style={{ width: `${emp.compositeScore}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* On-Time Rate */}
                      <td className="p-4 text-center">
                        <span className={`inline-block font-extrabold text-xs px-2.5 py-1 rounded-lg ${
                          emp.onTimeRate >= 85
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                            : emp.onTimeRate >= 70
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
                            : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                        }`}>
                          {emp.onTimeRate}%
                        </span>
                      </td>

                      {/* Completed / Total */}
                      <td className="p-4 text-center">
                        <div className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                          <span className="text-emerald-600 dark:text-emerald-400 font-black">{emp.completedCount}</span>
                          <span className="text-slate-400 mx-1">/</span>
                          <span>{emp.totalAssigned}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {emp.completionRate}% completion
                        </div>
                      </td>

                      {/* Overdue Count */}
                      <td className="p-4 text-center">
                        {emp.overdueCount > 0 ? (
                          <span className="inline-block px-2.5 py-1 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 font-extrabold text-xs rounded-lg border border-red-200 dark:border-red-900/50">
                            {emp.overdueCount} Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                            <ShieldCheck className="w-3.5 h-3.5" /> 0
                          </span>
                        )}
                      </td>

                      {/* Attendance */}
                      <td className="p-4 text-center">
                        <span className="font-extrabold text-xs text-slate-700 dark:text-slate-300">
                          {emp.attendanceScore}%
                        </span>
                      </td>

                      {/* View Action */}
                      <td className="p-4 pr-6 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveEmployeeModal(emp);
                          }}
                          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition inline-flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                        >
                          Breakdown
                          <ChevronRight className="w-3 h-3" />
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

      {/* 4. Filtered Tasks & Performance Modal for Selected Employee */}
      {activeEmployeeModal && (
        <EmployeeTasksModal
          employee={activeEmployeeModal}
          onClose={() => setActiveEmployeeModal(null)}
        />
      )}

    </div>
  );
}
