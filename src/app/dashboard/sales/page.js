'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  CheckSquare,
  Building,
  Calendar,
  LogOut,
  PhoneCall,
  Search,
  Plus,
  Edit,
  Phone,
  Mail,
  MessageCircle,
  FileText,
  MessageSquare,
  Trash2,
  Menu,
  X,
  Bell,
  Loader2
} from 'lucide-react';
import AdminPreviewBanner from '@/components/AdminPreviewBanner';

const safeISOString = (val, sliceLength = 16) => {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, sliceLength);
  } catch {
    return '';
  }
};

const getCampaign = (call) => {
  if (!call) return 'Direct / Native Lead';
  if (call.leadSource) return call.leadSource;
  if (call.notes && call.notes.includes('[Campaign:')) {
    const match = call.notes.match(/\[Campaign:\s*([^\]]+)\]/);
    if (match && match[1]) return match[1].trim();
  }
  return 'Direct / Native Lead';
};

export default function SalesDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Data states
  const [tasksList, setTasksList] = useState([]);
  const [todayLog, setTodayLog] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [callsList, setCallsList] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [otherOption, setOtherOption] = useState('Switch Off');

  // Timer States
  const [timeStr, setTimeStr] = useState('');
  const [workDuration, setWorkDuration] = useState('00:00:00');
  const [toast, setToast] = useState({ message: '', type: '' });
  const [darkMode, setDarkMode] = useState(false);

  // New Call Modal State
  const [showCallModal, setShowCallModal] = useState(false);
  const [newCallData, setNewCallData] = useState({
    clientName: '',
    phoneNumber: '',
    status: 'PENDING',
    requirement: '',
    notes: '',
    followUpDate: '',
    expectedValue: ''
  });

  const [selectedCampaign, setSelectedCampaign] = useState('All Campaigns');
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState(null);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [followUpData, setFollowUpData] = useState({
    currentUpdate: 'Select',
    nextRemark: '',
    nextAction: 'Follow-Up Scheduled',
    scheduleDate: '',
    interestedIn: [],
    classification: 'Hot Lead',
    packageName: 'Meta Ads Management',
    packagePrice: '',
    expectedClosingDate: ''
  });

  useEffect(() => {
    if (selectedLeadId) {
      const activeCall = callsList.find(c => c.id === selectedLeadId);
      if (activeCall) {
        setFollowUpData({
          currentUpdate: 'Select',
          nextRemark: '',
          nextAction: 'Follow-Up Scheduled',
          scheduleDate: activeCall.followUpDate 
            ? safeISOString(activeCall.followUpDate, 16) 
            : new Date().toISOString().slice(0, 16),
          interestedIn: activeCall.notes && activeCall.notes.includes('[Campaign:')
            ? [getCampaign(activeCall)]
            : [],
          classification: activeCall.status === 'ANSWERED' ? 'Hot Lead' : (activeCall.status === 'INTERESTED' ? 'Hot Lead' : 'Follow up'),
          packageName: activeCall.packageName || 'Meta Ads Management',
          packagePrice: activeCall.expectedValue ? String(activeCall.expectedValue) : '',
          expectedClosingDate: safeISOString(activeCall.expectedClosingDate, 10)
        });
      }
    }
    setShowFollowUpForm(false);
  }, [selectedLeadId]);

  const [softphone, setSoftphone] = useState({
    active: false,
    status: 'calling',
    seconds: 0,
    clientName: '',
    phoneNumber: '',
    leadId: null,
    muted: false,
    speaker: false
  });

  useEffect(() => {
    let timeout = null;
    if (softphone.active && softphone.status === 'calling') {
      timeout = setTimeout(() => {
        setSoftphone(prev => ({ ...prev, status: 'connected' }));
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [softphone.active, softphone.status]);

  useEffect(() => {
    let interval = null;
    if (softphone.active && softphone.status === 'connected') {
      interval = setInterval(() => {
        setSoftphone(prev => ({ ...prev, seconds: prev.seconds + 1 }));
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [softphone.active, softphone.status]);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 4000);
  };

  useEffect(() => {
    const clock = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    let timer;
    if (todayLog && !todayLog.clockOut) {
      timer = setInterval(() => {
        const start = new Date(todayLog.clockIn).getTime();
        const diff = new Date().getTime() - start;
        const hrs = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setWorkDuration(`${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }, 1000);
    } else {
      setWorkDuration('00:00:00');
    }
    return () => clearInterval(timer);
  }, [todayLog]);

  const refreshData = async (userId) => {
    try {
      const currentId = userId || currentUser?.id;
      const callsQuery = currentId ? `?salesPersonId=${currentId}` : '';
      const [tasksRes, attRes, callsRes, campaignsRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/attendance'),
        fetch(`/api/calls${callsQuery}`),
        fetch('/api/campaigns')
      ]);
      const [tasksData, attData, callsData, campaignsData] = await Promise.all([
        tasksRes.json(), attRes.json(), callsRes.json(), campaignsRes.json()
      ]);
      setTasksList(tasksData.tasks || []);
      setTodayLog(attData.todayLog);
      setAttendanceLogs(attData.logs || []);
      setCallsList(callsData.calls || []);
      setCampaigns(campaignsData.campaigns || []);
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  };

  useEffect(() => {
    async function initDashboard() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        const allowedRoles = ['SALES', 'ADMIN', 'CEO'];
        if (!res.ok || !data.user || !allowedRoles.includes(data.user.role)) {
          router.push('/');
          return;
        }
        setCurrentUser(data.user);
        await refreshData(data.user.id);
        setLoading(false);
      } catch (err) {
        console.error(err);
        router.push('/');
      }
    }
    initDashboard();
  }, [router]);

  const handleClearAllLeads = async () => {
    if (!window.confirm('Are you sure you want to delete all test leads? This will reset your dashboard.')) return;
    try {
      const res = await fetch('/api/dev/clean-sales-data');
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'All test leads cleared successfully!');
        setSelectedLeadId(null);
        await refreshData(currentUser?.id);
      } else {
        showToast(data.error || 'Failed to clear leads', 'error');
      }
    } catch (err) {
      showToast('Error clearing leads', 'error');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const handleClockToggle = async () => {
    try {
      let locationLink = null;
      if (!todayLog || todayLog.clockOut) {
        if (navigator.geolocation) {
          try {
            const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
            });
            locationLink = `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`;
          } catch (e) {
            locationLink = 'Location Blocked';
          }
        }
      }
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: locationLink })
      });
      const data = await res.json();
      if (!res.ok) return showToast(data.error || 'Action failed', 'error');
      showToast(data.message);
      await refreshData();
    } catch (err) {
      showToast('Connection error.', 'error');
    }
  };

  const handleAddCall = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        clientName: newCallData.clientName,
        phoneNumber: newCallData.phoneNumber,
        status: newCallData.status,
        notes: newCallData.notes || '',
        followUpDate: newCallData.followUpDate ? new Date(newCallData.followUpDate).toISOString() : null,
        expectedValue: newCallData.expectedValue ? parseFloat(newCallData.expectedValue) : null,
        leadSource: newCallData.requirement || '',
        salesPersonId: currentUser.id
      };

      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Call logged successfully!');
        setShowCallModal(false);
        setNewCallData({ clientName: '', phoneNumber: '', status: 'PENDING', requirement: '', notes: '', followUpDate: '', expectedValue: '' });
        await refreshData(currentUser.id);
      } else {
        showToast('Failed to log call', 'error');
      }
    } catch (err) {
      showToast('Connection error', 'error');
    }
  };

  const handleUpdateCallStatus = async (callId, newStatus) => {
    try {
      const res = await fetch(`/api/calls/${callId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showToast('Status updated!');
        await refreshData();
      }
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleWhatsAppClick = async (call) => {
    try {
      const res = await fetch(`/api/whatsapp/verify?phone=${encodeURIComponent(call.phoneNumber)}`);
      const data = await res.json();
      if (data.exists) {
        const cleanPhone = call.phoneNumber.replace(/\D/g, '');
        const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        window.open(`https://wa.me/${finalPhone}`, '_blank');
      } else {
        showToast('WhatsApp is not found / invalid number!', 'error');
      }
    } catch (err) {
      showToast('Connection error checking WhatsApp.', 'error');
    }
  };

  const [sendingReminderId, setSendingReminderId] = useState(null);

  // Send WhatsApp Reminder via Meta Cloud API
  const handleSendWhatsAppReminder = async (call) => {
    if (!call?.phoneNumber) {
      showToast('No phone number for this lead!', 'error');
      return;
    }
    setSendingReminderId(call.id);
    try {
      const res = await fetch('/api/whatsapp/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: call.id,
          phone: call.phoneNumber,
          clientName: call.clientName,
          scheduledTime: call.followUpDate,
          notes: call.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`WhatsApp reminder sent to ${call.clientName || 'Client'}!`, 'success');
      } else {
        showToast(data.error || 'Failed to send WhatsApp reminder', 'error');
      }
    } catch (err) {
      showToast('Network error sending WhatsApp reminder', 'error');
    } finally {
      setSendingReminderId(null);
    }
  };



  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('DEFAULT');
  const [orderBy, setOrderBy] = useState('PRIORITY');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState('KANBAN');

  const getStatusWeight = (status) => {
    switch (status) {
      case 'CALLBACK': return 1;
      case 'INTERESTED': return 2;
      case 'ANSWERED': return 3;
      case 'NOT_INTERESTED':
      case 'NOT_ANSWERED': return 4;
      case 'RINGING': return 5;
      default: return 6;
    }
  };

  const filteredCalls = callsList.filter(c => {
    const matchesCampaign = selectedCampaign === 'All Campaigns' || getCampaign(c) === selectedCampaign;
    const matchesSearch = c.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phoneNumber?.includes(searchQuery);
    return matchesCampaign && matchesSearch;
  });

  if (sortBy !== 'DEFAULT' || orderBy !== 'DEFAULT') {
    filteredCalls.sort((a, b) => {
      if (sortBy !== 'DEFAULT') {
        const getColorPriority = (status) => {
          if (sortBy === 'YELLOW' && (status === 'CALLBACK' || status === 'RINGING')) return 1;
          if (sortBy === 'BLUE' && status === 'INTERESTED') return 1;
          if (sortBy === 'GREEN' && status === 'ANSWERED') return 1;
          if (sortBy === 'RED' && (status === 'NOT_INTERESTED' || status === 'NOT_ANSWERED')) return 1;
          return 2;
        };
        const pA = getColorPriority(a.status);
        const pB = getColorPriority(b.status);
        if (pA !== pB) return pA - pB;
      }

      if (orderBy === 'PRIORITY') {
        const getPri = (status) => {
          switch (status) {
            case 'ANSWERED': return 1; 
            case 'INTERESTED': return 2; 
            case 'CALLBACK': 
            case 'RINGING': return 3; 
            case 'NOT_INTERESTED':
            case 'NOT_ANSWERED': return 4; 
            default: return 5;
          }
        };
        const priA = getPri(a.status);
        const priB = getPri(b.status);
        if (priA !== priB) return priA - priB;
      } else if (orderBy === 'DESCENDING') {
        return new Date(b.callDate) - new Date(a.callDate);
      } else if (orderBy === 'ASCENDING') {
        return new Date(a.callDate) - new Date(b.callDate);
      }
      return 0;
    });
  }

  const displayedCalls = filteredCalls.filter(c => {
    if (!activeStatusFilter) return true;
    switch (activeStatusFilter) {
      case 'ANSWER':
        return c.status === 'ANSWERED' || c.status === 'INTERESTED';
      case 'RINGING':
        return c.status === 'RINGING' || c.status === 'CALLBACK';
      case 'OTHER':
        return c.status === otherOption.toUpperCase().replace(' ', '_');
      case 'FOLLOW_UP':
        return c.status === 'CALLBACK' || c.status === 'RINGING';
      case 'HOT_LEAD':
        return c.status === 'INTERESTED';
      case 'DONE':
        return c.status === 'ANSWERED';
      case 'UNUSUAL':
        return c.status === 'NOT_INTERESTED' || c.status === 'NOT_ANSWERED';
      default:
        return true;
    }
  });

  const handleStatusFilterClick = (filterKey) => {
    setActiveStatusFilter(prev => prev === filterKey ? null : filterKey);
  };

  const handleOtherOptionChange = (val) => {
    setOtherOption(val);
    setActiveStatusFilter('OTHER');
  };

  const handleSaveFollowUp = async (e, callId) => {
    e.preventDefault();
    if (followUpData.currentUpdate === 'Select') {
      showToast('Please select a current update status.', 'error');
      return;
    }

    let dbStatus = 'PENDING';
    if (followUpData.classification === 'Hot Lead') {
      dbStatus = 'INTERESTED';
    } else if (followUpData.classification === 'Follow up') {
      dbStatus = 'CALLBACK';
    } else if (followUpData.classification === 'Unusual') {
      dbStatus = 'NOT_INTERESTED';
    } else if (followUpData.classification === 'Cold Lead') {
      dbStatus = 'NOT_ANSWERED';
    } else if (followUpData.classification === 'Other') {
      dbStatus = 'PENDING';
    }

    // Override to ANSWERED if conversation was successful
    const isConverted = followUpData.currentUpdate === 'Conversation done' || followUpData.currentUpdate === 'Conversation done(via WhatsApp)';
    if (isConverted) {
      dbStatus = 'ANSWERED';
    }

    const activeCall = callsList.find(c => c.id === callId);
    let noteText = `[Classification: ${followUpData.classification}] [Update: ${followUpData.currentUpdate}] ${followUpData.nextRemark}`;
    if (isConverted && followUpData.packageName) {
      noteText = `[Package: ${followUpData.packageName}] [Amount: ₹${followUpData.packagePrice || '0'}] [Expected Closing: ${followUpData.expectedClosingDate || 'N/A'}] ` + noteText;
    }
    if (followUpData.interestedIn.length > 0) {
      noteText = `[Interested: ${followUpData.interestedIn.join(', ')}] ` + noteText;
    }
    const updatedNotes = activeCall.notes ? `${activeCall.notes}\n${noteText}` : noteText;

    const dealPrice = followUpData.packagePrice !== '' && followUpData.packagePrice !== null && !isNaN(parseFloat(followUpData.packagePrice))
      ? parseFloat(followUpData.packagePrice)
      : (activeCall.expectedValue || null);

    const chosenPackage = isConverted ? followUpData.packageName : (followUpData.packageName || activeCall.packageName || null);
    const closingDate = followUpData.expectedClosingDate 
      ? new Date(followUpData.expectedClosingDate).toISOString() 
      : (activeCall.expectedClosingDate ? new Date(activeCall.expectedClosingDate).toISOString() : null);

    try {
      const res = await fetch(`/api/calls/${callId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: dbStatus,
          notes: updatedNotes,
          followUpDate: followUpData.scheduleDate ? new Date(followUpData.scheduleDate).toISOString() : null,
          expectedValue: dealPrice,
          packageName: chosenPackage,
          expectedClosingDate: closingDate,
          leadSource: followUpData.interestedIn.join(', ')
        })
      });

      if (res.ok) {
        showToast('Follow-up logged successfully!');
        setShowFollowUpForm(false);
        await refreshData();
      } else {
        showToast('Failed to save follow-up', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Connection error', 'error');
    }
  };

  const handleStartCall = async (activeCall) => {
    window.location.href = `tel:${activeCall.phoneNumber}`;
    setShowFollowUpForm(true);
    setSoftphone({
      active: true,
      status: 'calling',
      seconds: 0,
      clientName: activeCall.clientName,
      phoneNumber: activeCall.phoneNumber,
      leadId: activeCall.id,
      muted: false,
      speaker: false
    });

    try {
      const res = await fetch('/api/calls/dial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: activeCall.phoneNumber,
          salesPersonId: currentUser?.id
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Initiating outbound call... Check your phone!', 'success');
      } else {
        console.warn('Click-to-call not configured or profile missing mobile number:', data.error);
      }
    } catch (err) {
      console.error('Telephony dial API call error:', err);
    }
  };

  const handleEndCall = () => {
    if (softphone.status === 'calling') {
      setFollowUpData(prev => ({
        ...prev,
        currentUpdate: 'Phone not reachable',
        nextRemark: prev.nextRemark ? `${prev.nextRemark} (Dial ended without answer)` : 'Dialed, client was not reachable.'
      }));
      showToast('Call cancelled.');
    } else {
      const mins = Math.floor(softphone.seconds / 60);
      const secs = softphone.seconds % 60;
      const durationText = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      
      setFollowUpData(prev => ({
        ...prev,
        currentUpdate: 'Conversation done',
        nextRemark: prev.nextRemark 
          ? `${prev.nextRemark} (Call duration: ${durationText})`
          : `Call completed. Duration: ${durationText}`
      }));
      showToast(`Call ended. Duration: ${durationText}`);
    }

    setSoftphone(prev => ({
      ...prev,
      status: 'ended',
      active: false
    }));
  };

  const getStatusStyle = (status, isSelected) => {
    let base = "p-4 border-b border-r-0 border-t-0 border-slate-200 dark:border-slate-800 cursor-pointer transition-colors flex gap-4 border-l-4 ";
    if (isSelected) {
      return base + "bg-[#0f4ca8] text-white border-l-[#0f4ca8]";
    }
    switch (status) {
      case 'CALLBACK': 
      case 'RINGING': return base + 'bg-yellow-50/40 hover:bg-yellow-50 dark:bg-yellow-900/10 dark:hover:bg-yellow-900/20 text-slate-800 dark:text-slate-200 border-l-yellow-400';
      case 'INTERESTED': return base + 'bg-blue-50/40 hover:bg-blue-50 dark:bg-blue-900/10 dark:hover:bg-blue-900/20 text-slate-800 dark:text-slate-200 border-l-blue-400';
      case 'ANSWERED': return base + 'bg-emerald-50/40 hover:bg-emerald-50 dark:bg-emerald-900/10 dark:hover:bg-emerald-900/20 text-slate-800 dark:text-slate-200 border-l-emerald-400';
      case 'NOT_INTERESTED':
      case 'NOT_ANSWERED': return base + 'bg-red-50/40 hover:bg-red-50 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-slate-800 dark:text-slate-200 border-l-red-400';
      default: return base + 'bg-slate-50/40 hover:bg-slate-50 dark:bg-slate-800/30 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200 border-l-slate-300 dark:border-l-slate-600';
    }
  };

  const getStatusDisplayText = (status) => {
    switch(status) {
      case 'CALLBACK': 
      case 'RINGING': return 'FOLLOW-UP';
      case 'INTERESTED': return 'HOT-LEAD';
      case 'ANSWERED': return 'DONE';
      case 'NOT_INTERESTED': 
      case 'NOT_ANSWERED': return 'UNUSUAL';
      default: return status.replace('_', ' ');
    }
  };

  const getStatusBadge = (status, isSelected, isLarge = false) => {
    let classes = `text-[10px] font-extrabold uppercase ${isLarge ? 'px-3 py-1.5 rounded-lg' : 'px-2 py-0.5 rounded'} `;
    if (isSelected) {
      return classes + "bg-white/20 text-white";
    }
    switch(status) {
      case 'CALLBACK': 
      case 'RINGING': return classes + 'bg-yellow-500 text-white border border-yellow-600 shadow-sm dark:bg-yellow-600 dark:border-yellow-700';
      case 'INTERESTED': return classes + 'bg-blue-600 text-white border border-blue-700 shadow-sm dark:bg-blue-700 dark:border-blue-800';
      case 'ANSWERED': return classes + 'bg-emerald-500 text-white border border-emerald-600 shadow-sm dark:bg-emerald-600 dark:border-emerald-700';
      case 'NOT_INTERESTED':
      case 'NOT_ANSWERED': return classes + 'bg-red-500 text-white border border-red-600 shadow-sm dark:bg-red-600 dark:border-red-700';
      default: return classes + 'bg-slate-500 text-white border border-slate-600 shadow-sm dark:bg-slate-600 dark:border-slate-700';
    }
  };

  const getActionText = (status) => {
    switch (status) {
      case 'CALLBACK':
      case 'RINGING':
        return 'Follow-Up Scheduled';
      case 'ANSWERED':
        return 'Conversation Converted';
      case 'INTERESTED':
        return 'Hot Lead Active';
      case 'NOT_INTERESTED':
        return 'Not Interested';
      case 'NOT_ANSWERED':
        return 'Call Disconnected';
      case 'SWITCH_OFF':
        return 'Switch Off';
      case 'BUSY':
        return 'Line Busy';
      case 'INVALID_NUMBER':
        return 'Invalid Number';
      case 'NOT_REACHABLE':
        return 'Not Reachable';
      default:
        return 'Status Updated';
    }
  };

  const getCategoryBadgeText = (status) => {
    switch (status) {
      case 'PENDING':
        return 'New';
      case 'CALLBACK':
      case 'RINGING':
        return 'Follow-up';
      case 'INTERESTED':
        return 'Hot';
      case 'ANSWERED':
        return 'Converted';
      case 'NOT_INTERESTED':
      case 'NOT_ANSWERED':
        return 'Dead';
      default:
        return status.toLowerCase().replace('_', ' ');
    }
  };


  const getCardClassName = (filterKey, baseClasses, activeRingClass) => {
    const isActive = activeStatusFilter === filterKey;
    const isAnyActive = activeStatusFilter !== null;
    
    let classes = `${baseClasses} cursor-pointer select-none transition-all duration-200 `;
    
    if (isActive) {
      classes += `opacity-100 scale-[1.02] z-10 ring-2 ring-offset-2 dark:ring-offset-slate-900 ${activeRingClass}`;
    } else if (isAnyActive) {
      classes += `opacity-40 hover:opacity-80 hover:scale-[1.01] scale-95`;
    } else {
      classes += `opacity-100 hover:scale-[1.03] hover:shadow-md`;
    }
    
    return classes;
  };

  const renderRightPaneContent = (activeCall, camp) => {
    if (showFollowUpForm) {
      return (
        <form onSubmit={(e) => handleSaveFollowUp(e, activeCall.id)} className="w-full text-left flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              Next followup for <span className="text-blue-600 dark:text-blue-400 font-extrabold">{activeCall.clientName}</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowFollowUpForm(false)}
              className="px-3 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition"
            >
              BACK
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Current Update*</label>
            <select
              required
              value={followUpData.currentUpdate}
              onChange={(e) => {
                const val = e.target.value;
                let nextAct = 'Follow-Up Scheduled';
                if (['Conversation done', 'Conversation done(via WhatsApp)', 'Phone not reachable', 'Disconnecting call', 'Switch Off', 'Busy', 'Invalid Number'].includes(val)) {
                  nextAct = 'None';
                }
                setFollowUpData({
                  ...followUpData,
                  currentUpdate: val,
                  nextAction: nextAct,
                  scheduleDate: nextAct === 'None' ? '' : followUpData.scheduleDate
                });
              }}
              className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition cursor-pointer"
            >
              <option value="Select" disabled>Select</option>
              <option value="Conversation done">Conversation done</option>
              <option value="Conversation done(via WhatsApp)">Conversation done(via WhatsApp)</option>
              <option value="Phone not reachable">Phone not reachable</option>
              <option value="Phone is ringing">Phone is ringing</option>
              <option value="Disconnecting call">Disconnecting call</option>
              <option value="Call me later">Call me later</option>
              <option value="Reschedule Follow-up">Reschedule Follow-up</option>
              <option value="Switch Off">Switch Off</option>
              <option value="Busy">Busy</option>
              <option value="Invalid Number">Invalid Number</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Next Remark*</label>
            <textarea
              required
              rows="3"
              value={followUpData.nextRemark}
              onChange={(e) => setFollowUpData({ ...followUpData, nextRemark: e.target.value })}
              placeholder="e.g. call on wednesday call closed"
              className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition"
            ></textarea>
            {activeCall.notes && (
              <p className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400/80 mt-1 flex items-center gap-1">
                <span>🔔 Please avoid repeating previous remarks.</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Next Actions*</label>
              <select
                required
                value={followUpData.nextAction}
                onChange={(e) => setFollowUpData({ ...followUpData, nextAction: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition cursor-pointer"
              >
                <option value="Follow-Up Scheduled">Follow-Up Scheduled</option>
                <option value="None">None</option>
                <option value="Callback">Callback</option>
                <option value="Meeting Scheduled">Meeting Scheduled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                {followUpData.nextAction === 'None' ? 'Schedule Date (Optional)' : 'Schedule Date*'}
              </label>
              <input
                required={followUpData.nextAction !== 'None'}
                type="datetime-local"
                value={followUpData.scheduleDate}
                onChange={(e) => setFollowUpData({ ...followUpData, scheduleDate: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Interested in</label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
              {followUpData.interestedIn.map((tag, idx) => (
                <span key={idx} className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md flex items-center gap-1 border border-blue-100 dark:border-blue-900/50 shadow-sm">
                  <span>{tag.replace(' Campaign', '')}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = followUpData.interestedIn.filter((_, i) => i !== idx);
                      setFollowUpData({ ...followUpData, interestedIn: updated });
                    }}
                    className="text-slate-400 hover:text-slate-600 font-extrabold"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="+ Add tag..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = e.target.value.trim();
                    if (val && !followUpData.interestedIn.includes(val)) {
                      setFollowUpData({
                        ...followUpData,
                        interestedIn: [...followUpData.interestedIn, val]
                      });
                      e.target.value = '';
                    }
                  }
                }}
                className="bg-transparent text-xs outline-none px-2 py-0.5 w-24 placeholder-slate-400 text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Lead Classification*</label>
            <select
              required
              value={followUpData.classification}
              onChange={(e) => setFollowUpData({ ...followUpData, classification: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition cursor-pointer"
            >
              <option value="Hot Lead">🔥 Hot Lead</option>
              <option value="Cold Lead">❄️ Cold Lead</option>
              <option value="Follow up">⏰ Follow Up</option>
              <option value="Unusual">⚠️ Unusual</option>
              <option value="Other">📁 Other</option>
            </select>
          </div>

          {/* DYNAMIC PACKAGE & SALES PROJECTION FIELDS (Triggered on Conversation Done or Hot Lead) */}
          <div className={`p-3.5 rounded-xl border transition-all ${
            followUpData.currentUpdate === 'Conversation done' || followUpData.currentUpdate === 'Conversation done(via WhatsApp)'
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 shadow-sm'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <span>📦</span>
                {followUpData.currentUpdate === 'Conversation done' || followUpData.currentUpdate === 'Conversation done(via WhatsApp)'
                  ? 'Converted Deal & Sales Projection Details *'
                  : 'Target Package & Closing Projection (Optional)'}
              </span>
              {(followUpData.currentUpdate === 'Conversation done' || followUpData.currentUpdate === 'Conversation done(via WhatsApp)') && (
                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                  Required for Projection
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Service Package*
                </label>
                <select
                  value={followUpData.packageName}
                  onChange={(e) => setFollowUpData({ ...followUpData, packageName: e.target.value })}
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                >
                  <option value="Meta Ads Management">Meta Ads Management</option>
                  <option value="Google Ads Management">Google Ads Management</option>
                  <option value="Website Design & Development">Website Design & Development</option>
                  <option value="Combo Package (Multiple Services)">Combo Package (Multiple Services)</option>
                  <option value="Custom / Other Service">Custom / Other Service</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Agreed Package Price (₹)*
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 15000"
                    value={followUpData.packagePrice}
                    onChange={(e) => setFollowUpData({ ...followUpData, packagePrice: e.target.value })}
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Expected Closing / Payment Date*
              </label>
              <input
                type="date"
                value={followUpData.expectedClosingDate}
                onChange={(e) => setFollowUpData({ ...followUpData, expectedClosingDate: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500 transition cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                📅 When client is expected to pay or onboarding starts. Directly feeds monthly sales projection metrics.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowFollowUpForm(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-sm text-slate-600 dark:text-slate-300 transition text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#0f4ca8] hover:bg-blue-800 text-white font-bold text-sm transition shadow-md text-center"
            >
              Save Follow-up
            </button>
          </div>
        </form>
      );
    }

    return (
      <>
        <div className="w-24 h-24 bg-slate-300 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 shadow-inner shrink-0">
          <svg className="w-14 h-14 text-slate-500 dark:text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
        </div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1">{activeCall.clientName}</h2>
        <p className="text-slate-600 dark:text-slate-400 font-mono text-lg mb-3">{activeCall.phoneNumber}</p>

        <p className="text-sm font-semibold text-slate-500 mb-1.5 flex items-center gap-1 flex-wrap justify-center">
          Last assigned was <span className="text-red-500 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded text-xs font-bold">2 days</span> ago, Total call duration <span className="text-red-500 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded text-xs font-bold">0 minutes</span>
        </p>
        <p className="text-xs font-bold text-slate-400 flex items-center gap-1 mb-4">
          <Clock className="w-3 h-3" /> Scheduled Follow-up: {activeCall.followUpDate ? new Date(activeCall.followUpDate).toLocaleString() : new Date(activeCall.callDate).toLocaleDateString()}
        </p>

        {/* Highlight converted deal info if present */}
        {(activeCall.packageName || activeCall.expectedValue > 0 || activeCall.expectedClosingDate) && (
          <div className="w-full bg-emerald-50/80 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 mb-4 text-left shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-1">
                <span>📦</span> {activeCall.packageName || 'Confirmed Deal'}
              </span>
              {activeCall.expectedValue > 0 && (
                <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                  ₹{Number(activeCall.expectedValue).toLocaleString()}
                </span>
              )}
            </div>
            {activeCall.expectedClosingDate && (
              <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <span>🎯 Expected Closing / Payment:</span>
                <span className="font-bold underline">{new Date(activeCall.expectedClosingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setShowFollowUpForm(true)}
            className={`${getStatusBadge(activeCall.status, false, true)} cursor-pointer hover:opacity-90 active:scale-95 transition-all outline-none`}
          >
            {getStatusDisplayText(activeCall.status)}
          </button>
          <span className="bg-blue-600 text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg flex items-center gap-1">⚑ New</span>
          <span className="bg-slate-700 text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg> Customer</span>
          <span className="bg-slate-700 text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg flex items-center gap-1">🔒 Private</span>
          <span className="bg-slate-700 text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg flex items-center gap-1">🏷️ {camp.replace(' Campaign', '')}</span>
        </div>

        {activeCall.notes && (
          <div className="w-full text-left bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 mb-6 max-h-40 overflow-y-auto">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Previous Remarks</h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">{activeCall.notes}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md mt-2">
          <button onClick={() => handleStartCall(activeCall)} className="w-12 h-12 rounded-full border-2 border-blue-600 text-blue-600 flex items-center justify-center hover:bg-blue-50 active:scale-95 transition" title="Start Call"><PhoneCall className="w-5 h-5" /></button>
          <button onClick={() => handleStartCall(activeCall)} className="w-12 h-12 rounded-full border-2 border-blue-600 text-blue-600 flex items-center justify-center hover:bg-blue-50 active:scale-95 transition" title="Start Call"><Phone className="w-5 h-5" /></button>
          <button className="w-12 h-12 rounded-full border-2 border-blue-600 text-blue-600 flex items-center justify-center hover:bg-blue-50 transition"><Mail className="w-5 h-5" /></button>
          <button onClick={() => handleWhatsAppClick(activeCall)} className="w-12 h-12 rounded-full border-2 border-emerald-600 text-emerald-600 flex items-center justify-center hover:bg-emerald-50 active:scale-95 transition" title="WhatsApp"><MessageCircle className="w-5 h-5" /></button>
          <button
            onClick={() => handleSendWhatsAppReminder(activeCall)}
            disabled={sendingReminderId === activeCall.id}
            className="w-12 h-12 rounded-full border-2 border-teal-600 text-teal-600 flex items-center justify-center hover:bg-teal-50 active:scale-95 transition disabled:opacity-50"
            title="Send WhatsApp Follow-up Reminder (Meta Cloud API)"
          >
            {sendingReminderId === activeCall.id ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
          </button>
          <button className="w-12 h-12 rounded-full border-2 border-blue-600 text-blue-600 flex items-center justify-center hover:bg-blue-50 transition"><Search className="w-5 h-5" /></button>
          <button className="w-12 h-12 rounded-full border-2 border-blue-600 text-blue-600 flex items-center justify-center hover:bg-blue-50 transition"><Clock className="w-5 h-5" /></button>
          <button className="w-12 h-12 rounded-full border-2 border-blue-600 text-blue-600 flex items-center justify-center hover:bg-blue-50 transition"><FileText className="w-5 h-5" /></button>
          <button className="w-14 h-14 rounded-full bg-blue-700 text-white flex items-center justify-center shadow-lg hover:bg-blue-600 transition ml-2"><MessageSquare className="w-6 h-6" fill="currentColor" /></button>
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 overflow-hidden">
      {/* Admin Preview Mode Banner */}
      <AdminPreviewBanner currentUserName={currentUser?.name} />

      {/* Toast Alert */}
      {toast.message && (
        <div className={`fixed bottom-5 right-5 z-[70] p-4 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-semibold 
          ${toast.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 text-emerald-800 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/80 border-red-200 text-red-800 dark:text-red-300'}`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Dashboard Body: Sidebar + Main Panel */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 w-full overflow-hidden relative">

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Building className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            WorkForce OS
          </span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${
        isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}>
        <div>
          <div className="flex p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                <Building className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                WorkForce OS
              </span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-800/20">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-lg font-bold">
              {currentUser.avatar || '👤'}
            </div>
            <div className="overflow-hidden">
              <div className="font-bold text-sm truncate">{currentUser.name}</div>
              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold uppercase">SALES STAFF</div>
            </div>
          </div>

          <nav className="p-4 flex flex-col gap-1">
            <button onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'overview' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
              <Clock className="w-4 h-4" /> Clock
            </button>
            <button onClick={() => { setActiveTab('tasks'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'tasks' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
              <CheckSquare className="w-4 h-4" /> CRM Dashboard
            </button>
            <button onClick={() => { setActiveTab('followups'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'followups' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
              <Calendar className="w-4 h-4" /> Today&apos;s Followup
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative h-[calc(100vh-65px)] md:h-screen w-full">
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0">
          <h1 className="text-lg sm:text-xl font-bold capitalize">
            {activeTab === 'tasks' ? 'Overview' : activeTab === 'followups' ? "Today's Followup" : 'Clock'}
          </h1>
          <div className="font-mono text-sm sm:text-base font-semibold bg-slate-100 dark:bg-slate-900 px-2.5 sm:px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
            {timeStr}
          </div>
        </header>

        <div className="p-3 sm:p-5 md:p-6 min-h-[calc(100vh-4rem)]">
          {activeTab === 'overview' && (
            <div className="max-w-3xl mx-auto">
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

              {/* Clock Logs history */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm mt-6">
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
          )}

          {activeTab === 'tasks' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Sales Performance Overview</h3>
                  <p className="text-slate-500 text-xs mt-1">Analytics and metrics for your calling campaigns.</p>
                </div>
                <div className="w-full sm:w-auto">
                  <select
                    value={selectedCampaign}
                    onChange={(e) => setSelectedCampaign(e.target.value)}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow cursor-pointer"
                  >
                    <option value="All Campaigns">All Campaigns</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2 Main Boxes Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
                {/* Box 1: Answer, Ringing, Other */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Call Status</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div
                      onClick={() => handleStatusFilterClick('ANSWER')}
                      className={getCardClassName('ANSWER', 'bg-emerald-500 dark:bg-emerald-600 p-3 rounded-xl border border-emerald-600 dark:border-emerald-700 flex flex-col justify-center text-white shadow-sm shadow-emerald-500/20', 'ring-emerald-400')}
                    >
                      <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider mb-1">Answer</span>
                      <div className="text-2xl font-black text-white">
                        {filteredCalls.filter(c => c.status === 'ANSWERED' || c.status === 'INTERESTED').length}
                      </div>
                    </div>
                    <div
                      onClick={() => handleStatusFilterClick('RINGING')}
                      className={getCardClassName('RINGING', 'bg-yellow-500 dark:bg-yellow-600 p-3 rounded-xl border border-yellow-600 dark:border-yellow-700 flex flex-col justify-center text-white shadow-sm shadow-yellow-500/20', 'ring-yellow-400')}
                    >
                      <span className="text-[10px] font-bold text-yellow-100 uppercase tracking-wider mb-1">Ringing</span>
                      <div className="text-2xl font-black text-white">
                        {filteredCalls.filter(c => c.status === 'RINGING' || c.status === 'CALLBACK').length}
                      </div>
                    </div>
                    <div
                      onClick={() => handleStatusFilterClick('OTHER')}
                      className={getCardClassName('OTHER', 'bg-slate-700 dark:bg-slate-800 p-3 rounded-xl border border-slate-800 dark:border-slate-900 flex flex-col justify-center relative text-white shadow-sm shadow-slate-700/20', 'ring-slate-400')}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <select
                          value={otherOption}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleOtherOptionChange(e.target.value)}
                          className="text-xs font-bold text-slate-300 uppercase tracking-wider bg-transparent outline-none cursor-pointer appearance-none pr-5 w-full"
                        >
                          <option className="text-slate-800" value="Switch Off">Switch Off</option>
                          <option className="text-slate-800" value="Not Reachable">Not Reachable</option>
                          <option className="text-slate-800" value="Busy">Busy</option>
                          <option className="text-slate-800" value="Invalid Number">Invalid Number</option>
                        </select>
                        <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400 text-[10px]">▼</div>
                      </div>
                      <div className="text-2xl font-black text-white">
                        {filteredCalls.filter(c => c.status === otherOption.toUpperCase().replace(' ', '_')).length}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Box 2: Follow-up, Hot-Lead, done, Unusual */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Lead Categories</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div
                      onClick={() => handleStatusFilterClick('FOLLOW_UP')}
                      className={getCardClassName('FOLLOW_UP', 'bg-yellow-500 dark:bg-yellow-600 p-3 rounded-xl border border-yellow-600 dark:border-yellow-700 flex flex-col justify-center text-white shadow-sm shadow-yellow-500/20', 'ring-yellow-400')}
                    >
                      <span className="text-[10px] font-bold text-yellow-100 uppercase tracking-wider mb-1">Follow-up</span>
                      <div className="text-2xl font-black text-white">
                        {filteredCalls.filter(c => c.status === 'CALLBACK' || c.status === 'RINGING').length}
                      </div>
                    </div>
                    <div
                      onClick={() => handleStatusFilterClick('HOT_LEAD')}
                      className={getCardClassName('HOT_LEAD', 'bg-blue-600 dark:bg-blue-700 p-3 rounded-xl border border-blue-700 dark:border-blue-800 flex flex-col justify-center text-white shadow-sm shadow-blue-600/20', 'ring-blue-400')}
                    >
                      <span className="text-[10px] font-bold text-blue-100 uppercase tracking-wider mb-1">Hot-Lead</span>
                      <div className="text-2xl font-black text-white">
                        {filteredCalls.filter(c => c.status === 'INTERESTED').length}
                      </div>
                    </div>
                    <div
                      onClick={() => handleStatusFilterClick('DONE')}
                      className={getCardClassName('DONE', 'bg-emerald-500 dark:bg-emerald-600 p-3 rounded-xl border border-emerald-600 dark:border-emerald-700 flex flex-col justify-center text-white shadow-sm shadow-emerald-500/20', 'ring-emerald-400')}
                    >
                      <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider mb-1">Done</span>
                      <div className="text-2xl font-black text-white">
                        {filteredCalls.filter(c => c.status === 'ANSWERED').length}
                      </div>
                    </div>
                    <div
                      onClick={() => handleStatusFilterClick('UNUSUAL')}
                      className={getCardClassName('UNUSUAL', 'bg-red-500 dark:bg-red-600 p-3 rounded-xl border border-red-600 dark:border-red-700 flex flex-col justify-center text-white shadow-sm shadow-red-500/20', 'ring-red-400')}
                    >
                      <span className="text-[10px] font-bold text-red-100 uppercase tracking-wider mb-1">Not Interested</span>
                      <div className="text-2xl font-black text-white">
                        {filteredCalls.filter(c => c.status === 'NOT_INTERESTED' || c.status === 'NOT_ANSWERED').length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 3: Meta Marketing Insights */}
              {selectedCampaign !== 'All Campaigns' && (() => {
                const activeCamp = campaigns.find(c => c.name === selectedCampaign);
                if (!activeCamp) return null;
                return (
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4 animate-fade-in mt-2 shrink-0">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="text-blue-500">📊</span> Live Meta Ads Performance
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${activeCamp.status === 'ACTIVE' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                        {activeCamp.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850 flex flex-col justify-center">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Total Ad Spend</span>
                        <div className="text-xl font-black text-slate-900 dark:text-white">₹{activeCamp.spend.toLocaleString()}</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850 flex flex-col justify-center">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Cost Per Lead (CPL)</span>
                        <div className="text-xl font-black text-blue-600 dark:text-blue-400">₹{activeCamp.costPerLead}</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850 flex flex-col justify-center">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Reach / Impressions</span>
                        <div className="text-xl font-black text-slate-900 dark:text-white">{activeCamp.reach.toLocaleString()} / {activeCamp.impressions.toLocaleString()}</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850 flex flex-col justify-center">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Clicks (CTR)</span>
                        <div className="text-xl font-black text-slate-900 dark:text-white">
                          {activeCamp.clicks.toLocaleString()}
                          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 ml-1">
                            ({activeCamp.impressions > 0 ? ((activeCamp.clicks / activeCamp.impressions) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-between items-center mt-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Lead Pipeline</h3>
                  {activeStatusFilter && (
                    <button
                      onClick={() => setActiveStatusFilter(null)}
                      className="text-[11px] font-bold bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md transition flex items-center gap-1 shadow-sm"
                    >
                      Filtered: {activeStatusFilter.replace('_', ' ')}
                      <span className="text-slate-400 dark:text-slate-500 font-normal">×</span>
                    </button>
                  )}
                </div>
                <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                  <button onClick={() => setViewMode('KANBAN')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${viewMode === 'KANBAN' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>KANBAN</button>
                  <button onClick={() => setViewMode('LIST')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>LIST VIEW</button>
                </div>
              </div>

              {/* View Modes */}
              {viewMode === 'LIST' ? (
              <div className="flex flex-col md:flex-row gap-4 mt-2">
                {/* Left Pane: Leads List */}
                <div className={`w-full ${selectedLeadId ? 'hidden md:flex md:w-2/5 lg:w-[45%]' : 'flex'} flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-all duration-300`}>
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-4 shrink-0">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">My Leads</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-bold mt-1">Total Records: {displayedCalls.length}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                        <div className="flex flex-wrap gap-2">
                          <div className="relative">
                            <select
                              value={sortBy}
                              onChange={(e) => setSortBy(e.target.value)}
                              className="appearance-none bg-[#0f4ca8] hover:bg-blue-800 text-white text-xs font-bold px-4 py-1.5 pr-8 rounded cursor-pointer transition outline-none"
                            >
                              <option value="DEFAULT">SORT: DEFAULT</option>
                              <option value="YELLOW">SORT: YELLOW FIRST</option>
                              <option value="BLUE">SORT: BLUE FIRST</option>
                              <option value="GREEN">SORT: GREEN FIRST</option>
                              <option value="RED">SORT: RED FIRST</option>
                            </select>
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white text-[8px]">▼</div>
                          </div>
                          <div className="relative">
                            <select
                              value={orderBy}
                              onChange={(e) => setOrderBy(e.target.value)}
                              className="appearance-none bg-[#0f4ca8] hover:bg-blue-800 text-white text-xs font-bold px-4 py-1.5 pr-8 rounded cursor-pointer transition outline-none"
                            >
                              <option value="PRIORITY">ORDER BY: PRIORITY</option>
                              <option value="DESCENDING">ORDER BY: DESCENDING (NEWEST)</option>
                              <option value="ASCENDING">ORDER BY: ASCENDING (OLDEST)</option>
                            </select>
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white text-[8px]">▼</div>
                          </div>
                        </div>
                        <button onClick={() => setShowCallModal(true)} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1 justify-center transition shadow-sm">New <Plus className="w-3 h-3" /></button>
                        <button onClick={handleClearAllLeads} className="bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold px-2.5 py-1.5 rounded flex items-center gap-1 justify-center transition shadow-sm" title="Clear test leads">
                          <Trash2 className="w-3 h-3 text-rose-400" /> Wipe Test Leads
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by name or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-500 text-xs px-8 py-1.5 rounded outline-none border border-slate-200 dark:border-slate-700 focus:border-blue-400 transition"
                      />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900">
                    {displayedCalls.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-sm">No leads available.</div>
                    ) : (
                      displayedCalls.map(call => {
                        const isSelected = selectedLeadId === call.id;
                        const campaign = getCampaign(call);

                        // Use followUpDate if scheduled, otherwise fallback to callDate
                        const displayDateObj = call.followUpDate ? new Date(call.followUpDate) : new Date(call.callDate);
                        const dateString = displayDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
                        const timeString = displayDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        return (
                          <div
                            key={call.id}
                            onClick={() => setSelectedLeadId(call.id)}
                            className={getStatusStyle(call.status, isSelected)}
                          >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                              <svg className={`w-8 h-8 ${isSelected ? 'text-white' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                            </div>
                            <div className="flex-1 flex justify-between min-w-0">
                              <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <h4 className="font-bold text-sm truncate" title={call.clientName}>{call.clientName}</h4>
                                  <span className={getStatusBadge(call.status, isSelected) + " shrink-0"}>
                                    {getStatusDisplayText(call.status)}
                                  </span>
                                </div>
                                <p className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                  {call.phoneNumber}
                                </p>
                                <p className={`text-xs font-semibold flex items-center gap-1 ${isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                                  {currentUser?.name || 'Aidigital'}
                                </p>
                                <div className={`text-[11px] font-semibold flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-red-300' : 'text-red-600'}`} />
                                    {dateString} {timeString}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                                    {getActionText(call.status)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                                <span className={`text-[10px] font-semibold ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                                  {dateString}
                                </span>
                                <span className={`text-[9px] px-3 py-0.5 rounded-full font-bold uppercase border ${
                                  isSelected 
                                    ? 'border-white/40 text-white bg-white/10' 
                                    : (call.status === 'ANSWERED' || call.status === 'INTERESTED')
                                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                                      : (call.status === 'CALLBACK' || call.status === 'RINGING')
                                        ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400 bg-yellow-50/50 dark:bg-yellow-950/20'
                                        : (call.status === 'NOT_INTERESTED' || call.status === 'NOT_ANSWERED')
                                          ? 'border-red-500 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20'
                                          : 'border-slate-300 text-slate-500 bg-slate-50/50 dark:bg-slate-900/30'
                                }`}>
                                  {getCategoryBadgeText(call.status)}
                                </span>
                                <span className={`text-[9px] px-2 py-0.5 rounded font-bold capitalize ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-800 text-white'}`}>
                                  {campaign.replace(' Campaign', '')}
                                </span>
                                {call.expectedValue > 0 && (
                                  <span className={`text-[9px] px-2 py-0.5 rounded font-black whitespace-nowrap ${
                                    isSelected 
                                      ? 'bg-emerald-400 text-slate-950' 
                                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                  }`}>
                                    ₹{Number(call.expectedValue).toLocaleString()}{call.packageName ? ` • ${call.packageName.replace(' Management', '').replace(' & Development', '')}` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Pane: Detail View */}
                {selectedLeadId && (
                  <div className="w-full md:w-3/5 lg:w-[55%] bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col relative shadow-sm animate-fade-in self-start sticky top-24 h-auto max-h-[85vh] overflow-y-auto">
                    <div onClick={() => setSelectedLeadId(null)} className="absolute top-4 right-4 text-slate-400 cursor-pointer hover:text-slate-600 z-10"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></div>
                    <div className="p-4 sm:p-6 flex flex-col items-center text-center mt-2">
                      {(() => {
                        const activeCall = callsList.find(c => c.id === selectedLeadId);
                        if (!activeCall) return <div className="text-slate-400 mt-20">No lead selected.</div>;
                        const camp = getCampaign(activeCall);
                        return renderRightPaneContent(activeCall, camp);
                      })()}
                    </div>
                  </div>
                )}
              </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-4 mt-2 min-h-[500px]">
                  {/* Kanban Columns */}
                  {[
                    { id: 'PENDING', title: 'New Leads', color: 'bg-slate-500', bg: 'bg-slate-50 dark:bg-slate-900', border: 'border-slate-200 dark:border-slate-800' },
                    { id: 'CALLBACK', title: 'Follow-up', color: 'bg-yellow-500', bg: 'bg-yellow-50/50 dark:bg-yellow-900/10', border: 'border-yellow-200 dark:border-yellow-900/50' },
                    { id: 'INTERESTED', title: 'Hot Leads', color: 'bg-blue-600', bg: 'bg-blue-50/50 dark:bg-blue-900/10', border: 'border-blue-200 dark:border-blue-900/50' },
                    { id: 'ANSWERED', title: 'Converted', color: 'bg-emerald-500', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10', border: 'border-emerald-200 dark:border-emerald-900/50' },
                    { id: 'NOT_INTERESTED', title: 'Dead', color: 'bg-red-500', bg: 'bg-red-50/50 dark:bg-red-900/10', border: 'border-red-200 dark:border-red-900/50' }
                  ].map(col => (
                    <div key={col.id} className={`w-80 shrink-0 rounded-xl border ${col.border} ${col.bg} flex flex-col shadow-sm`}>
                      <div className={`p-3 border-b ${col.border} flex justify-between items-center`}>
                        <h4 className="font-bold text-sm flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${col.color}`}></span>
                          {col.title}
                        </h4>
                        <span className="text-xs font-bold text-slate-500 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full shadow-sm">
                          {displayedCalls.filter(c => col.id === 'CALLBACK' ? (c.status === 'CALLBACK' || c.status === 'RINGING') : (col.id === 'NOT_INTERESTED' ? (c.status === 'NOT_INTERESTED' || c.status === 'NOT_ANSWERED') : c.status === col.id)).length}
                        </span>
                      </div>
                      <div className="p-3 flex-1 overflow-y-auto space-y-3">
                        {displayedCalls
                          .filter(c => col.id === 'CALLBACK' ? (c.status === 'CALLBACK' || c.status === 'RINGING') : (col.id === 'NOT_INTERESTED' ? (c.status === 'NOT_INTERESTED' || c.status === 'NOT_ANSWERED') : c.status === col.id))
                          .map(call => (
                            <div key={call.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer" onClick={() => { setSelectedLeadId(call.id); setViewMode('LIST'); }}>
                              <h5 className="font-bold text-sm text-slate-800 dark:text-white truncate mb-1">{call.clientName}</h5>
                              <p className="text-xs font-mono text-slate-500 mb-2">{call.phoneNumber}</p>
                              {call.followUpDate && (
                                <div className="text-[10px] font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-md mb-2 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {new Date(call.followUpDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                              {call.expectedValue && (
                                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                                  Expected: ₹{call.expectedValue}
                                </div>
                              )}
                              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                                <span className="text-[9px] uppercase font-bold text-slate-400">{getCampaign(call).replace(' Campaign', '')}</span>
                                <button className="text-blue-500 hover:text-blue-700"><PhoneCall className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'followups' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Today&apos;s Follow-ups</h3>
                  <p className="text-slate-500 text-xs mt-1">Leads scheduled for call follow-up on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.</p>
                </div>
              </div>

              {(() => {
                const todayFollowups = callsList
                  .filter(call => {
                    if (!call.followUpDate) return false;
                    const d = new Date(call.followUpDate);
                    const today = new Date();
                    return d.getDate() === today.getDate() &&
                      d.getMonth() === today.getMonth() &&
                      d.getFullYear() === today.getFullYear();
                  })
                  .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate));

                return (
                  <div className="flex flex-col md:flex-row gap-6 items-start mt-2">
                    {/* Left Pane: Follow-up Leads List */}
                    <div className={`w-full ${selectedLeadId ? 'hidden md:flex md:w-2/5 lg:w-[45%]' : 'flex'} flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-all duration-300`}>
                      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                        <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">Follow-up Queue</h3>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">{todayFollowups.length} scheduled</span>
                      </div>

                      <div className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
                        {todayFollowups.length === 0 ? (
                          <div className="p-8 text-center text-slate-500 text-sm flex flex-col items-center justify-center gap-3">
                            <span className="text-3xl">🎉</span>
                            <div>No follow-ups scheduled for today.</div>
                          </div>
                        ) : (
                          todayFollowups.map(call => {
                            const isSelected = selectedLeadId === call.id;
                            const campaign = getCampaign(call);
                            const timeString = new Date(call.followUpDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                            return (
                              <div
                                key={call.id}
                                onClick={() => setSelectedLeadId(call.id)}
                                className={getStatusStyle(call.status, isSelected)}
                              >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                  <svg className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                                </div>
                                <div className="flex-1 flex justify-between min-w-0">
                                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <h4 className="font-bold text-sm truncate" title={call.clientName}>{call.clientName}</h4>
                                      <span className={getStatusBadge(call.status, isSelected) + " shrink-0"}>
                                        {getStatusDisplayText(call.status)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-semibold">
                                      <span className={isSelected ? 'text-white/80' : 'text-slate-500 dark:text-slate-400 font-mono'}>{call.phoneNumber}</span>
                                      <span className={isSelected ? 'text-white/60' : 'text-slate-400'}>•</span>
                                      <span className={`flex items-center gap-1 font-bold ${isSelected ? 'text-yellow-200' : 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 px-1.5 py-0.5 rounded'}`}>
                                        <Clock className="w-3 h-3" /> {timeString}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Right Pane: Detail View */}
                    {selectedLeadId && (() => {
                      const activeCall = callsList.find(c => c.id === selectedLeadId);
                      if (!activeCall) return null;
                      const camp = getCampaign(activeCall);
                      return (
                        <div className="w-full md:w-3/5 lg:w-[55%] bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col relative shadow-sm animate-fade-in self-start sticky top-24">
                          <div onClick={() => setSelectedLeadId(null)} className="absolute top-4 right-4 text-slate-400 cursor-pointer hover:text-slate-600 z-10"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></div>
                          <div className="p-4 sm:p-6 flex flex-col items-center text-center mt-2">
                            {renderRightPaneContent(activeCall, camp)}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </main>
      </div>

      {/* New Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold">Log New Call</h2>
              <button onClick={() => setShowCallModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                ✕
              </button>
            </div>
            <form onSubmit={handleAddCall} className="p-4 sm:p-6 flex flex-col gap-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold mb-1">Client Name</label>
                <input required type="text" className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  value={newCallData.clientName} onChange={e => setNewCallData({ ...newCallData, clientName: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Phone Number</label>
                <input required type="text" className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  value={newCallData.phoneNumber} onChange={e => setNewCallData({ ...newCallData, phoneNumber: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Status</label>
                <select className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                  value={newCallData.status} onChange={e => setNewCallData({ ...newCallData, status: e.target.value })}>
                  <option value="PENDING">Pending</option>
                  <option value="INTERESTED">Interested</option>
                  <option value="NOT_INTERESTED">Not Interested</option>
                  <option value="CALLBACK">Callback</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Customer Requirement</label>
                <textarea
                  className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  rows="3"
                  placeholder="e.g. looking for dynamic website plan..."
                  value={newCallData.requirement}
                  onChange={e => setNewCallData({ ...newCallData, requirement: e.target.value })}
                ></textarea>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Follow-up Date</label>
                  <input type="datetime-local" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    value={newCallData.followUpDate} onChange={e => setNewCallData({ ...newCallData, followUpDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Expected Value (₹)</label>
                  <input type="number" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="0.00" value={newCallData.expectedValue} onChange={e => setNewCallData({ ...newCallData, expectedValue: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Notes</label>
                <textarea
                  className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  rows="3"
                  value={newCallData.notes}
                  onChange={e => setNewCallData({ ...newCallData, notes: e.target.value })}
                ></textarea>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row justify-end gap-3 shrink-0 mt-2">
                <button type="button" onClick={() => setShowCallModal(false)} className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition text-center">Cancel</button>
                <button type="submit" className="w-full sm:w-auto px-4 py-2 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 rounded-lg transition shadow-md text-center">Save Call Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Softphone Dialer Overlay */}
      {softphone.active && (
        <div className="fixed bottom-6 right-6 z-50 w-80 bg-slate-900/95 dark:bg-slate-950/95 text-white border border-slate-700/50 dark:border-slate-800 rounded-2xl shadow-2xl p-4 flex flex-col gap-4 backdrop-blur-md animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">AiDigital Telephony</span>
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${softphone.status === 'calling' ? 'bg-yellow-400 animate-ping' : 'bg-emerald-500'}`}></span>
              <span className="text-[10px] font-bold uppercase text-slate-300">
                {softphone.status === 'calling' ? 'Calling...' : 'Connected'}
              </span>
            </div>
          </div>

          {/* Client Details */}
          <div className="flex items-center gap-3 py-1">
            <div className="w-12 h-12 bg-slate-800 dark:bg-slate-900 rounded-full flex items-center justify-center border border-slate-700">
              <svg className="w-6 h-6 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm truncate text-white">{softphone.clientName}</h4>
              <p className="text-xs text-slate-400 font-mono">{softphone.phoneNumber}</p>
            </div>
          </div>

          {/* Call Status & Timer */}
          <div className="flex flex-col items-center justify-center py-2 bg-slate-800/40 dark:bg-slate-900/30 rounded-xl border border-slate-850">
            {softphone.status === 'calling' ? (
              <p className="text-xs text-yellow-400 animate-pulse font-semibold">Simulating outgoing connection...</p>
            ) : (
              <div className="flex flex-col items-center">
                <p className="text-xs text-emerald-400 font-semibold mb-0.5">Call Active</p>
                <p className="text-2xl font-black font-mono tracking-wider text-slate-100">
                  {Math.floor(softphone.seconds / 60).toString().padStart(2, '0')}:
                  {(softphone.seconds % 60).toString().padStart(2, '0')}
                </p>
              </div>
            )}
          </div>

          {/* Controls & End Call */}
          <div className="flex items-center justify-around mt-1">
            <button
              onClick={() => setSoftphone(p => ({ ...p, muted: !p.muted }))}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition border ${
                softphone.muted 
                  ? 'bg-red-500/20 border-red-500/30 text-red-400' 
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title={softphone.muted ? 'Unmute' : 'Mute'}
            >
              {softphone.muted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
              )}
            </button>

            <button
              onClick={handleEndCall}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition transform hover:scale-105 active:scale-95"
              title="Hang Up"
            >
              <svg className="w-6 h-6 rotate-[135deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8l2 2 4-4M5 3h4l2 5-2.5 2.5a11.022 11.022 0 005 5l2.5-2.5 5 2V19a2 2 0 01-2 2c-9.5 0-17-7.5-17-17a2 2 0 012-2z"></path></svg>
            </button>

            <button
              onClick={() => setSoftphone(p => ({ ...p, speaker: !p.speaker }))}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition border ${
                softphone.speaker 
                  ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' 
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Speakerphone"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
