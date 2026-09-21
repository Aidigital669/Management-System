'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Calendar,
  Filter,
  User,
  PhoneCall,
  MessageCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  CalendarDays,
  Tag,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

/**
 * Parses raw notes into individual remark entries.
 * Handles single-line, multi-line, and timestamped remarks.
 */
function parseRemarksFromCall(call) {
  const entries = [];
  const rawNotes = call.notes || '';
  const baseDate = call.followUpDate ? new Date(call.followUpDate) : new Date(call.callDate || Date.now());

  if (!rawNotes.trim()) {
    // If no notes, create a single registration log
    entries.push({
      id: `${call.id}-init`,
      callId: call.id,
      clientName: call.clientName,
      phoneNumber: call.phoneNumber,
      status: call.status,
      salesPerson: call.salesPerson || { id: call.salesPersonId, name: 'Sales Executive' },
      date: isNaN(baseDate.getTime()) ? new Date() : baseDate,
      timeStr: isNaN(baseDate.getTime()) ? 'N/A' : baseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
      classification: null,
      updateStatus: null,
      packageName: call.packageName || null,
      expectedValue: call.expectedValue || null,
      expectedClosingDate: call.expectedClosingDate || null,
      followUpDate: call.followUpDate || null,
      remarkText: 'Lead registered in system (No remarks noted).',
      isSystemLog: true
    });
    return entries;
  }

  // Split by newlines
  const lines = rawNotes.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  lines.forEach((line, index) => {
    let dateObj = isNaN(baseDate.getTime()) ? new Date() : new Date(baseDate);
    let timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    // Check for explicit timestamp: e.g. [21-Sep-2026, 03:45 PM] or [15-Sept-2026 06:33 PM] or [2026-09-15 14:00]
    const tsMatch = line.match(/^\[([0-9]{1,2}[- /][A-Za-z0-9]+[- /][0-9]{2,4}(?:,\s*|\s+)[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?(?:\s*[APap][Mm])?)\]/);
    if (tsMatch) {
      const parsedDate = new Date(tsMatch[1].replace(/-/g, ' '));
      if (!isNaN(parsedDate.getTime())) {
        dateObj = parsedDate;
        timeStr = parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      }
    }

    // Extract metadata tags
    const classMatch = line.match(/\[Classification:\s*([^\]]+)\]/i);
    const updateMatch = line.match(/\[Update:\s*([^\]]+)\]/i);
    const pkgMatch = line.match(/\[Package:\s*([^\]]+)\]/i);
    const amountMatch = line.match(/\[Amount:\s*([^\]]+)\]/i);
    const closingMatch = line.match(/\[Expected Closing:\s*([^\]]+)\]/i);
    const interestedMatch = line.match(/\[Interested:\s*([^\]]+)\]/i);

    // Clean remark text by removing the parsed tags
    let cleanText = line
      .replace(/^\[[0-9]{1,2}[- /][A-Za-z0-9]+[- /][0-9]{2,4}(?:,\s*|\s+)[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?(?:\s*[APap][Mm])?\]\s*/, '')
      .replace(/\[Classification:\s*[^\]]+\]\s*/gi, '')
      .replace(/\[Update:\s*[^\]]+\]\s*/gi, '')
      .replace(/\[Package:\s*[^\]]+\]\s*/gi, '')
      .replace(/\[Amount:\s*[^\]]+\]\s*/gi, '')
      .replace(/\[Expected Closing:\s*[^\]]+\]\s*/gi, '')
      .replace(/\[Interested:\s*[^\]]+\]\s*/gi, '')
      .trim();

    if (!cleanText && (classMatch || updateMatch || pkgMatch)) {
      cleanText = `${classMatch ? classMatch[1] : ''} ${updateMatch ? '- ' + updateMatch[1] : ''}`.trim();
    }

    entries.push({
      id: `${call.id}-${index}`,
      callId: call.id,
      clientName: call.clientName,
      phoneNumber: call.phoneNumber,
      status: call.status,
      salesPerson: call.salesPerson || { id: call.salesPersonId, name: 'Sales Executive' },
      date: dateObj,
      timeStr,
      classification: classMatch ? classMatch[1].trim() : null,
      updateStatus: updateMatch ? updateMatch[1].trim() : null,
      packageName: pkgMatch ? pkgMatch[1].trim() : call.packageName,
      expectedValue: amountMatch ? amountMatch[1].replace(/[₹,]/g, '').trim() : call.expectedValue,
      expectedClosingDate: closingMatch ? closingMatch[1].trim() : call.expectedClosingDate,
      interestedIn: interestedMatch ? interestedMatch[1].trim() : null,
      followUpDate: call.followUpDate || null,
      remarkText: cleanText || line,
      rawLine: line
    });
  });

  return entries;
}

