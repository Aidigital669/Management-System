'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BrandOnboardingForm from './BrandOnboardingForm';
import {
  Building2,
  LogOut,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Info,
  DollarSign,
  TrendingUp,
  User,
  ShieldCheck,
  Check,
  FileText,
  ExternalLink,
  Sun,
  Moon
} from 'lucide-react';
import { getClientPlanInfo } from '@/lib/planUtils';

export default function ClientDashboard() {
  const router = useRouter();
  const [sessionLoading, setSessionLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [taskFilter, setTaskFilter] = useState('All');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Revisions Modal/State
  const [revisionTask, setRevisionTask] = useState(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [showRevisionModal, setShowRevisionModal] = useState(false);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(true);

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

  // Client Feedback & Support states
  const [activePortalTab, setActivePortalTab] = useState('onboarding');
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackType, setFeedbackType] = useState('Feedback');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();

        if (!res.ok || !data.user || data.user.role !== 'CLIENT') {
          router.push('/');
          return;
        }
        setSessionLoading(false);
        fetchClientData();
      } catch (err) {
        console.error(err);
        router.push('/');
      }
    }
    checkAuth();
  }, [router]);

  const fetchClientData = async () => {
    setDataLoading(true);
    try {
      const res = await fetch('/api/client/tasks');
      const data = await res.json();
      if (res.ok) {
        setClientInfo(data.client);
        setTasks(data.tasks || []);
      } else {
        setError(data.error || 'Failed to retrieve deliverables data.');
      }

      // Fetch client submitted feedbacks/concerns
      const fbRes = await fetch('/api/client/feedback');
      const fbData = await fbRes.json();
      if (fbRes.ok) {
        setFeedbacks(fbData.feedbacks || []);
      }
    } catch (err) {
      setError('Could not establish connection to deliverables api.');
    } finally {
      setDataLoading(false);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;

    setActionLoading(true);
    setFeedbackSuccess('');
    setError('');
    try {
      const res = await fetch('/api/client/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: feedbackType,
          rating: feedbackType === 'Feedback' ? feedbackRating : null,
          message: feedbackMessage.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setFeedbackSuccess(`${feedbackType} submitted successfully!`);
        setFeedbackMessage('');
        setFeedbackRating(5);

        // Refresh feedback list
        const fbRes = await fetch('/api/client/feedback');
        const fbData = await fbRes.json();
        if (fbRes.ok) {
          setFeedbacks(fbData.feedbacks || []);
        }
      } else {
        setError(data.error || 'Failed to submit feedback.');
      }
    } catch (err) {
      setError('Error connecting to the server.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    setActionLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const submitRevisionRequest = async (e) => {
    e.preventDefault();
    if (!revisionNotes.trim()) return;

    setActionLoading(true);
    try {
      // In this system, requesting revision updates the task status to 'Revision'
      const res = await fetch(`/api/client-tasks/${revisionTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Revision',
          notes: revisionNotes.trim()
        })
      });

      if (res.ok) {
        setShowRevisionModal(false);
        setRevisionNotes('');
        setRevisionTask(null);
        fetchClientData();
      } else {
        alert('Failed to submit revision request. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting revision request.');
    } finally {
      setActionLoading(false);
    }
  };
  const handleApproveTask = async (taskToApprove) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/client-tasks/${taskToApprove.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Completion'
        })
      });
      if (res.ok) {
        fetchClientData();
      } else {
        alert('Failed to approve task.');
      }
    } catch (err) {
      console.error(err);
      alert('Error approving task.');
    } finally {
      setActionLoading(false);
    }
  };

  const COMPLETED_STATUSES = ['Done', 'DONE', 'Completed', 'Completed (Done)', 'Completion', 'Posted'];

  // Robust Date Parsing helper supporting YYYY-MM-DD, DD-MMM-YYYY, DD/MM/YYYY
  const parseDbDate = (dStr) => {
    if (!dStr || dStr === 'Trigger on Approval') return new Date();
    const cleanStr = dStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(cleanStr)) {
      const [y, m, d] = cleanStr.slice(0, 10).split('-').map(v => parseInt(v, 10));
      return new Date(y, m - 1, d);
    }
    const parts = cleanStr.split(/[\/\-\s]+/);
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const monthPart = parts[1].toLowerCase().trim();
      const year = parseInt(parts[2].length === 2 ? `20${parts[2]}` : parts[2], 10);

      const months = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11
      };

      let month = months[monthPart.slice(0, 4)] || months[monthPart.slice(0, 3)];
      if (month === undefined && !isNaN(parseInt(monthPart, 10))) {
        month = parseInt(monthPart, 10) - 1;
      }
      if (month !== undefined && !isNaN(day) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    const d = new Date(cleanStr);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Helper to convert any task date to ISO YYYY-MM-DD
  const parseTaskDateToISO = (dStr) => {
    if (!dStr || dStr === 'Trigger on Approval' || dStr === 'Posting') return null;
    const cleanStr = dStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(cleanStr)) {
      return cleanStr.slice(0, 10);
    }
    const parts = cleanStr.split(/[\/\-\s]+/);
    if (parts.length >= 3) {
      const day = parts[0].padStart(2, '0');
      const monthPart = parts[1].toLowerCase().trim();
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];

      const months = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', sept: '09', oct: '10', nov: '11', dec: '12'
      };

      let month = months[monthPart.slice(0, 4)] || months[monthPart.slice(0, 3)];
      if (!month && !isNaN(parseInt(monthPart, 10))) {
        month = String(parseInt(monthPart, 10)).padStart(2, '0');
      }
      if (month && !isNaN(parseInt(day, 10)) && !isNaN(parseInt(year, 10))) {
        return `${year}-${month}-${day}`;
      }
    }
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return null;
  };

  const formatDbDate = (date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = date.getDate().toString().padStart(2, '0');
    const m = months[date.getMonth()];
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  // Calculations for current cycle
  const getCycleStats = () => {
    if (!clientInfo) return { startStr: '', expiryStr: '', daysLeft: 0, progressPct: 0, durationLabel: 'Contract Plan' };

    const planInfo = getClientPlanInfo(clientInfo);
    const totalDays = planInfo.durationDays || 30;
    const daysLeft = Math.max(0, planInfo.daysLeft);
    const elapsedDays = Math.max(0, Math.min(totalDays, totalDays - daysLeft));
    const progressPct = Math.round((elapsedDays / totalDays) * 100);

    return {
      startStr: planInfo.cycleStartDateStr || clientInfo.joiningDate,
      expiryStr: planInfo.expiryDateStr,
      renewalDueDateStr: planInfo.renewalDueDateStr,
      daysLeft: planInfo.daysLeft,
      progressPct,
      durationLabel: planInfo.durationLabel || 'Contract Cycle',
      isExpired: planInfo.isExpired,
      isExpiringSoon: planInfo.isExpiringSoon
    };
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium">Authorizing client session...</p>
        </div>
      </div>
    );
  }

  // Cutoff date for overdue removal on client side: remove overdue items before 4 September 2026
  const OVERDUE_CUTOFF_DATE = '2026-09-04';

  // Filter tasks: remove all overdue tasks before 4 September from client side
  const currentCycleTasks = tasks.filter(t => {
    const iso = parseTaskDateToISO(t.date);
    const isCompleted = COMPLETED_STATUSES.includes(t.status);
    const isOverdue = ['Overdue', 'OVERDUE', 'overdue'].includes(t.status?.trim());

    // If task date is strictly before 4 September 2026:
    if (iso && iso < OVERDUE_CUTOFF_DATE) {
      // Exclude if it's marked overdue or is an uncompleted past item
      if (isOverdue || !isCompleted) return false;
    } else if (!iso && isOverdue) {
      // If task has no date and is marked overdue, exclude
      return false;
    }

    return true;
  });

  const totalDeliverables = currentCycleTasks.length;
  const completedDeliverables = currentCycleTasks.filter(t =>
    COMPLETED_STATUSES.includes(t.status)
  ).length;
  const pendingDeliverables = totalDeliverables - completedDeliverables;
  const completionPct = totalDeliverables > 0 ? Math.round((completedDeliverables / totalDeliverables) * 100) : 0;

  // Filtered deliverables checklist list
  const filteredTasks = currentCycleTasks
    .filter(t => {
      if (taskFilter === 'All') return true;
      if (taskFilter === 'Graphics') return t.postType === 'Graphic';
      if (taskFilter === 'Reels') return t.postType === 'Reel';
      if (taskFilter === 'AI Videos') return t.postType === 'AI Video';
      if (taskFilter === 'Reports') return t.postType === 'Report';
      return true;
    })
    .filter(t => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return t.taskTitle.toLowerCase().includes(q) || (t.workingOn && t.workingOn.toLowerCase().includes(q));
    });

  const cycle = getCycleStats();

  return (
    <div className="h-full max-h-screen w-full overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans select-none antialiased transition-colors duration-300">

      {/* Header bar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-3 sm:px-6 py-3 sm:py-4 flex justify-between items-center transition-colors duration-300">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <Building2 className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-xs sm:text-sm tracking-tight text-slate-900 dark:text-white truncate">{clientInfo?.businessName || 'Workspace'}</h1>
            <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase truncate">Customer Portal | ID: {clientInfo?.clientId}</p>
          </div>
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

          <button
            onClick={handleLogout}
            disabled={actionLoading}
            className="py-1.5 px-2.5 sm:px-3 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800/60 hover:bg-red-50 dark:hover:bg-red-950/20 border border-slate-200 dark:border-slate-700/60 hover:border-red-300 dark:hover:border-red-900/40 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit Portal</span>
          </button>
        </div>
      </header>

      {/* Subheader portal tab navigation */}
      <div className="bg-slate-900/40 border-b border-slate-800/60 px-3 sm:px-6 flex items-center text-[10px] uppercase font-bold tracking-wider overflow-x-auto no-scrollbar whitespace-nowrap gap-1">
        <button
          onClick={() => setActivePortalTab('onboarding')}
          className={`py-3 px-3 sm:px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${activePortalTab === 'onboarding'
            ? 'border-blue-500 text-white font-extrabold'
            : 'border-transparent text-slate-450 hover:text-slate-200'
            }`}
        >
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span>Brand Onboarding Form</span>
        </button>
        <button
          onClick={() => setActivePortalTab('deliverables')}
          className={`py-3 px-3 sm:px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${activePortalTab === 'deliverables'
            ? 'border-blue-500 text-white font-extrabold'
            : 'border-transparent text-slate-450 hover:text-slate-200'
            }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Deliverables Checklist</span>
        </button>
        <button
          onClick={() => setActivePortalTab('feedback')}
          className={`py-3 px-3 sm:px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${activePortalTab === 'feedback'
            ? 'border-blue-500 text-white font-extrabold'
            : 'border-transparent text-slate-450 hover:text-slate-200'
            }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Submit Feedback & Concerns</span>
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 space-y-6 overflow-x-hidden">

        {error && (
          <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-xl flex items-center gap-3 text-red-400 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Dashboard Grid */}
        {dataLoading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-slate-450 text-xs font-semibold">Generating your timeline checklist...</p>
          </div>
        ) : activePortalTab === 'deliverables' ? (
          <>
            {/* Onboarding Banner Callout */}
            <div className="bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-900/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Complete Brand Onboarding & Guidelines Form</h4>
                  <p className="text-[11px] text-slate-400">
                    Submit your social media handles, logos & content preferences for your assigned executive: <strong className="text-blue-300">{tasks.find(t => t.workingOn && t.workingOn !== 'AUTO' && (t.assignTo?.toLowerCase().includes('digital marketing') || t.assignTo?.toLowerCase().includes('social media') || t.assignTo?.toLowerCase().includes('posting') || t.postType?.toLowerCase().includes('report')))?.workingOn || tasks.find(t => t.workingOn && t.workingOn !== 'AUTO')?.workingOn || 'Assigned Social Media Executive'}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActivePortalTab('onboarding')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shrink-0 transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>Fill Onboarding Form</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Top row: Client Details & Cycle Countdown Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Client Info Card */}
              <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between gap-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>

                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="px-2 py-0.5 bg-blue-950 border border-blue-900/60 text-blue-400 rounded text-[9px] font-bold uppercase tracking-wider">
                        {clientInfo?.packageName || 'Plan Tier'}
                      </span>
                      <h2 className="text-xl font-bold text-white mt-1.5">{clientInfo?.clientName || clientInfo?.businessName}</h2>
                      <p className="text-[10px] text-slate-400 mt-0.5">Primary Portal Contact Email: {clientInfo?.email || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Monthly Volume</span>
                      <span className="text-xl font-black text-white mt-0.5">₹{clientInfo?.packageAmount?.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-slate-800/80 pt-4">
                    <div>
                      <span className="text-[9px] text-slate-550 uppercase font-bold block">Business Sector</span>
                      <span className="text-[11px] font-semibold text-slate-200 mt-0.5 block">{clientInfo?.sector || 'General'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-550 uppercase font-bold block">Active Channels</span>
                      <span className="text-[11px] font-semibold text-slate-200 mt-0.5 block line-clamp-1">{clientInfo?.services}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-550 uppercase font-bold block">Setup Check</span>
                      <span className="text-[11px] font-semibold mt-0.5 flex items-center gap-1">
                        {clientInfo?.accountReady ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-400">Ready</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-orange-400" />
                            <span className="text-orange-400">Pending</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {clientInfo?.notes && (
                  <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60 text-[10px] text-slate-400 italic">
                    <strong>Business Requirements:</strong> {clientInfo.notes}
                  </div>
                )}
              </div>

              {/* Cycle Tracker Card */}
              <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between gap-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      Active {cycle.durationLabel}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[9px] font-bold">
                      Cycle Countdown
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-slate-950/40 border border-slate-800/60 p-3.5 rounded-xl">
                    <div>
                      <span className="text-[9px] text-slate-550 uppercase font-bold block">Cycle Start Date</span>
                      <span className="text-xs font-bold text-white mt-1 block">{cycle.startStr}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-550 uppercase font-bold block">Calculated Expiry Date</span>
                      <span className="text-xs font-bold text-white mt-1 block">{cycle.expiryStr}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-450">Active Cycle Progress</span>
                      {cycle.daysLeft === 0 ? (
                        <span className="text-orange-500 uppercase tracking-wider">Ends Today</span>
                      ) : (
                        <span className="text-indigo-400">{cycle.daysLeft} days remaining</span>
                      )}
                    </div>
                    <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${cycle.progressPct}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-950/30 p-2.5 rounded-xl border border-slate-800/40">
                  <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <p>Upon plan expiry, subscription renewal will dynamically schedule your next deliverables schedule ({cycle.durationLabel}).</p>
                </div>
              </div>

            </div>

            {/* Middle row: Progress Metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col gap-1 relative overflow-hidden">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Total Scheduled Deliverables</span>
                <div className="text-3xl font-black text-white mt-1.5">{totalDeliverables}</div>
                <span className="text-[9px] text-slate-500 font-medium mt-1 block">Full deliverables volume in current cycle</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col gap-1 relative overflow-hidden">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Completed / Approved</span>
                <div className="text-3xl font-black text-emerald-500 mt-1.5 flex items-baseline gap-1.5">
                  {completedDeliverables}
                  <span className="text-[10px] text-slate-500 font-bold">/ {totalDeliverables}</span>
                </div>
                <span className="text-[9px] text-slate-500 font-medium mt-1 block">Tasks ready for social publication</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col gap-1 relative overflow-hidden">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Pending Work in Progress</span>
                <div className="text-3xl font-black text-blue-500 mt-1.5 flex items-baseline gap-1.5">
                  {pendingDeliverables}
                  <span className="text-[10px] text-slate-500 font-bold">/ {totalDeliverables}</span>
                </div>
                <span className="text-[9px] text-slate-500 font-medium mt-1 block">Ongoing creation and editing cycle</span>
              </div>

              {/* Progress Ring Card */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Completion Percentage</span>
                  <div className="text-3xl font-black text-white mt-1">{completionPct}%</div>
                  <span className="text-[9px] text-slate-500 font-medium block">Approved deliverables share</span>
                </div>

                {/* SVG Progress Ring */}
                <div className="relative w-16 h-16 shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-950"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-emerald-500"
                      strokeWidth="3.5"
                      strokeDasharray={`${completionPct}, 100`}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-200">
                    {completionPct}%
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Row: Deliverables Timeline / Checklist */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">

              {/* Filter controls */}
              <div className="p-5 border-b border-slate-800/80 bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-sm text-white">Plan Deliverables Progress Checklist</h3>
                  <p className="text-[10px] text-slate-450 mt-0.5">Track live creation status, assigned departments, and request revisions directly.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Filter tabs */}
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                    {['All', 'Graphics', 'Reels', 'AI Videos', 'Reports'].map(type => (
                      <button
                        key={type}
                        onClick={() => setTaskFilter(type)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition ${taskFilter === type
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-455 hover:text-slate-205'
                          }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  {/* Search box */}
                  <div className="relative w-full md:w-56 shrink-0 text-xs">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                      <Search className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      placeholder="Search deliverables..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-4 py-1.5 border border-slate-850 bg-slate-950 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Checklist Table */}
              <div className="overflow-x-auto">
                <table className="min-w-[720px] w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/40 text-slate-400 font-bold border-b border-slate-800 text-[9px] uppercase tracking-wider">
                      <th className="p-4 pl-6">Estimated Scheduled Date</th>
                      <th className="p-4">Deliverable Title</th>
                      <th className="p-4">Deliverable Category</th>
                      <th className="p-4">Responsible Department</th>
                      <th className="p-4">Production Staff</th>
                      <th className="p-4">Creation Status</th>
                      <th className="p-4 text-right pr-6">Portal Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-855">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-12 text-center text-slate-400 italic">
                          No deliverables match your search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((task) => {
                        const isDone = COMPLETED_STATUSES.includes(task.status);
                        const isRev = task.status === 'Revision';
                        const isProcessing = task.status === 'Processing';
                        const isClientReview = task.status === 'Client Review';
                        const isPending = task.status === 'Pending';
                        const isOverdue = task.status === 'Overdue' || task.status === 'OVERDUE';

                        return (
                          <tr key={task.id} className="hover:bg-slate-955/10 transition text-slate-300">

                            {/* Date */}
                            <td className="p-4 pl-6 font-semibold whitespace-nowrap text-slate-400">
                              {task.date}
                            </td>

                            {/* Title */}
                            <td className="p-4 font-bold text-white">
                              {task.taskTitle}
                              {task.workSampleUrl && (
                                <a
                                  href={task.workSampleUrl.startsWith('http://') || task.workSampleUrl.startsWith('https://') || task.workSampleUrl.startsWith('/') ? task.workSampleUrl : `https://${task.workSampleUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-[10px] text-blue-400 hover:underline mt-1 font-bold"
                                >
                                  🔗 View Content Draft
                                </a>
                              )}
                            </td>

                            {/* Category */}
                            <td className="p-4 font-medium uppercase text-[10px]">
                              <span className={`px-2 py-0.5 rounded border ${task.postType === 'Graphic' ? 'bg-indigo-950/30 text-indigo-400 border-indigo-900/40' :
                                task.postType === 'Reel' ? 'bg-pink-955/30 text-pink-400 border-pink-900/40' :
                                  task.postType === 'AI Video' ? 'bg-purple-950/30 text-purple-400 border-purple-900/40' :
                                    'bg-slate-800/40 text-slate-400 border-slate-700/40'
                                }`}>
                                {task.postType || 'Content'}
                              </span>
                            </td>

                            {/* Department */}
                            <td className="p-4 text-slate-400 font-semibold">
                              {task.assignTo}
                            </td>

                            {/* Production Staff */}
                            <td className="p-4 text-slate-300 font-bold">
                              {task.workingOn || 'Pending Pool Allocation'}
                            </td>

                            {/* Status */}
                            <td className="p-4 font-bold">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider ${isDone ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/50' :
                                isRev ? 'bg-red-955 text-red-400 border border-red-900/50' :
                                  isProcessing ? 'bg-blue-950 text-blue-400 border border-blue-900/50' :
                                    isClientReview ? 'bg-amber-955/40 text-amber-400 border border-amber-900/40' :
                                      isOverdue ? 'bg-rose-950 text-rose-400 border border-rose-900/50' :
                                        isPending ? 'bg-orange-950 text-orange-400 border border-orange-900/50' :
                                          'bg-slate-900 text-slate-400 border border-slate-800'
                                }`}>
                                {isDone ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>Approved</span>
                                  </>
                                ) : isRev ? (
                                  <>
                                    <AlertCircle className="w-3 h-3 text-red-400" />
                                    <span>Revision</span>
                                  </>
                                ) : isProcessing ? (
                                  <>
                                    <Clock className="w-3 h-3 text-blue-400 animate-pulse" />
                                    <span>Processing</span>
                                  </>
                                ) : isClientReview ? (
                                  <>
                                    <Info className="w-3 h-3 text-amber-400 animate-pulse" />
                                    <span>Client Review</span>
                                  </>
                                ) : isOverdue ? (
                                  <>
                                    <AlertCircle className="w-3 h-3 text-rose-450" />
                                    <span>Overdue</span>
                                  </>
                                ) : isPending ? (
                                  <>
                                    <Clock className="w-3 h-3 text-orange-400" />
                                    <span>Pending</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span>Scheduled</span>
                                  </>
                                )}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="p-4 text-right pr-6 whitespace-nowrap">
                              {isClientReview && (
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => handleApproveTask(task)}
                                    className="py-1 px-2.5 rounded-lg text-[9px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition shadow-sm"
                                  >
                                    Approve & Complete
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRevisionTask(task);
                                      setShowRevisionModal(true);
                                    }}
                                    className="py-1 px-2.5 rounded-lg text-[9px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-350 border border-slate-700 cursor-pointer transition shadow-sm"
                                  >
                                    Request Revision
                                  </button>
                                </div>
                              )}
                              {isDone && (
                                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 justify-end">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  Ready
                                </span>
                              )}
                              {!isClientReview && !isDone && (
                                <span className="text-[10px] text-slate-500 font-medium italic">
                                  In Production
                                </span>
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
        ) : activePortalTab === 'feedback' ? (
          /* Feedback & Concerns Portal tab */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in text-xs">

            {/* Submit Form Card */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[480px]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    Submit Feedback & Concerns
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">Provide your valuable review or raise issues regarding client account deliverables directly to managers.</p>
                </div>

                {feedbackSuccess && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-xl flex items-center gap-2 text-emerald-400 font-bold">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{feedbackSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleSubmitFeedback} className="space-y-4">

                  {/* Type Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Submission Category</label>
                    <div className="flex gap-4">
                      {[
                        { key: 'Feedback', label: 'General Review / Feedback' },
                        { key: 'Concern', label: 'Work Concern / Issue' }
                      ].map(t => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => {
                            setFeedbackType(t.key);
                            setFeedbackSuccess('');
                          }}
                          className={`flex-1 p-3 rounded-xl border text-[10px] font-bold text-left transition flex items-center justify-between cursor-pointer ${feedbackType === t.key
                            ? t.key === 'Feedback'
                              ? 'bg-emerald-950/20 border-emerald-500 text-emerald-400 shadow-sm'
                              : 'bg-red-955/15 border-red-500 text-red-400 shadow-sm'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-950/85'
                            }`}
                        >
                          <span>{t.label}</span>
                          <span className={`w-2 h-2 rounded-full ${feedbackType === t.key
                            ? t.key === 'Feedback' ? 'bg-emerald-500' : 'bg-red-500'
                            : 'bg-slate-800'
                            }`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Star Rating - Only visible if Type is Feedback */}
                  {feedbackType === 'Feedback' && (
                    <div className="space-y-2 animate-fade-in">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Select Rating</label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setFeedbackRating(star)}
                            className="p-1 cursor-pointer transition transform hover:scale-110"
                          >
                            <svg
                              className={`w-6 h-6 ${star <= feedbackRating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                                }`}
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 h 14.14 2 9.27 8.91 8.26 12" />
                            </svg>
                          </button>
                        ))}
                        <span className="text-[10px] text-slate-400 font-bold ml-2">
                          ({feedbackRating === 5 ? 'Excellent' : feedbackRating === 4 ? 'Very Good' : feedbackRating === 3 ? 'Good' : feedbackRating === 2 ? 'Fair' : 'Poor'})
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Message Input */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      {feedbackType === 'Feedback' ? 'Review Message' : 'Describe your Concern / Issue'}
                    </label>
                    <textarea
                      value={feedbackMessage}
                      onChange={(e) => {
                        setFeedbackMessage(e.target.value);
                        setFeedbackSuccess('');
                      }}
                      placeholder={
                        feedbackType === 'Feedback'
                          ? "Share your overall experience with our service, graphics, timing, or employee work..."
                          : "Provide specific details of the issue or concern. E.g., wrong logo used, tone adjustment needed, or schedule delays..."
                      }
                      rows={5}
                      required
                      className="w-full p-3 border border-slate-800 bg-slate-950 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    ></textarea>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={actionLoading || !feedbackMessage.trim()}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold transition flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer text-[10px] uppercase tracking-wider
                      ${feedbackType === 'Feedback'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/10'
                        : 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/10'
                      }`}
                  >
                    {actionLoading ? 'Submitting...' : `Submit Client ${feedbackType}`}
                  </button>

                </form>
              </div>

              <div className="mt-6 flex items-start gap-2 text-[10px] text-slate-450 bg-slate-950/30 p-2.5 rounded-xl border border-slate-800/40">
                <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <p>Concerns and reviews are directly routed to the Admin panel. If you need immediate direct help, please reach out to your campaign executive.</p>
              </div>

            </div>

            {/* Submissions Log History Card */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4 max-h-[580px] overflow-hidden">
              <div>
                <h3 className="font-extrabold text-sm text-white">Submissions History</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Track reviews and issues previously raised for this contract.</p>
              </div>

              {/* History list */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {feedbacks.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-slate-400 italic text-[10px]">
                    No feedback or concerns submitted yet.
                  </div>
                ) : (
                  feedbacks.map((fb) => {
                    const isPending = fb.status === 'Pending';
                    const isConcern = fb.type === 'Concern';
                    const dateObj = new Date(fb.createdAt);

                    return (
                      <div
                        key={fb.id}
                        className={`p-3.5 rounded-xl border flex flex-col gap-2.5 bg-slate-950/35 transition ${isConcern
                          ? 'border-red-950/60 hover:border-red-900/60'
                          : 'border-slate-800 hover:border-slate-700'
                          }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${isConcern ? 'bg-red-950/60 text-red-400 border border-red-900/50' : 'bg-emerald-950 text-emerald-400 border border-emerald-900/40'
                              }`}>
                              {fb.type}
                            </span>

                            {/* Stars rating if feedback */}
                            {!isConcern && fb.rating && (
                              <div className="flex items-center text-amber-400">
                                {Array.from({ length: fb.rating }).map((_, idx) => (
                                  <span key={idx}>★</span>
                                ))}
                              </div>
                            )}
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[7px] font-bold uppercase tracking-wider ${isPending
                            ? 'bg-slate-800 text-slate-350 border border-slate-700/60'
                            : 'bg-emerald-955/80 text-emerald-400 border border-emerald-900/60'
                            }`}>
                            {fb.status}
                          </span>
                        </div>

                        <p className="text-slate-300 font-medium whitespace-pre-wrap leading-relaxed text-[10px]">
                          {fb.message}
                        </p>

                        <div className="text-[8px] text-slate-500 font-bold border-t border-slate-850/60 pt-2 flex justify-between">
                          <span>Submitted</span>
                          <span>{dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        ) : activePortalTab === 'onboarding' ? (
          <BrandOnboardingForm
            clientInfo={clientInfo}
            assignedExecutive={tasks.find(t => t.workingOn && t.workingOn !== 'AUTO' && (t.assignTo?.toLowerCase().includes('digital marketing') || t.assignTo?.toLowerCase().includes('social media') || t.assignTo?.toLowerCase().includes('posting') || t.postType?.toLowerCase().includes('report')))?.workingOn || tasks.find(t => t.workingOn && t.workingOn !== 'AUTO')?.workingOn || 'Assigned Executive'}
            onSaveSuccess={fetchClientData}
          />
        ) : null}

      </main>

      {/* Revision notes popup Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-4 sm:p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">

            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-extrabold text-sm text-white">Submit Revision Request</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Task: {revisionTask?.taskTitle} | Assigned to {revisionTask?.workingOn}</p>
              </div>
              <button
                onClick={() => {
                  setShowRevisionModal(false);
                  setRevisionTask(null);
                }}
                className="text-slate-450 hover:text-slate-200 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitRevisionRequest} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Revision Instructions</label>
                <textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="Provide precise details of what changes are required for this deliverable..."
                  rows={4}
                  required
                  className="w-full p-3 border border-slate-800 bg-slate-950 rounded-xl text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRevisionModal(false);
                    setRevisionTask(null);
                  }}
                  className="px-3.5 py-2 border border-slate-800 hover:bg-slate-800 text-[10px] font-bold rounded-lg text-slate-400 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-[10px] font-bold rounded-lg text-white shadow-sm shadow-blue-500/10 transition cursor-pointer"
                >
                  {actionLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
