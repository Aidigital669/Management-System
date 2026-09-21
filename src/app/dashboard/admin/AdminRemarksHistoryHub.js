'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, History, Loader2, Users } from 'lucide-react';
import RemarksHistoryTimeline from '@/components/RemarksHistoryTimeline';

export default function AdminRemarksHistoryHub({
  usersList = [],
  refreshData = null,
  initialLeadFilter = ''
}) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/calls');
      const data = await res.json();
      if (res.ok) {
        setCalls(data.calls || []);
      } else {
        setError(data.error || 'Failed to fetch remarks and calls');
      }
    } catch (err) {
      console.error('Error fetching calls for remarks history:', err);
      setError('Connection error loading remarks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const salesUsers = usersList.filter(u => u.role === 'SALES' || u.department === 'Sales');

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top action header if refreshing */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Live Database Feed
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            fetchCalls();
            if (refreshData) refreshData();
          }}
          disabled={loading}
          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Remarks</span>
        </button>
      </div>

      {loading && calls.length === 0 ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Loading sales person remarks...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-6 rounded-2xl text-center">
          <p className="text-rose-600 dark:text-rose-400 font-semibold text-sm">{error}</p>
          <button
            type="button"
            onClick={fetchCalls}
            className="mt-3 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      ) : (
        <RemarksHistoryTimeline
          calls={calls}
          isAdmin={true}
          salesUsers={salesUsers}
          initialLeadFilter={initialLeadFilter}
        />
      )}
    </div>
  );
}
