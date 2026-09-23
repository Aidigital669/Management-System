'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, DollarSign, TrendingUp, RefreshCw, Download, FileText } from 'lucide-react';
import { getClientPlanInfo, parseDbDate } from '@/lib/planUtils';

export default function CollectionReportModal({ isOpen, onClose, onClientClick }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [calls, setCalls] = useState([]);
  const [clients, setClients] = useState([]);

  // Default dates to current month if not set
  useEffect(() => {
    if (isOpen && !startDate && !endDate) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const fetchData = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const [callsRes, clientsRes] = await Promise.all([
        fetch('/api/calls').then(res => res.json()),
        fetch('/api/clients').then(res => res.json())
      ]);

      if (callsRes.error) throw new Error(callsRes.error);
      if (clientsRes.error) throw new Error(clientsRes.error);

      setCalls(callsRes.calls || []);
      setClients(clientsRes.clients || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  const { expectedSales, expectedRenewals, totalCollection, salesList, renewalsList } = useMemo(() => {
    if (!startDate || !endDate || (!calls.length && !clients.length)) {
      return { expectedSales: 0, expectedRenewals: 0, totalCollection: 0, salesList: [], renewalsList: [] };
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // 1. Calculate Expected Sales
    const validSales = calls.filter(call => {
      if (call.status !== 'INTERESTED') return false; 
      if (!call.expectedClosingDate || !call.expectedValue) return false;
      
      const closingDate = new Date(call.expectedClosingDate);
      return closingDate >= start && closingDate <= end;
    });

    const totalSales = validSales.reduce((sum, call) => sum + (Number(call.expectedValue) || 0), 0);

    // 2. Calculate Expected Renewals
    const validRenewals = [];
    let totalRenewals = 0;

    clients.forEach(client => {
      if (!client.active) return;
      
      // Compute expiry/due date for the client
      const planInfo = getClientPlanInfo(client, new Date());
      if (planInfo.renewalDueDate) {
        const dueDate = new Date(planInfo.renewalDueDate);
        if (dueDate >= start && dueDate <= end) {
          validRenewals.push({
            ...client,
            computedExpiryDateStr: planInfo.renewalDueStr,
            expectedAmount: Number(client.packageAmount) || 0,
            isRenewed: planInfo.isRenewed,
            joiningDateStr: planInfo.cycleStartStr
          });
          totalRenewals += Number(client.packageAmount) || 0;
        }
      }
    });

    return {
      expectedSales: totalSales,
      expectedRenewals: totalRenewals,
      totalCollection: totalSales + totalRenewals,
      salesList: validSales,
      renewalsList: validRenewals
    };
  }, [startDate, endDate, calls, clients]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-indigo-500" />
              Future Collection Report
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Forecast total collection based on expected sales and upcoming renewals.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 shrink-0 flex flex-wrap items-end gap-4">
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Start Date</label>
            <div className="relative">
              <Calendar className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold dark:text-white"
              />
            </div>
          </div>
          
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">End Date</label>
            <div className="relative">
              <Calendar className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold dark:text-white"
              />
            </div>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 disabled:opacity-50 flex items-center gap-2 transition-all"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
            Generate Report
          </button>
        </div>

        {error && (
          <div className="p-4 mx-6 mt-6 bg-red-50 text-red-600 rounded-xl font-medium border border-red-100">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {calls.length > 0 || clients.length > 0 ? (
            <div className="space-y-8">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                  <div className="text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider mb-2">Expected Sales</div>
                  <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300">₹{expectedSales.toLocaleString()}</div>
                  <div className="text-sm font-medium text-emerald-600/70 dark:text-emerald-400/70 mt-1">{salesList.length} Hot Leads</div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-800">
                  <div className="text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-wider mb-2">Expected Renewals</div>
                  <div className="text-3xl font-black text-blue-700 dark:text-blue-300">₹{expectedRenewals.toLocaleString()}</div>
                  <div className="text-sm font-medium text-blue-600/70 dark:text-blue-400/70 mt-1">{renewalsList.length} Clients</div>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-800 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-500/10 rounded-full"></div>
                  <div className="text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider mb-2 relative z-10">Total Future Collection</div>
                  <div className="text-4xl font-black text-indigo-700 dark:text-indigo-300 relative z-10">₹{totalCollection.toLocaleString()}</div>
                  <div className="text-sm font-medium text-indigo-600/70 dark:text-indigo-400/70 mt-1 relative z-10">
                    Period: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Data Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Expected Sales Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      Expected Sales Details
                    </h3>
                  </div>
                  <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 backdrop-blur-md">
                        <tr>
                          <th className="p-3 font-semibold text-slate-500">Lead / Client</th>
                          <th className="p-3 font-semibold text-slate-500">Sales Person</th>
                          <th className="p-3 font-semibold text-slate-500">Closing Date</th>
                          <th className="p-3 font-semibold text-slate-500 text-right">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {salesList.map(lead => (
                          <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-slate-800 dark:text-white">{lead.clientName}</div>
                              <div className="text-xs text-slate-500">{lead.packageName || lead.leadSource}</div>
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-300">{lead.salesPerson?.name || 'Unknown'}</td>
                            <td className="p-3 text-emerald-600 dark:text-emerald-400 font-medium">
                              {new Date(lead.expectedClosingDate).toLocaleDateString()}
                            </td>
                            <td className="p-3 text-right font-black text-slate-800 dark:text-white">
                              ₹{(Number(lead.expectedValue) || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        {salesList.length === 0 && (
                          <tr>
                            <td colSpan="4" className="p-8 text-center text-slate-500 italic">No expected sales found in this period.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Expected Renewals Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-blue-500" />
                      Expected Renewals Details
                    </h3>
                  </div>
                  <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 backdrop-blur-md">
                        <tr>
                          <th className="p-3 font-semibold text-slate-500">Client Business</th>
                          <th className="p-3 font-semibold text-slate-500">Package</th>
                          <th className="p-3 font-semibold text-slate-500">Renewal Due Date</th>
                          <th className="p-3 font-semibold text-slate-500 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {renewalsList.map(client => (
                          <tr 
                            key={client.id} 
                            onClick={() => onClientClick && onClientClick(client)}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${onClientClick ? 'cursor-pointer' : ''}`}
                          >
                            <td className="p-3">
                              <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                {client.businessName}
                                {client.isRenewed && (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold border border-emerald-200 dark:border-emerald-800">
                                    Renewed
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500">{client.clientId}</div>
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                              {client.packageName}
                            </td>
                            <td className="p-3 text-blue-600 dark:text-blue-400 font-medium">
                              {client.computedExpiryDateStr}
                            </td>
                            <td className="p-3 text-right font-black text-slate-800 dark:text-white">
                              ₹{(Number(client.packageAmount) || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        {renewalsList.length === 0 && (
                          <tr>
                            <td colSpan="4" className="p-8 text-center text-slate-500 italic">No expected renewals found in this period.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
              <p className="text-lg font-medium text-slate-600 dark:text-slate-400">Ready to calculate Future Collection</p>
              <p className="text-sm">Select dates and click Generate Report.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
