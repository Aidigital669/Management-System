'use client';

import { useState, useMemo } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Calendar,
  DollarSign,
  Filter,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  History,
  FileText,
  X,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Wallet,
  Building,
  User,
  Phone,
  Mail,
  Receipt,
  Sparkles
} from 'lucide-react';
import { getClientPlanInfo } from '@/lib/planUtils';

export default function PaymentManagementHub({
  clientsList = [],
  getClientPaymentInfo,
  refreshData,
  currentUser,
  showToast,
  openConfirmModal
}) {
  // Filtering states
  const [dateBasis, setDateBasis] = useState('PAYMENT'); // 'PAYMENT' | 'JOINING'
  const [monthFilter, setMonthFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'PARTIAL' | 'OVERDUE_7' | 'FULL' | 'UNPAID'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [verifyModalClient, setVerifyModalClient] = useState(null);
  const [verifyForm, setVerifyForm] = useState({
    paymentDate: '',
    paymentMethod: 'UPI',
    utrNumber: '',
    verificationNotes: '',
    verificationStatus: 'VERIFIED'
  });

  const [installmentModalClient, setInstallmentModalClient] = useState(null);
  const [installmentForm, setInstallmentForm] = useState({
    amount: '',
    paymentDate: '',
    paymentMethod: 'UPI',
    utrNumber: '',
    notes: '',
    verificationStatus: 'VERIFIED'
  });

  const [historyModalClient, setHistoryModalClient] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper date normalizer
  const parseDateToISO = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const clean = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) return clean.slice(0, 10);
    const monthMap = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', sept: '09', oct: '10', nov: '11', dec: '12'
    };
    const parts = clean.split(/[\/\-\s]+/);
    if (parts.length === 3) {
      const [p1, p2, p3] = parts;
      let yyyy = p3.length === 4 ? p3 : p1.length === 4 ? p1 : (p3.length === 2 ? '20' + p3 : '2026');
      const p2Clean = p2.toLowerCase();
      let mm = monthMap[p2Clean] || monthMap[p2Clean.slice(0, 3)];
      if (!mm) {
        if (!isNaN(p2) && parseInt(p2, 10) >= 1 && parseInt(p2, 10) <= 12) mm = p2.padStart(2, '0');
        else if (!isNaN(p1) && parseInt(p1, 10) >= 1 && parseInt(p1, 10) <= 12) mm = p1.padStart(2, '0');
        else mm = '01';
      }
      return `${yyyy}-${mm}-${(p1.length <= 2 ? p1 : p3).padStart(2, '0')}`;
    }
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  };

  const getClientTargetDate = (client, basis = dateBasis) => {
    const info = getClientPaymentInfo(client);
    if (basis === 'PAYMENT') {
      return info.paymentDate || client.joiningDate || '';
    }
    return client.joiningDate || '';
  };

  const getClientMonthKey = (client, basis = dateBasis) => {
    const raw = getClientTargetDate(client, basis);
    const iso = parseDateToISO(raw);
    return iso ? iso.slice(0, 7) : null;
  };

  // Dynamic Available Months based on selected dateBasis
  const availableMonths = useMemo(() => {
    const map = new Map();
    clientsList.forEach(c => {
      const mk = getClientMonthKey(c, dateBasis);
      if (mk && mk.length === 7) {
        if (!map.has(mk)) {
          const [yyyy, mm] = mk.split('-');
          const d = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, 1);
          const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          map.set(mk, { key: mk, label, count: 0, collectedRevenue: 0 });
        }
        const item = map.get(mk);
        item.count += 1;
        const info = getClientPaymentInfo(c);
        item.collectedRevenue += (info.paidAmount || 0);
      }
    });
    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [clientsList, dateBasis]);

  // Overall & Filtered metrics calculation
  const {
    filteredClients,
    totalVerifiedRevenue,
    pendingVerificationRevenue,
    pendingVerificationCount,
    totalRemainingDue,
    overdue7Count,
    fullCount,
    partialCount,
    unpaidCount,
    expiringSoonCount
  } = useMemo(() => {
    let verifiedRev = 0;
    let pendingVerRev = 0;
    let pendingVerCount = 0;
    let remDue = 0;
    let od7 = 0;
    let fCount = 0;
    let pCount = 0;
    let uCount = 0;
    let expSoonCount = 0;

    clientsList.forEach(client => {
      const info = getClientPaymentInfo(client);
      const plan = getClientPlanInfo(client);
      if (client.active !== false && (plan.status === 'Expiring Soon' || (plan.daysLeft >= 0 && plan.daysLeft <= 7 && !plan.isExpired))) {
        expSoonCount += 1;
      }
      if (info.isVerified && info.paidAmount > 0) {
        verifiedRev += info.paidAmount;
      }
      if (info.verificationStatus === 'PENDING_VERIFICATION' && info.paidAmount > 0) {
        pendingVerRev += info.paidAmount;
        pendingVerCount += 1;
      }
      if (info.pendingBalance > 0) {
        remDue += info.pendingBalance;
      }
      if (info.isOverdue7Days) {
        od7 += 1;
      }
      if (info.paidAmount === 0) {
        uCount += 1;
      } else if (info.isPartial) {
        pCount += 1;
      } else {
        fCount += 1;
      }
    });

    const filtered = clientsList.filter(client => {
      const info = getClientPaymentInfo(client);

      // Search query match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = (
          (client.businessName && client.businessName.toLowerCase().includes(q)) ||
          (client.clientId && client.clientId.toLowerCase().includes(q)) ||
          (client.clientName && client.clientName.toLowerCase().includes(q)) ||
          (client.contact && client.contact.includes(q)) ||
          (info.utrNumber && info.utrNumber.toLowerCase().includes(q)) ||
          (info.paymentMethod && info.paymentMethod.toLowerCase().includes(q))
        );
        if (!matches) return false;
      }

      // Date filtering
      const targetDate = getClientTargetDate(client, dateBasis);
      const isoTarget = parseDateToISO(targetDate);

      if (startDate || endDate) {
        if (!isoTarget) return false;
        if (startDate && isoTarget < startDate) return false;
        if (endDate && isoTarget > endDate) return false;
      } else if (monthFilter !== 'all') {
        const mk = getClientMonthKey(client, dateBasis);
        if (mk !== monthFilter) return false;
      }

      // Status pill filter
      if (statusFilter === 'EXPIRING_SOON') {
        const p = getClientPlanInfo(client);
        return client.active !== false && (p.status === 'Expiring Soon' || (p.daysLeft >= 0 && p.daysLeft <= 7 && !p.isExpired));
      }
      if (statusFilter === 'PENDING_VERIFICATION') {
        return info.verificationStatus === 'PENDING_VERIFICATION';
      }
      if (statusFilter === 'VERIFIED') {
        return info.isVerified && info.paidAmount > 0;
      }
      if (statusFilter === 'PARTIAL') {
        return info.isPartial && info.paidAmount > 0;
      }
      if (statusFilter === 'OVERDUE_7') {
        return info.isOverdue7Days;
      }
      if (statusFilter === 'FULL') {
        return !info.isPartial && info.paidAmount > 0;
      }
      if (statusFilter === 'UNPAID') {
        return info.paidAmount === 0 || info.pStatus === 'Pending';
      }

      return true;
    });

    return {
      filteredClients: filtered,
      totalVerifiedRevenue: verifiedRev,
      pendingVerificationRevenue: pendingVerRev,
      pendingVerificationCount: pendingVerCount,
      totalRemainingDue: remDue,
      overdue7Count: od7,
      fullCount: fCount,
      partialCount: pCount,
      unpaidCount: uCount,
      expiringSoonCount: expSoonCount
    };
  }, [clientsList, dateBasis, monthFilter, startDate, endDate, statusFilter, searchQuery]);

  // Handle opening Verify Modal
  const openVerifyModal = (client) => {
    const info = getClientPaymentInfo(client);
    setVerifyModalClient(client);
    setVerifyForm({
      paymentDate: info.paymentDate ? (parseDateToISO(info.paymentDate) || info.paymentDate) : new Date().toISOString().slice(0, 10),
      paymentMethod: info.paymentMethod || 'UPI',
      utrNumber: info.utrNumber || '',
      verificationNotes: info.verificationNotes || '',
      verificationStatus: 'VERIFIED'
    });
  };

  // Submit Verification Modal
  const handleSaveVerification = async (e) => {
    e.preventDefault();
    if (!verifyModalClient) return;
    setIsSubmitting(true);
    try {
      const client = verifyModalClient;
      let notesObj = {};
      try {
        if (client.notes) notesObj = JSON.parse(client.notes);
      } catch (err) {
        notesObj = { actualNotes: client.notes || '' };
      }

      const adminName = currentUser?.name || 'Admin';
      const nowISO = new Date().toISOString();

      notesObj.paymentDate = verifyForm.paymentDate;
      notesObj.paymentMethod = verifyForm.paymentMethod;
      notesObj.utrNumber = verifyForm.utrNumber;
      notesObj.verificationStatus = verifyForm.verificationStatus;
      notesObj.isVerified = verifyForm.verificationStatus === 'VERIFIED';
      notesObj.verifiedBy = adminName;
      notesObj.verifiedAt = nowISO;
      notesObj.verificationNotes = verifyForm.verificationNotes;

      // Update first history entry if present or create one
      if (Array.isArray(notesObj.paymentHistory) && notesObj.paymentHistory.length > 0) {
        notesObj.paymentHistory[0] = {
          ...notesObj.paymentHistory[0],
          date: verifyForm.paymentDate,
          method: verifyForm.paymentMethod,
          utr: verifyForm.utrNumber,
          status: verifyForm.verificationStatus,
          verifiedBy: adminName,
          verifiedAt: nowISO,
          notes: verifyForm.verificationNotes || notesObj.paymentHistory[0].notes || 'Verified Payment'
        };
      } else {
        const info = getClientPaymentInfo(client);
        notesObj.paymentHistory = [
          {
            id: 1,
            date: verifyForm.paymentDate,
            amount: info.paidAmount,
            method: verifyForm.paymentMethod,
            utr: verifyForm.utrNumber,
            status: verifyForm.verificationStatus,
            verifiedBy: adminName,
            verifiedAt: nowISO,
            notes: verifyForm.verificationNotes || 'Initial Verified Payment'
          }
        ];
      }

      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: JSON.stringify(notesObj) })
      });

      if (res.ok) {
        showToast(`Payment successfully verified for ${client.businessName}!`, 'success');
        setVerifyModalClient(null);
        await refreshData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to verify payment.', 'error');
      }
    } catch (err) {
      showToast('Error saving verification.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle opening Add Installment Modal
  const openInstallmentModal = (client) => {
    const info = getClientPaymentInfo(client);
    setInstallmentModalClient(client);
    setInstallmentForm({
      amount: info.pendingBalance > 0 ? String(info.pendingBalance) : '',
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMethod: 'UPI',
      utrNumber: '',
      notes: `Installment payment for ${client.businessName}`,
      verificationStatus: 'VERIFIED'
    });
  };

  // Submit Add Installment Modal
  const handleSaveInstallment = async (e) => {
    e.preventDefault();
    if (!installmentModalClient) return;
    const addAmt = parseFloat(installmentForm.amount) || 0;
    if (addAmt <= 0) {
      showToast('Please enter a valid installment amount greater than 0.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const client = installmentModalClient;
      let notesObj = {};
      try {
        if (client.notes) notesObj = JSON.parse(client.notes);
      } catch (err) {
        notesObj = { actualNotes: client.notes || '' };
      }

      const adminName = currentUser?.name || 'Admin';
      const nowISO = new Date().toISOString();
      const info = getClientPaymentInfo(client);

      const newPaidTotal = (info.paidAmount || 0) + addAmt;
      const newBalance = Math.max(0, (client.packageAmount || 0) - newPaidTotal);
      const isNowFull = newBalance === 0;

      notesObj.paidAmount = newPaidTotal;
      notesObj.paymentStatus = isNowFull ? 'Full' : 'Partial';
      notesObj.paymentDate = installmentForm.paymentDate; // update to most recent payment date
      notesObj.paymentMethod = installmentForm.paymentMethod;
      notesObj.utrNumber = installmentForm.utrNumber || notesObj.utrNumber;
      notesObj.verificationStatus = installmentForm.verificationStatus;
      notesObj.isVerified = installmentForm.verificationStatus === 'VERIFIED';
      notesObj.verifiedBy = adminName;
      notesObj.verifiedAt = nowISO;

      const historyList = Array.isArray(notesObj.paymentHistory) ? [...notesObj.paymentHistory] : [];
      historyList.push({
        id: historyList.length + 1,
        date: installmentForm.paymentDate,
        amount: addAmt,
        method: installmentForm.paymentMethod,
        utr: installmentForm.utrNumber || 'N/A',
        status: installmentForm.verificationStatus,
        verifiedBy: adminName,
        verifiedAt: nowISO,
        notes: installmentForm.notes || 'Installment Payment'
      });
      notesObj.paymentHistory = historyList;

      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: JSON.stringify(notesObj) })
      });

      if (res.ok) {
        showToast(`₹${addAmt.toLocaleString()} installment recorded for ${client.businessName}!`, 'success');
        setInstallmentModalClient(null);
        await refreshData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to record installment.', 'error');
      }
    } catch (err) {
      showToast('Error recording installment.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Mark Fully Paid
  const handleQuickMarkFull = (client) => {
    const info = getClientPaymentInfo(client);
    const remaining = info.pendingBalance;

    openConfirmModal({
      title: 'Confirm Full Payment Settlement',
      badge: 'Full Settlement',
      clientName: client.businessName,
      message: `Settle remaining balance of ₹${remaining.toLocaleString()} as FULLY PAID for "${client.businessName}"?`,
      warningNotice: `This will mark the client package amount of ₹${(client.packageAmount || 0).toLocaleString()} as 100% paid and stamp today's date (${new Date().toLocaleDateString('en-GB')}) as final settlement.`,
      confirmText: 'Mark Fully Paid',
      confirmVariant: 'emerald',
      onConfirm: async () => {
        try {
          let notesObj = {};
          try {
            if (client.notes) notesObj = JSON.parse(client.notes);
          } catch (e) {
            notesObj = { actualNotes: client.notes || '' };
          }

          const adminName = currentUser?.name || 'Admin';
          const todayStr = new Date().toISOString().slice(0, 10);
          const nowISO = new Date().toISOString();

          notesObj.paymentStatus = 'Full';
          notesObj.paidAmount = client.packageAmount || 0;
          notesObj.paymentDate = todayStr;
          notesObj.verificationStatus = 'VERIFIED';
          notesObj.isVerified = true;
          notesObj.verifiedBy = adminName;
          notesObj.verifiedAt = nowISO;

          const historyList = Array.isArray(notesObj.paymentHistory) ? [...notesObj.paymentHistory] : [];
          if (remaining > 0) {
            historyList.push({
              id: historyList.length + 1,
              date: todayStr,
              amount: remaining,
              method: notesObj.paymentMethod || 'Bank Transfer',
              utr: 'Full Settlement',
              status: 'VERIFIED',
              verifiedBy: adminName,
              verifiedAt: nowISO,
              notes: 'Full Settlement Cleared'
            });
          }
          notesObj.paymentHistory = historyList;

          const res = await fetch(`/api/clients/${client.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: JSON.stringify(notesObj) })
          });

          if (res.ok) {
            showToast(`Marked 100% Fully Paid for ${client.businessName}!`, 'success');
            await refreshData();
          } else {
            showToast('Failed to mark full payment.', 'error');
          }
        } catch (err) {
          showToast('Error updating payment.', 'error');
        }
      }
    });
  };

  return (
    <div className="space-y-6 animate-fade-in text-xs">
      
      {/* 1. TOP METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Verified Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-900/60 p-5 rounded-2xl shadow-xs flex flex-col justify-between bg-gradient-to-br from-white via-emerald-50/20 to-emerald-100/10 dark:from-slate-900 dark:via-emerald-950/20 dark:to-emerald-900/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Verified Revenue
            </span>
            <span className="p-1.5 bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              ₹{totalVerifiedRevenue.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              <span>Deposited & Bank Verified</span>
            </span>
          </div>
        </div>

        {/* Card 2: Pending Verification */}
        <div className={`bg-white dark:bg-slate-900 border p-5 rounded-2xl shadow-xs flex flex-col justify-between transition-all ${
          pendingVerificationCount > 0 
            ? 'border-amber-300 dark:border-amber-800/80 bg-gradient-to-br from-amber-50/40 via-amber-50/10 to-amber-100/20 dark:from-slate-900 dark:via-amber-950/20 dark:to-amber-900/10' 
            : 'border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Pending Verification
            </span>
            {pendingVerificationCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-black animate-pulse">
                {pendingVerificationCount} Action
              </span>
            )}
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              ₹{pendingVerificationRevenue.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {pendingVerificationCount} payment{pendingVerificationCount === 1 ? '' : 's'} awaiting bank check
            </span>
          </div>
        </div>

        {/* Card 3: Remaining Balance Due */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-slate-400" />
              Remaining Balance Due
            </span>
            <span className="p-1.5 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-lg">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-red-600 dark:text-red-400">
              ₹{totalRemainingDue.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Uncollected across partial accounts
            </span>
          </div>
        </div>

        {/* Card 4: 7-Day Overdue */}
        <div className={`bg-white dark:bg-slate-900 border p-5 rounded-2xl shadow-xs flex flex-col justify-between ${
          overdue7Count > 0 
            ? 'border-red-300 dark:border-red-800/80 bg-red-50/20 dark:bg-red-950/20' 
            : 'border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-red-700 dark:text-red-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              7-Day Overdue
            </span>
            {overdue7Count > 0 && (
              <span className="px-2 py-0.5 bg-red-600 text-white rounded-full text-[10px] font-black animate-pulse">
                {overdue7Count} Overdue
              </span>
            )}
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-red-700 dark:text-red-400">
              {overdue7Count}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Balance pending &gt; 7 days from payment
            </span>
          </div>
        </div>

        {/* Card 5: Accounts Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">
              Account Status Mix
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              Total: {clientsList.length}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10px] font-extrabold border border-emerald-200 dark:border-emerald-800/60">
              💯 {fullCount} Full
            </span>
            <span className="px-2 py-1 bg-amber-50 dark:bg-amber-955/40 text-amber-700 dark:text-amber-300 rounded-lg text-[10px] font-extrabold border border-amber-200 dark:border-amber-800/60">
              ⏳ {partialCount} Partial
            </span>
            {unpaidCount > 0 && (
              <span className="px-2 py-1 bg-red-50 dark:bg-red-955/40 text-red-700 dark:text-red-300 rounded-lg text-[10px] font-extrabold border border-red-200 dark:border-red-800/60">
                ❌ {unpaidCount} Unpaid
              </span>
            )}
          </div>
        </div>

      </div>

      {/* 2. DUAL-MODE DATE FILTERING & TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        
        {/* Top Controls Row */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Date Basis Selector Toggle */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl shrink-0 self-start lg:self-auto border border-slate-200 dark:border-slate-700/60">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              Filter By:
            </span>
            <button
              type="button"
              onClick={() => setDateBasis('PAYMENT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                dateBasis === 'PAYMENT'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <span>💳 Actual Payment Date</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-white/20 uppercase font-black">Primary</span>
            </button>
            <button
              type="button"
              onClick={() => setDateBasis('JOINING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                dateBasis === 'JOINING'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <span>📅 Joining / Contract Date</span>
            </button>
          </div>

          {/* Month Dropdown & Custom Range */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                setStartDate('');
                setEndDate('');
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">🌐 All Recorded Months</option>
              {availableMonths.map(m => (
                <option key={m.key} value={m.key}>
                  {m.label} ({m.count} payments • ₹{m.collectedRevenue.toLocaleString()})
                </option>
              ))}
            </select>

            {/* Custom Date Range Picker */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1">
              <span className="text-[10px] font-bold text-slate-400">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setMonthFilter('all');
                }}
                className="bg-transparent text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              />
              <span className="text-[10px] font-bold text-slate-400">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setMonthFilter('all');
                }}
                className="bg-transparent text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              />
              {(startDate || endDate || monthFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setMonthFilter('all');
                  }}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 transition"
                  title="Reset date filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: 'ALL', label: 'All Payments', count: clientsList.length },
              { key: 'EXPIRING_SOON', label: '⏳ Expiring Soon', count: expiringSoonCount, color: 'orange' },
              { key: 'PENDING_VERIFICATION', label: '⚠️ To Verify', count: pendingVerificationCount, color: 'amber' },
              { key: 'VERIFIED', label: '✅ Verified', count: clientsList.filter(c => getClientPaymentInfo(c).isVerified && getClientPaymentInfo(c).paidAmount > 0).length, color: 'emerald' },
              { key: 'PARTIAL', label: '⏳ Partial (Due)', count: partialCount, color: 'blue' },
              { key: 'OVERDUE_7', label: '🚨 7-Day Overdue', count: overdue7Count, color: 'red' },
              { key: 'FULL', label: '💯 Full Paid', count: fullCount, color: 'emerald' },
              { key: 'UNPAID', label: '❌ Unpaid', count: unpaidCount, color: 'red' }
            ].map(tab => {
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive
                      ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-950'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search client, ID, phone, UTR..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

      </div>

      {/* 3. PAYMENTS DATA TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-850 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="p-4">Client / Business</th>
                <th className="p-4">Joining Date</th>
                <th className="p-4">Actual Payment Date</th>
                <th className="p-4">Package (₹)</th>
                <th className="p-4">Paid (₹)</th>
                <th className="p-4">Balance (₹)</th>
                <th className="p-4">Payment Mode & UTR</th>
                <th className="p-4">Bank Verification</th>
                <th className="p-4">Aging Alert</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-12 text-center text-slate-400 italic">
                    <div className="flex flex-col items-center gap-2">
                      <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <p className="font-semibold text-sm">No payments match your active filters.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter('ALL');
                          setMonthFilter('all');
                          setStartDate('');
                          setEndDate('');
                          setSearchQuery('');
                        }}
                        className="text-blue-600 dark:text-blue-400 font-bold hover:underline mt-1"
                      >
                        Reset all filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClients.map(client => {
                  const info = getClientPaymentInfo(client);
                  const isPendingVer = info.verificationStatus === 'PENDING_VERIFICATION';

                  return (
                    <tr
                      key={`pmh-${client.id}`}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition text-slate-700 dark:text-slate-300"
                    >
                      {/* Client / Business */}
                      <td className="p-4">
                        <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                          <span>{client.businessName}</span>
                          {!client.active ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 uppercase font-bold">
                              Inactive
                            </span>
                          ) : (() => {
                            const plan = getClientPlanInfo(client);
                            if (plan.status === 'Expiring Soon') {
                              return (
                                <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-955/60 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-800 font-extrabold uppercase shrink-0 animate-pulse">
                                  ⏳ Expiring Soon ({plan.daysLeft === 0 ? 'Today' : `${plan.daysLeft}d left`})
                                </span>
                              );
                            }
                            if (plan.status === 'Expired') {
                              return (
                                <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-955/60 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800 font-extrabold uppercase shrink-0">
                                  ⚠️ Expired ({plan.overdueDays}d)
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{client.clientId}</span>
                          <span>•</span>
                          <span>{client.clientName || 'N/A'}</span>
                          {client.contact && (
                            <>
                              <span>•</span>
                              <span>{client.contact}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Joining Date */}
                      <td className="p-4 font-semibold text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{client.joiningDate || 'N/A'}</span>
                        </div>
                        {(() => {
                          const plan = getClientPlanInfo(client);
                          if (!plan.expiryDateStr || plan.expiryDateStr === 'N/A') {
                            return <span className="text-[9px] text-slate-400 block mt-0.5">Contract Start</span>;
                          }
                          return (
                            <span className={`text-[9px] font-bold block mt-0.5 ${
                              plan.status === 'Expiring Soon' ? 'text-orange-600 dark:text-orange-400 font-extrabold' : (plan.status === 'Expired' ? 'text-red-500 font-bold' : 'text-slate-400')
                            }`}>
                              Exp: {plan.expiryDateStr}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Actual Payment Date */}
                      <td className="p-4 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                          <span className="font-bold text-slate-900 dark:text-white">
                            {info.paymentDate || client.joiningDate || 'N/A'}
                          </span>
                        </div>
                        {info.isLegacyDate ? (
                          <span className="inline-block mt-0.5 text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            Legacy Default
                          </span>
                        ) : (
                          <span className="inline-block mt-0.5 text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                            ✓ Verified Date
                          </span>
                        )}
                      </td>

                      {/* Package Value */}
                      <td className="p-4 font-extrabold text-slate-900 dark:text-white">
                        ₹{(client.packageAmount || 0).toLocaleString()}
                        <span className="text-[9px] text-slate-400 block font-normal">{client.packageName}</span>
                      </td>

                      {/* Paid Amount */}
                      <td className="p-4 font-black text-emerald-600 dark:text-emerald-400">
                        ₹{(info.paidAmount || 0).toLocaleString()}
                      </td>

                      {/* Remaining Balance */}
                      <td className="p-4">
                        {info.pendingBalance > 0 ? (
                          <span className="font-black text-red-600 dark:text-red-400 text-sm">
                            ₹{info.pendingBalance.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                            Cleared (₹0)
                          </span>
                        )}
                      </td>

                      {/* Payment Mode & UTR */}
                      <td className="p-4">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 uppercase">
                          {info.paymentMethod || 'UPI'}
                        </span>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1 truncate max-w-[120px]" title={info.utrNumber || 'No UTR specified'}>
                          {info.utrNumber ? `UTR: ${info.utrNumber}` : <span className="italic text-slate-400">No UTR</span>}
                        </div>
                      </td>

                      {/* Bank Verification Status */}
                      <td className="p-4">
                        {isPendingVer ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-955/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                              ⚠️ Pending Check
                            </span>
                            <button
                              type="button"
                              onClick={() => openVerifyModal(client)}
                              className="block text-[10px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              Verify Now →
                            </button>
                          </div>
                        ) : info.isVerified ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-955/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              Bank Verified
                            </span>
                            {info.verifiedBy && (
                              <span className="text-[9px] text-slate-400 block mt-0.5 truncate max-w-[130px]" title={`By ${info.verifiedBy} on ${info.verifiedAt ? new Date(info.verifiedAt).toLocaleDateString() : 'N/A'}`}>
                                By {info.verifiedBy}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Unverified
                          </span>
                        )}
                      </td>

                      {/* Aging Alert */}
                      <td className="p-4">
                        {info.isPartial ? (
                          info.isOverdue7Days ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-700 dark:bg-red-955/50 dark:text-red-400 border border-red-300 dark:border-red-900/60 animate-pulse">
                              ⚠️ Overdue ({info.daysPassed}d)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-955/40 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/50">
                              ⏳ Day {info.daysPassed} of 7
                            </span>
                          )
                        ) : (() => {
                          const plan = getClientPlanInfo(client);
                          if (client.active !== false && plan.status === 'Expiring Soon') {
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-orange-100 text-orange-800 dark:bg-orange-955/40 dark:text-orange-300 border border-orange-300 dark:border-orange-800 animate-pulse">
                                ⏳ Plan Ends ({plan.daysLeft === 0 ? 'Today' : `${plan.daysLeft}d left`})
                              </span>
                            );
                          }
                          if (client.active !== false && plan.status === 'Expired') {
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-red-100 text-red-800 dark:bg-red-955/40 dark:text-red-300 border border-red-300 dark:border-red-800">
                                ⚠️ Plan Expired ({plan.overdueDays}d)
                              </span>
                            );
                          }
                          return <span className="text-slate-400 text-[10px] font-medium">—</span>;
                        })()}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* Verify Button */}
                        <button
                          type="button"
                          onClick={() => openVerifyModal(client)}
                          className="py-1 px-2.5 rounded-lg text-[10px] font-bold transition bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                          title="Verify Bank Transaction & Update Date"
                        >
                          Verify
                        </button>

                        {/* Add Installment Button */}
                        {info.pendingBalance > 0 && (
                          <button
                            type="button"
                            onClick={() => openInstallmentModal(client)}
                            className="py-1 px-2.5 rounded-lg text-[10px] font-bold transition bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                            title="Record partial installment"
                          >
                            + Pay
                          </button>
                        )}

                        {/* Quick Mark Full */}
                        {info.pendingBalance > 0 && (
                          <button
                            type="button"
                            onClick={() => handleQuickMarkFull(client)}
                            className="py-1 px-2.5 rounded-lg text-[10px] font-bold transition bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                            title="Settle remaining balance as full"
                          >
                            Mark Paid
                          </button>
                        )}

                        {/* History Ledger Button */}
                        <button
                          type="button"
                          onClick={() => setHistoryModalClient(client)}
                          className="py-1 px-2 rounded-lg text-[10px] font-bold transition bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                          title="View Payment Installment History"
                        >
                          <History className="w-3.5 h-3.5 inline" />
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

      {/* 4. VERIFY PAYMENT MODAL */}
      {verifyModalClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Verify Bank Payment</h3>
                  <p className="text-[10px] text-slate-400">{verifyModalClient.businessName} ({verifyModalClient.clientId})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVerifyModalClient(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVerification} className="p-5 space-y-4">
              
              {/* Notice comparing Joining Date vs Payment Date */}
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-xl text-[11px] space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
                  <span>📅 Contract Joining Date:</span>
                  <span className="font-mono text-blue-700 dark:text-blue-400">{verifyModalClient.joiningDate || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-[10px]">
                  <span>Package Total: ₹{(verifyModalClient.packageAmount || 0).toLocaleString()}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    Paid: ₹{(getClientPaymentInfo(verifyModalClient).paidAmount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Actual Payment Date Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Actual Bank Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={verifyForm.paymentDate}
                  onChange={(e) => setVerifyForm({ ...verifyForm, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  The real date money credited to the bank account (independent of contract start date).
                </p>
              </div>

              {/* Payment Mode & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={verifyForm.paymentMethod}
                    onChange={(e) => setVerifyForm({ ...verifyForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                    <option value="Bank Transfer">Bank Transfer (IMPS / NEFT / RTGS)</option>
                    <option value="Razorpay">Razorpay Gateway</option>
                    <option value="Cash">Cash Deposit</option>
                    <option value="Cheque">Cheque Deposit</option>
                    <option value="Credit / Debit Card">Credit / Debit Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Verification State
                  </label>
                  <select
                    value={verifyForm.verificationStatus}
                    onChange={(e) => setVerifyForm({ ...verifyForm, verificationStatus: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="VERIFIED">✅ Verified (Confirmed in Bank)</option>
                    <option value="PENDING_VERIFICATION">⚠️ Pending Verification</option>
                    <option value="UNVERIFIED">❌ Unverified</option>
                  </select>
                </div>
              </div>

              {/* UTR / Transaction ID */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bank UTR / Transaction Reference ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC12345678 or UPI-40294821"
                  value={verifyForm.utrNumber}
                  onChange={(e) => setVerifyForm({ ...verifyForm, utrNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Verification Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bank Verification Remarks / Account Note
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Verified in ICICI Current A/C on statement #42"
                  value={verifyForm.verificationNotes}
                  onChange={(e) => setVerifyForm({ ...verifyForm, verificationNotes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setVerifyModalClient(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm Verification</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 5. ADD INSTALLMENT MODAL */}
      {installmentModalClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Record Partial Payment / Installment</h3>
                  <p className="text-[10px] text-slate-400">{installmentModalClient.businessName} ({installmentModalClient.clientId})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInstallmentModalClient(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInstallment} className="p-5 space-y-4">
              
              {/* Summary Balance */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-[11px]">
                <div>
                  <span className="text-slate-400 uppercase text-[9px] font-bold block">Current Balance Pending</span>
                  <span className="text-lg font-black text-red-600 dark:text-red-400">
                    ₹{(getClientPaymentInfo(installmentModalClient).pendingBalance || 0).toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 uppercase text-[9px] font-bold block">Contract Package</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    ₹{(installmentModalClient.packageAmount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Installment Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Installment Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={installmentForm.amount}
                    onChange={(e) => setInstallmentForm({ ...installmentForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Credit Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={installmentForm.paymentDate}
                    onChange={(e) => setInstallmentForm({ ...installmentForm, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Mode & UTR */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={installmentForm.paymentMethod}
                    onChange={(e) => setInstallmentForm({ ...installmentForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer (IMPS / NEFT)</option>
                    <option value="Razorpay">Razorpay</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bank UTR / Reference ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-987654"
                    value={installmentForm.utrNumber}
                    onChange={(e) => setInstallmentForm({ ...installmentForm, utrNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Receipt Remark
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2nd Installment received via UPI"
                  value={installmentForm.notes}
                  onChange={(e) => setInstallmentForm({ ...installmentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setInstallmentModalClient(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Save Installment</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 6. PAYMENT HISTORY LEDGER TIMELINE MODAL */}
      {historyModalClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Payment Ledger & Timeline</h3>
                  <p className="text-[10px] text-slate-400">{historyModalClient.businessName} ({historyModalClient.clientId})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalClient(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              
              {/* Header Info */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Onboarding Joining Date</span>
                  <span className="font-bold text-slate-900 dark:text-white">{historyModalClient.joiningDate || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Package Value</span>
                  <span className="font-bold text-slate-900 dark:text-white">₹{(historyModalClient.packageAmount || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Total Paid</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">
                    ₹{(getClientPaymentInfo(historyModalClient).paidAmount || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Pending</span>
                  <span className="font-black text-red-600 dark:text-red-400">
                    ₹{(getClientPaymentInfo(historyModalClient).pendingBalance || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Timeline Items */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Installment History</h4>
                
                {(() => {
                  const info = getClientPaymentInfo(historyModalClient);
                  const history = info.paymentHistory && info.paymentHistory.length > 0 
                    ? info.paymentHistory 
                    : [
                        {
                          id: 1,
                          date: info.paymentDate || historyModalClient.joiningDate,
                          amount: info.paidAmount,
                          method: info.paymentMethod || 'UPI',
                          utr: info.utrNumber || 'N/A',
                          status: info.verificationStatus,
                          verifiedBy: info.verifiedBy || 'Admin',
                          verifiedAt: info.verifiedAt,
                          notes: 'Initial Record'
                        }
                      ];

                  return (
                    <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 space-y-4 py-1">
                      {history.map((item, idx) => (
                        <div key={`hist-${idx}`} className="relative pl-5">
                          {/* Dot */}
                          <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900" />
                          
                          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>₹{(item.amount || 0).toLocaleString()}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-extrabold uppercase">
                                  {item.method || 'UPI'}
                                </span>
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                📅 {item.date || 'N/A'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                              <span>UTR: <span className="font-mono text-slate-700 dark:text-slate-300">{item.utr || 'N/A'}</span></span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                item.status === 'VERIFIED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-955/60 dark:text-amber-300'
                              }`}>
                                {item.status === 'VERIFIED' ? '✓ Verified' : '⚠️ Pending Verification'}
                              </span>
                            </div>

                            {item.notes && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 italic mt-0.5">
                                &ldquo;{item.notes}&rdquo;
                              </p>
                            )}

                            {item.verifiedBy && (
                              <span className="text-[9px] text-slate-400 mt-0.5">
                                Verified by {item.verifiedBy} {item.verifiedAt ? `on ${new Date(item.verifiedAt).toLocaleDateString()}` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryModalClient(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 cursor-pointer"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