export default function RemarksHistoryTimeline({
  calls = [],
  currentUser = null,
  isAdmin = false,
  salesUsers = [],
  initialLeadFilter = '',
  onClearLeadFilter = null,
  onViewLead = null
}) {
  const [searchQuery, setSearchQuery] = useState(initialLeadFilter || '');
  const [selectedSeller, setSelectedSeller] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL', 'TODAY', 'YESTERDAY', 'THIS_WEEK', 'THIS_MONTH', 'CUSTOM'
  const [customDate, setCustomDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // If initialLeadFilter changes from parent
  React.useEffect(() => {
    if (initialLeadFilter) {
      setSearchQuery(initialLeadFilter);
    }
  }, [initialLeadFilter]);

  // Parse all calls into remarks
  const allRemarks = useMemo(() => {
    const list = [];
    calls.forEach(c => {
      const parsed = parseRemarksFromCall(c);
      list.push(...parsed);
    });
    // Sort descending by date
    list.sort((a, b) => b.date.getTime() - a.date.getTime());
    return list;
  }, [calls]);

  // Extract unique sales persons from calls or salesUsers
  const sellersList = useMemo(() => {
    if (salesUsers && salesUsers.length > 0) {
      return salesUsers.map(u => ({ id: u.id, name: u.name, avatar: u.avatar || '👤' }));
    }
    const map = new Map();
    calls.forEach(c => {
      if (c.salesPerson) {
        map.set(c.salesPerson.id, {
          id: c.salesPerson.id,
          name: c.salesPerson.name,
          avatar: c.salesPerson.avatar || '👤'
        });
      } else if (c.salesPersonId) {
        map.set(c.salesPersonId, {
          id: c.salesPersonId,
          name: `Staff #${c.salesPersonId}`,
          avatar: '👤'
        });
      }
    });
    return Array.from(map.values());
  }, [calls, salesUsers]);

  // Filter remarks
  const filteredRemarks = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    // 7 days ago
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Start of month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    return allRemarks.filter(item => {
      // 1. Sales person filter (if Admin)
      if (isAdmin && selectedSeller !== 'ALL') {
        const sellerId = item.salesPerson?.id || item.salesPersonId;
        if (String(sellerId) !== String(selectedSeller) && item.salesPerson?.name !== selectedSeller) {
          return false;
        }
      }

      // 2. Status filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }

      // 3. Search query (client name, phone number, or remark text)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const clientMatch = item.clientName?.toLowerCase().includes(q);
        const phoneMatch = item.phoneNumber?.toLowerCase().includes(q);
        const textMatch = item.remarkText?.toLowerCase().includes(q);
        const sellerMatch = item.salesPerson?.name?.toLowerCase().includes(q);
        const pkgMatch = item.packageName?.toLowerCase().includes(q);
        if (!clientMatch && !phoneMatch && !textMatch && !sellerMatch && !pkgMatch) {
          return false;
        }
      }

      // 4. Date filter
      const itemDateStr = item.date.toISOString().slice(0, 10);
      if (dateFilter === 'TODAY') {
        return itemDateStr === todayStr;
      }
      if (dateFilter === 'YESTERDAY') {
        return itemDateStr === yesterdayStr;
      }
      if (dateFilter === 'THIS_WEEK') {
        return item.date >= weekAgo;
      }
      if (dateFilter === 'THIS_MONTH') {
        return item.date >= startOfMonth;
      }
      if (dateFilter === 'CUSTOM') {
        if (!customDate) return true;
        return itemDateStr === customDate;
      }

      return true;
    });
  }, [allRemarks, isAdmin, selectedSeller, statusFilter, searchQuery, dateFilter, customDate]);

  // Group filtered remarks by day
  const groupedRemarks = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const groups = {};

    filteredRemarks.forEach(r => {
      const dateKey = r.date.toISOString().slice(0, 10);
      if (!groups[dateKey]) {
        let label = r.date.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        if (dateKey === today) label = `Today (${label})`;
        else if (dateKey === yesterday) label = `Yesterday (${label})`;

        groups[dateKey] = {
          dateKey,
          label,
          dateObj: r.date,
          items: []
        };
      }
      groups[dateKey].items.push(r);
    });

    return Object.values(groups).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  }, [filteredRemarks]);

  // Metrics summary
  const metrics = useMemo(() => {
    const totalCount = filteredRemarks.length;
    const uniqueLeads = new Set(filteredRemarks.map(r => r.callId)).size;
    const convertedCount = filteredRemarks.filter(r => r.status === 'ANSWERED' || r.classification === 'Hot Lead').length;
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCount = filteredRemarks.filter(r => r.date.toISOString().slice(0, 10) === todayStr).length;

    return { totalCount, uniqueLeads, convertedCount, todayCount };
  }, [filteredRemarks]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSeller('ALL');
    setDateFilter('ALL');
    setCustomDate('');
    setStatusFilter('ALL');
    if (onClearLeadFilter) onClearLeadFilter();
  };

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
              <Clock className="w-3.5 h-3.5" />
              {isAdmin ? 'Admin View: Sales Person Remarks' : 'Day-by-Day Remarks History'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {isAdmin ? 'Sales Executive Remarks History' : 'My Remarks & Follow-up History'}
            </h2>
            <p className="text-blue-100 text-sm mt-1 max-w-xl">
              {isAdmin
                ? 'Track day-by-day sales interactions, follow-ups, and lead progression per sales executive.'
                : 'Browse all your past interactions, follow-up remarks, and conversion logs grouped day by day.'}
            </p>
          </div>

          {/* Quick Stat Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex flex-col">
              <span className="text-xs text-blue-200 font-semibold">Total Remarks</span>
              <span className="text-2xl font-black mt-0.5">{metrics.totalCount}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex flex-col">
              <span className="text-xs text-blue-200 font-semibold">Unique Leads</span>
              <span className="text-2xl font-black mt-0.5">{metrics.uniqueLeads}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex flex-col">
              <span className="text-xs text-blue-200 font-semibold">Today&apos;s Logs</span>
              <span className="text-2xl font-black mt-0.5 text-emerald-300">{metrics.todayCount}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex flex-col">
              <span className="text-xs text-blue-200 font-semibold">Hot / Converted</span>
              <span className="text-2xl font-black mt-0.5 text-amber-300">{metrics.convertedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Lead Filter Banner */}
      {searchQuery && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-3.5 px-5 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-medium">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              Filtered for: <strong className="font-extrabold text-blue-700 dark:text-blue-200">&ldquo;{searchQuery}&rdquo;</strong>
            </span>
            <span className="text-xs bg-blue-200/70 dark:bg-blue-900/80 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
              {filteredRemarks.length} entries found
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 transition shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Reset Filter
          </button>
        </div>
      )}

      {/* Control Bar: Filters & Search */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className={`relative ${isAdmin ? 'md:col-span-4' : 'md:col-span-5'}`}>
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by client, phone, or remark..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Admin Sales Person Filter Dropdown */}
          {isAdmin && (
            <div className="relative md:col-span-3">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedSeller}
                onChange={e => setSelectedSeller(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium appearance-none cursor-pointer"
              >
                <option value="ALL">All Sales Executives ({sellersList.length})</option>
                {sellersList.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}

          {/* Status Filter */}
          <div className="relative md:col-span-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium appearance-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="INTERESTED">Hot / Interested</option>
              <option value="ANSWERED">Converted Deal</option>
              <option value="CALLBACK">Follow-up Needed</option>
              <option value="PENDING">Pending / New</option>
              <option value="NOT_INTERESTED">Not Interested</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Date Range Chips */}
          <div className={`flex flex-wrap items-center gap-1.5 ${isAdmin ? 'md:col-span-3' : 'md:col-span-5'}`}>
            {[
              { key: 'ALL', label: 'All' },
              { key: 'TODAY', label: 'Today' },
              { key: 'YESTERDAY', label: 'Yesterday' },
              { key: 'THIS_WEEK', label: '7 Days' },
              { key: 'CUSTOM', label: 'Pick Day' }
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setDateFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dateFilter === tab.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}

            {dateFilter === 'CUSTOM' && (
              <input
                type="date"
                value={customDate}
                onChange={e => setCustomDate(e.target.value)}
                className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
              />
            )}
          </div>
        </div>
      </div>

      {/* Day-by-Day Grouped Feed */}
      {groupedRemarks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">No Remarks Found</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-md">
            No remarks match your current filters. Try changing the sales executive, clearing search terms, or selecting &ldquo;All Time&rdquo;.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition"
          >
            Clear Filters & Show All
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedRemarks.map(group => (
            <div key={group.dateKey} className="space-y-3">
              {/* Day Header with Sticky Badge */}
              <div className="sticky top-16 z-10 flex items-center gap-3 bg-slate-100/90 dark:bg-slate-950/90 backdrop-blur-md py-2 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-wide">
                  {group.label}
                </h3>
                <span className="ml-auto text-xs font-bold text-slate-500 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-2xs">
                  {group.items.length} {group.items.length === 1 ? 'remark' : 'remarks'}
                </span>
              </div>

              {/* Remarks Cards Grid/List */}
              <div className="grid grid-cols-1 gap-3">
                {group.items.map(item => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-400/50 dark:hover:border-blue-500/40 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-3 group"
                  >
                    {/* Card Header: Lead Info, Timestamp, Badges */}
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                          {item.clientName?.charAt(0) || 'L'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 dark:text-white text-base hover:text-blue-600 transition">
                              {item.clientName}
                            </h4>

                            {/* Status Badge */}
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                                item.status === 'ANSWERED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : item.status === 'INTERESTED'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  : item.status === 'CALLBACK'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {item.status === 'ANSWERED'
                                ? 'Converted'
                                : item.status === 'INTERESTED'
                                ? 'Hot Lead'
                                : item.status === 'CALLBACK'
                                ? 'Follow-up'
                                : item.status}
                            </span>

                            {item.classification && (
                              <span className="text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                                {item.classification}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span className="font-mono font-medium">{item.phoneNumber}</span>
                            {item.salesPerson && (
                              <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px]">
                                <User className="w-3 h-3 text-blue-500" />
                                {item.salesPerson.name || 'Sales Staff'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Action Icons & Time */}
                      <div className="flex items-center gap-2">
                        <div className="text-right flex flex-col items-end mr-2">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-500" />
                            {item.timeStr}
                          </span>
                          {item.followUpDate && (
                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              Next: {new Date(item.followUpDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>

                        {/* Quick Action Buttons */}
                        <a
                          href={`tel:${item.phoneNumber}`}
                          className="w-8 h-8 rounded-full border border-blue-200 dark:border-blue-800 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center justify-center transition shadow-2xs"
                          title="Call Lead"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/${item.phoneNumber.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full border border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 flex items-center justify-center transition shadow-2xs"
                          title="WhatsApp Chat"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Deal / Package Info Highlight if Present */}
                    {(item.packageName || (item.expectedValue && Number(item.expectedValue) > 0)) && (
                      <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-2.5 px-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                            <span>📦</span> {item.packageName || 'Confirmed Deal'}
                          </span>
                          {item.expectedValue && (
                            <span className="font-black text-emerald-700 dark:text-emerald-400 bg-white dark:bg-emerald-900/60 px-2 py-0.5 rounded-md shadow-2xs">
                              ₹{Number(item.expectedValue).toLocaleString()}
                            </span>
                          )}
                        </div>
                        {item.expectedClosingDate && (
                          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            Target Payment: {new Date(item.expectedClosingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Main Remark Body */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                      <p className="whitespace-pre-line">{item.remarkText}</p>
                    </div>

                    {/* Footer Tags */}
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2 pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.updateStatus && (
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 font-medium">
                            Update: {item.updateStatus}
                          </span>
                        )}
                        {item.interestedIn && (
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 font-medium">
                            Interested: {item.interestedIn}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Lead ID: #{item.callId}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
