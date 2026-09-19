'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  PhoneCall,
  UserCheck,
  Search,
  Plus,
  Edit2,
  Trash2,
  Phone,
  MessageCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  Flame,
  CheckCircle2,
  Clock,
  Filter,
  ArrowRight,
  UserPlus,
  RefreshCw,
  ExternalLink,
  Tag,
  AlertCircle,
  Layers,
  BarChart3,
  Check,
  X,
  FileSpreadsheet,
  Mail,
  MessageSquare,
  ArrowLeft,
  Bell,
  Loader2
} from 'lucide-react';
import ExcelImportModal from '@/components/ExcelImportModal';

export default function AdminSellerDashboard({ usersList = [], refreshData }) {
  // 1. STRICT FILTER: ONLY SALES PERSONS (Do not show any other employee roles)
  const salesUsers = useMemo(() => {
    return (usersList || []).filter(u => 
      u.role === 'SALES' || 
      (u.department && u.department.toLowerCase().includes('sales')) ||
      (u.designation && u.designation.toLowerCase().includes('sales'))
    );
  }, [usersList]);

  // State management
  const [callsList, setCallsList] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState('ALL');
  const [selectedCampaign, setSelectedCampaign] = useState('All Campaigns');
  const [activeStatusFilter, setActiveStatusFilter] = useState(null);
  const [otherOption, setOtherOption] = useState('Switch Off');
  const [viewMode, setViewMode] = useState('LIST'); // 'LIST', 'KANBAN', 'TABLE'
  const [sortBy, setSortBy] = useState('DEFAULT');
  const [orderBy, setOrderBy] = useState('PRIORITY');
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });

  // Follow-up form state (matching sales employee dashboard)
  const [followUpData, setFollowUpData] = useState({
    currentUpdate: 'Select',
    nextRemark: '',
    nextAction: 'Follow-Up Scheduled',
    scheduleDate: '',
    interestedIn: [],
    classification: 'Hot Lead',
    reassignedSellerId: '',
    packageName: 'Meta Ads Management',
    packagePrice: '',
    expectedClosingDate: ''
  });

  // Modal States
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showAddSellerModal, setShowAddSellerModal] = useState(false);
  const [showEditLeadModal, setShowEditLeadModal] = useState(false);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteScope, setDeleteScope] = useState('ALL'); // 'ALL' or 'SELLER'
  const [selectedLead, setSelectedLead] = useState(null);

  // New Lead Form State
  const [leadForm, setLeadForm] = useState({
    clientName: '',
    phoneNumber: '',
    salesPersonId: '',
    status: 'PENDING',
    expectedValue: '',
    leadSource: 'Facebook Campaign',
    followUpDate: '',
    notes: '',
    packageName: 'Meta Ads Management',
    expectedClosingDate: ''
  });

  // New Seller Form State
  const [sellerForm, setSellerForm] = useState({
    name: '',
    email: '',
    password: '',
    mobile: '',
    designation: 'Sales Executive',
    avatar: '💼',
    address: ''
  });

  const [formSubmitting, setFormSubmitting] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 4000);
  };

  // Helper to extract campaign name from notes or leadSource
  const getCampaign = (call) => {
    if (call.leadSource) return call.leadSource;
    if (call.notes && call.notes.includes('[Campaign:')) {
      const match = call.notes.match(/\[Campaign:\s*([^\]]+)\]/);
      if (match && match[1]) return match[1].trim();
    }
    return 'Direct / Native Lead';
  };

  // Fetch calls and campaigns
  const fetchSellerData = async () => {
    setLoading(true);
    try {
      const [callsRes, campaignsRes] = await Promise.all([
        fetch('/api/calls'),
        fetch('/api/campaigns')
      ]);

      const callsData = await callsRes.json();
      const campaignsData = await campaignsRes.json();

      setCallsList(callsData.calls || []);
      setCampaigns(campaignsData.campaigns || []);
    } catch (err) {
      console.error('Error loading sales data:', err);
      showToast('Failed to load sales data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellerData();
  }, []);

  // Update follow-up data whenever active lead changes
  useEffect(() => {
    if (selectedLeadId) {
      const activeCall = callsList.find(c => c.id === selectedLeadId);
      if (activeCall) {
        setFollowUpData({
          currentUpdate: 'Select',
          nextRemark: '',
          nextAction: 'Follow-Up Scheduled',
          scheduleDate: activeCall.followUpDate
            ? new Date(activeCall.followUpDate).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16),
          interestedIn: activeCall.notes && activeCall.notes.includes('[Campaign:')
            ? [getCampaign(activeCall)]
            : [],
          classification: activeCall.status === 'ANSWERED' ? 'Hot Lead' : (activeCall.status === 'INTERESTED' ? 'Hot Lead' : 'Follow up'),
          reassignedSellerId: activeCall.salesPersonId ? String(activeCall.salesPersonId) : '',
          packageName: activeCall.packageName || 'Meta Ads Management',
          packagePrice: activeCall.expectedValue ? String(activeCall.expectedValue) : '',
          expectedClosingDate: activeCall.expectedClosingDate
            ? new Date(activeCall.expectedClosingDate).toISOString().slice(0, 10)
            : ''
        });
      }
    }
    setShowFollowUpForm(false);
  }, [selectedLeadId, callsList]);

  // Overall Sales KPIs
  const kpis = useMemo(() => {
    const totalSellers = salesUsers.length;
    const totalLeads = callsList.length;
    const hotLeads = callsList.filter(c => c.status === 'INTERESTED').length;
    const convertedDeals = callsList.filter(c => c.status === 'ANSWERED').length;
    const totalPipelineValue = callsList.reduce((acc, c) => acc + (c.expectedValue || 0), 0);

    const todayStr = new Date().toISOString().slice(0, 10);
    const followUpsToday = callsList.filter(c => {
      if (!c.followUpDate) return false;
      return new Date(c.followUpDate).toISOString().slice(0, 10) === todayStr;
    }).length;

    const conversionRate = totalLeads > 0 ? Math.round(((convertedDeals + hotLeads) / totalLeads) * 100) : 0;

    return {
      totalSellers,
      totalLeads,
      hotLeads,
      convertedDeals,
      totalPipelineValue,
      followUpsToday,
      conversionRate
    };
  }, [salesUsers, callsList]);

  // Individual Seller Stats
  const sellerStats = useMemo(() => {
    return salesUsers.map(seller => {
      const sellerCalls = callsList.filter(c => c.salesPersonId === seller.id);
      const total = sellerCalls.length;
      const hot = sellerCalls.filter(c => c.status === 'INTERESTED').length;
      const won = sellerCalls.filter(c => c.status === 'ANSWERED').length;
      const value = sellerCalls.reduce((acc, c) => acc + (c.expectedValue || 0), 0);
      const rate = total > 0 ? Math.round(((won + hot) / total) * 100) : 0;
      const pendingFollowUps = sellerCalls.filter(c => c.status === 'CALLBACK' || c.status === 'RINGING' || c.status === 'PENDING').length;

      return {
        ...seller,
        totalLeads: total,
        hotLeads: hot,
        wonDeals: won,
        pipelineValue: value,
        conversionRate: rate,
        pendingFollowUps
      };
    });
  }, [salesUsers, callsList]);

  // Base filtered calls (Campaign, Seller, Search)
  const baseFilteredCalls = useMemo(() => {
    return callsList.filter(c => {
      // Seller filter
      if (selectedSellerId !== 'ALL' && c.salesPersonId !== parseInt(selectedSellerId, 10)) {
        return false;
      }
      // Campaign filter
      const matchesCampaign = selectedCampaign === 'All Campaigns' || getCampaign(c) === selectedCampaign;
      if (!matchesCampaign) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const clientNameMatch = c.clientName?.toLowerCase().includes(q);
        const phoneMatch = c.phoneNumber?.includes(q);
        const sellerNameMatch = c.salesPerson?.name?.toLowerCase().includes(q);
        const notesMatch = c.notes?.toLowerCase().includes(q);
        if (!clientNameMatch && !phoneMatch && !sellerNameMatch && !notesMatch) {
          return false;
        }
      }
      return true;
    });
  }, [callsList, selectedSellerId, selectedCampaign, searchQuery]);

  // Status weight for sorting
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

  // Full displayed calls after Status Filters, Sorting & Ordering
  const displayedCalls = useMemo(() => {
    let list = baseFilteredCalls.filter(c => {
      if (!activeStatusFilter) return true;
      switch (activeStatusFilter) {
        case 'ANSWER':
          return c.status === 'ANSWERED' || c.status === 'INTERESTED';
        case 'RINGING':
          return c.status === 'RINGING' || c.status === 'CALLBACK';
        case 'OTHER':
          return c.status === otherOption.toUpperCase().replace(/\s+/g, '_');
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

    // Sorting by Color
    if (sortBy === 'YELLOW') {
      list = [...list].sort((a, b) => {
        const aY = a.status === 'CALLBACK' || a.status === 'RINGING';
        const bY = b.status === 'CALLBACK' || b.status === 'RINGING';
        if (aY && !bY) return -1;
        if (!aY && bY) return 1;
        return 0;
      });
    } else if (sortBy === 'BLUE') {
      list = [...list].sort((a, b) => {
        const aB = a.status === 'INTERESTED';
        const bB = b.status === 'INTERESTED';
        if (aB && !bB) return -1;
        if (!aB && bB) return 1;
        return 0;
      });
    } else if (sortBy === 'GREEN') {
      list = [...list].sort((a, b) => {
        const aG = a.status === 'ANSWERED';
        const bG = b.status === 'ANSWERED';
        if (aG && !bG) return -1;
        if (!aG && bG) return 1;
        return 0;
      });
    } else if (sortBy === 'RED') {
      list = [...list].sort((a, b) => {
        const aR = a.status === 'NOT_INTERESTED' || a.status === 'NOT_ANSWERED';
        const bR = b.status === 'NOT_INTERESTED' || b.status === 'NOT_ANSWERED';
        if (aR && !bR) return -1;
        if (!aR && bR) return 1;
        return 0;
      });
    }

    // Ordering
    if (orderBy === 'PRIORITY') {
      list = [...list].sort((a, b) => getStatusWeight(a.status) - getStatusWeight(b.status));
    } else if (orderBy === 'DESCENDING') {
      list = [...list].sort((a, b) => new Date(b.callDate || b.createdAt || 0) - new Date(a.callDate || a.createdAt || 0));
    } else if (orderBy === 'ASCENDING') {
      list = [...list].sort((a, b) => new Date(a.callDate || a.createdAt || 0) - new Date(b.callDate || b.createdAt || 0));
    }

    return list;
  }, [baseFilteredCalls, activeStatusFilter, otherOption, sortBy, orderBy]);

  // Auto-select first lead only on initial load
  const hasAutoSelectedRef = React.useRef(false);
  useEffect(() => {
    if (!hasAutoSelectedRef.current && displayedCalls.length > 0) {
      setSelectedLeadId(displayedCalls[0].id);
      hasAutoSelectedRef.current = true;
    }
  }, [displayedCalls]);

  // Active lead record for right pane (null if user cancelled selection)
  const activeLead = useMemo(() => {
    if (!selectedLeadId) return null;
    return callsList.find(c => c.id === selectedLeadId) || null;
  }, [callsList, selectedLeadId]);

  // Card filter toggle
  const handleStatusFilterClick = (filterKey) => {
    setActiveStatusFilter(prev => prev === filterKey ? null : filterKey);
  };

  const handleOtherOptionChange = (val) => {
    setOtherOption(val);
    setActiveStatusFilter('OTHER');
  };

  // Status Badge Class Helpers
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

  const getLeadCardStyle = (status) => {
    const base = 'border-l-4 transition-all ';
    switch (status) {
      case 'CALLBACK':
      case 'RINGING':
        return base + 'border-l-yellow-400 bg-yellow-50/40 hover:bg-yellow-50 dark:bg-yellow-900/10 dark:hover:bg-yellow-900/20 text-slate-800 dark:text-slate-200';
      case 'INTERESTED':
        return base + 'border-l-blue-500 bg-blue-50/40 hover:bg-blue-50 dark:bg-blue-900/10 dark:hover:bg-blue-900/20 text-slate-800 dark:text-slate-200';
      case 'ANSWERED':
        return base + 'border-l-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 dark:bg-emerald-900/10 dark:hover:bg-emerald-900/20 text-slate-800 dark:text-slate-200';
      case 'NOT_INTERESTED':
      case 'NOT_ANSWERED':
        return base + 'border-l-red-500 bg-red-50/40 hover:bg-red-50 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-slate-800 dark:text-slate-200';
      default:
        return base + 'border-l-slate-300 dark:border-l-slate-600 bg-slate-50/40 hover:bg-slate-50 dark:bg-slate-800/30 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200';
    }
  };

  const getStatusBadge = (status, isSelected = false, isLarge = false) => {
    let classes = `inline-flex items-center justify-center whitespace-nowrap text-[10px] font-extrabold uppercase shrink-0 ${isLarge ? 'px-3 py-1.5 rounded-lg' : 'px-2.5 py-1 rounded-md'} `;
    if (isSelected) {
      return classes + "bg-white/20 text-white";
    }
    switch(status) {
      case 'CALLBACK': 
      case 'RINGING': return classes + 'bg-yellow-500 text-white border border-yellow-600 shadow-xs dark:bg-yellow-600 dark:border-yellow-700';
      case 'INTERESTED': return classes + 'bg-blue-600 text-white border border-blue-700 shadow-xs dark:bg-blue-700 dark:border-blue-800';
      case 'ANSWERED': return classes + 'bg-emerald-500 text-white border border-emerald-600 shadow-xs dark:bg-emerald-600 dark:border-emerald-700';
      case 'NOT_INTERESTED': 
      case 'NOT_ANSWERED': return classes + 'bg-red-500 text-white border border-red-600 shadow-xs dark:bg-red-600 dark:border-red-700';
      default: return classes + 'bg-slate-500 text-white border border-slate-600 shadow-xs dark:bg-slate-600 dark:border-slate-700';
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
      default: return status ? status.replace('_', ' ') : 'NEW';
    }
  };

  // WhatsApp verification & redirection
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

  // Save Follow-up Handler (matching sales employee dashboard with admin reassignment)
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
    const updatedNotes = activeCall?.notes ? `${activeCall.notes}\n${noteText}` : noteText;

    const dealPrice = followUpData.packagePrice !== '' && followUpData.packagePrice !== null && !isNaN(parseFloat(followUpData.packagePrice))
      ? parseFloat(followUpData.packagePrice)
      : (activeCall?.expectedValue || null);

    const chosenPackage = isConverted ? followUpData.packageName : (followUpData.packageName || activeCall?.packageName || null);
    const closingDate = followUpData.expectedClosingDate 
      ? new Date(followUpData.expectedClosingDate).toISOString() 
      : (activeCall?.expectedClosingDate ? new Date(activeCall.expectedClosingDate).toISOString() : null);

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
          leadSource: followUpData.interestedIn.join(', ') || activeCall?.leadSource,
          salesPersonId: followUpData.reassignedSellerId ? parseInt(followUpData.reassignedSellerId, 10) : activeCall?.salesPersonId
        })
      });

      if (res.ok) {
        showToast('Follow-up logged successfully!');
        setShowFollowUpForm(false);
        await fetchSellerData();
      } else {
        showToast('Failed to save follow-up', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Connection error', 'error');
    }
  };

  // Reassign Lead Handler
  const handleReassignLead = async (leadId, newSalesPersonId) => {
    try {
      const res = await fetch(`/api/calls/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesPersonId: parseInt(newSalesPersonId, 10) })
      });
      if (res.ok) {
        const assignedSeller = salesUsers.find(s => s.id === parseInt(newSalesPersonId, 10));
        showToast(`Lead reassigned to ${assignedSeller?.name || 'Sales Person'}`);
        await fetchSellerData();
      } else {
        showToast('Failed to reassign lead', 'error');
      }
    } catch (err) {
      showToast('Error reassigning lead', 'error');
    }
  };

  // Full Data Delete handler for leads
  const handleDeleteAllLeads = async (scope = 'ALL') => {
    setIsDeleting(true);
    try {
      let url = '/api/calls?all=true';
      if (scope === 'SELLER' && selectedSellerId !== 'ALL') {
        url = `/api/calls?sellerId=${selectedSellerId}`;
      }

      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete leads');

      showToast(data.message || 'Leads deleted successfully', 'success');
      setShowDeleteModal(false);
      await fetchSellerData();
      if (refreshData) refreshData();
    } catch (err) {
      console.error('Delete leads error:', err);
      showToast(err.message || 'Failed to delete leads', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Add Lead Handler
  const handleAddLead = async (e) => {
    e.preventDefault();
    if (!leadForm.clientName || !leadForm.phoneNumber || !leadForm.salesPersonId) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    setFormSubmitting(true);
    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: leadForm.clientName,
          phoneNumber: leadForm.phoneNumber,
          salesPersonId: parseInt(leadForm.salesPersonId, 10),
          status: leadForm.status,
          expectedValue: leadForm.expectedValue ? parseFloat(leadForm.expectedValue) : null,
          leadSource: leadForm.leadSource,
          followUpDate: leadForm.followUpDate ? new Date(leadForm.followUpDate).toISOString() : null,
          notes: leadForm.notes,
          packageName: leadForm.packageName || null,
          expectedClosingDate: leadForm.expectedClosingDate ? new Date(leadForm.expectedClosingDate).toISOString() : null
        })
      });

      if (res.ok) {
        showToast('Lead successfully assigned to Sales Person!');
        setShowAddLeadModal(false);
        setLeadForm({
          clientName: '',
          phoneNumber: '',
          salesPersonId: salesUsers[0]?.id?.toString() || '',
          status: 'PENDING',
          expectedValue: '',
          leadSource: 'Facebook Campaign',
          followUpDate: '',
          notes: '',
          packageName: 'Meta Ads Management',
          expectedClosingDate: ''
        });
        await fetchSellerData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to add lead', 'error');
      }
    } catch (err) {
      showToast('Network error adding lead', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Add Seller Handler
  const handleAddSeller = async (e) => {
    e.preventDefault();
    if (!sellerForm.name || !sellerForm.email || !sellerForm.password) {
      showToast('Name, email and password are required', 'error');
      return;
    }
    setFormSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sellerForm.name,
          email: sellerForm.email,
          password: sellerForm.password,
          role: 'SALES',
          department: 'Sales',
          designation: sellerForm.designation || 'Sales Executive',
          mobile: sellerForm.mobile,
          avatar: sellerForm.avatar || '💼',
          address: sellerForm.address,
          status: 'ACTIVE',
          salary: 0
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Sales Person ${sellerForm.name} onboarded successfully!`);
        setShowAddSellerModal(false);
        setSellerForm({
          name: '',
          email: '',
          password: '',
          mobile: '',
          designation: 'Sales Executive',
          avatar: '💼',
          address: ''
        });
        if (refreshData) await refreshData();
        await fetchSellerData();
      } else {
        showToast(data.error || 'Failed to create sales person', 'error');
      }
    } catch (err) {
      showToast('Network error creating sales person', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteLead = async (id, name) => {
    if (!confirm(`Are you sure you want to delete lead "${name}"?`)) return;
    try {
      const res = await fetch(`/api/calls/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Lead deleted successfully');
        setCallsList(prev => prev.filter(c => c.id !== id));
        if (selectedLeadId === id) setSelectedLeadId(null);
      } else {
        showToast('Failed to delete lead', 'error');
      }
    } catch (err) {
      showToast('Error deleting lead', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast Notification */}
      {toast.message && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-sm font-bold animate-slide-up ${
          toast.type === 'error'
            ? 'bg-red-600 text-white border-red-700'
            : 'bg-slate-900 text-white dark:bg-emerald-600 border-slate-800 dark:border-emerald-700'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 lg:p-8 text-white shadow-xl border border-blue-800/40">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-1/4 -bottom-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-extrabold uppercase tracking-wider backdrop-blur-md">
              <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
              Sales & Seller Command Center
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
              Seller Dashboard & Performance CRM
            </h1>
            <p className="text-sm text-blue-100/80 max-w-2xl font-medium leading-relaxed">
              Real-time sales performance overview, interactive call status filters, lead pipeline inspection, and salesperson reassignments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => {
                if (salesUsers.length > 0 && !leadForm.salesPersonId) {
                  setLeadForm(prev => ({ ...prev, salesPersonId: salesUsers[0].id.toString() }));
                }
                setShowAddLeadModal(true);
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Assign New Lead
            </button>
            <button
              onClick={() => setExcelModalOpen(true)}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 backdrop-blur-md transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              Import Leads (Excel)
            </button>
            <button
              onClick={() => setShowAddSellerModal(true)}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 backdrop-blur-md transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-blue-300" />
              Onboard Sales Rep
            </button>
            {callsList.length > 0 && (
              <button
                onClick={() => {
                  setDeleteScope('ALL');
                  setShowDeleteModal(true);
                }}
                className="bg-rose-500/20 hover:bg-rose-600/30 border border-rose-400/40 text-rose-200 hover:text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 backdrop-blur-md transition cursor-pointer shadow-lg shadow-rose-950/20 active:scale-95"
                title="Wipe and clear all leads from database"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                Delete All Leads
              </button>
            )}
            <button
              onClick={fetchSellerData}
              className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Campaign & Salesperson Selector Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Sales Performance Overview</h3>
          <p className="text-slate-500 text-xs mt-0.5">Analytics and calling metrics across campaigns and sales executives.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Salesperson Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400">Seller:</span>
            <select
              value={selectedSellerId}
              onChange={(e) => setSelectedSellerId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow cursor-pointer"
            >
              <option value="ALL">All Salespersons ({callsList.length})</option>
              {salesUsers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Campaign Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400">Campaign:</span>
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow cursor-pointer"
            >
              <option value="All Campaigns">All Campaigns</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2 MAIN BOXES LAYOUT (EXACTLY MATCHING SALES EMPLOYEE DASHBOARD) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Box 1: Call Status (Answer, Ringing, Other) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Call Status</h4>
            <span className="text-[10px] text-slate-400 font-semibold">Click cards to filter</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div
              onClick={() => handleStatusFilterClick('ANSWER')}
              className={getCardClassName('ANSWER', 'bg-emerald-500 dark:bg-emerald-600 p-3 rounded-xl border border-emerald-600 dark:border-emerald-700 flex flex-col justify-center text-white shadow-sm shadow-emerald-500/20', 'ring-emerald-400')}
            >
              <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider mb-1">Answer</span>
              <div className="text-2xl font-black text-white">
                {baseFilteredCalls.filter(c => c.status === 'ANSWERED' || c.status === 'INTERESTED').length}
              </div>
            </div>
            <div
              onClick={() => handleStatusFilterClick('RINGING')}
              className={getCardClassName('RINGING', 'bg-yellow-500 dark:bg-yellow-600 p-3 rounded-xl border border-yellow-600 dark:border-yellow-700 flex flex-col justify-center text-white shadow-sm shadow-yellow-500/20', 'ring-yellow-400')}
            >
              <span className="text-[10px] font-bold text-yellow-100 uppercase tracking-wider mb-1">Ringing</span>
              <div className="text-2xl font-black text-white">
                {baseFilteredCalls.filter(c => c.status === 'RINGING' || c.status === 'CALLBACK').length}
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
                {baseFilteredCalls.filter(c => c.status === otherOption.toUpperCase().replace(/\s+/g, '_')).length}
              </div>
            </div>
          </div>
        </div>

        {/* Box 2: Lead Categories (Follow-up, Hot-Lead, Done, Not Interested) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Lead Categories</h4>
            <span className="text-[10px] text-slate-400 font-semibold">Click cards to filter</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              onClick={() => handleStatusFilterClick('FOLLOW_UP')}
              className={getCardClassName('FOLLOW_UP', 'bg-yellow-500 dark:bg-yellow-600 p-3 rounded-xl border border-yellow-600 dark:border-yellow-700 flex flex-col justify-center text-white shadow-sm shadow-yellow-500/20', 'ring-yellow-400')}
            >
              <span className="text-[10px] font-bold text-yellow-100 uppercase tracking-wider mb-1">Follow-up</span>
              <div className="text-2xl font-black text-white">
                {baseFilteredCalls.filter(c => c.status === 'CALLBACK' || c.status === 'RINGING').length}
              </div>
            </div>
            <div
              onClick={() => handleStatusFilterClick('HOT_LEAD')}
              className={getCardClassName('HOT_LEAD', 'bg-blue-600 dark:bg-blue-700 p-3 rounded-xl border border-blue-700 dark:border-blue-800 flex flex-col justify-center text-white shadow-sm shadow-blue-600/20', 'ring-blue-400')}
            >
              <span className="text-[10px] font-bold text-blue-100 uppercase tracking-wider mb-1">Hot-Lead</span>
              <div className="text-2xl font-black text-white">
                {baseFilteredCalls.filter(c => c.status === 'INTERESTED').length}
              </div>
            </div>
            <div
              onClick={() => handleStatusFilterClick('DONE')}
              className={getCardClassName('DONE', 'bg-emerald-500 dark:bg-emerald-600 p-3 rounded-xl border border-emerald-600 dark:border-emerald-700 flex flex-col justify-center text-white shadow-sm shadow-emerald-500/20', 'ring-emerald-400')}
            >
              <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider mb-1">Done</span>
              <div className="text-2xl font-black text-white">
                {baseFilteredCalls.filter(c => c.status === 'ANSWERED').length}
              </div>
            </div>
            <div
              onClick={() => handleStatusFilterClick('UNUSUAL')}
              className={getCardClassName('UNUSUAL', 'bg-red-500 dark:bg-red-600 p-3 rounded-xl border border-red-600 dark:border-red-700 flex flex-col justify-center text-white shadow-sm shadow-red-500/20', 'ring-red-400')}
            >
              <span className="text-[10px] font-bold text-red-100 uppercase tracking-wider mb-1">Not Interested</span>
              <div className="text-2xl font-black text-white">
                {baseFilteredCalls.filter(c => c.status === 'NOT_INTERESTED' || c.status === 'NOT_ANSWERED').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Box 3: Live Meta Ads Performance */}
      {selectedCampaign !== 'All Campaigns' && (() => {
        const activeCamp = campaigns.find(c => c.name === selectedCampaign);
        if (!activeCamp) return null;
        return (
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="text-blue-500">📊</span> Live Meta Ads Performance ({activeCamp.name})
              </h4>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${activeCamp.status === 'ACTIVE' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                {activeCamp.status || 'ACTIVE'}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Total Ad Spend</span>
                <div className="text-xl font-black text-slate-900 dark:text-white">₹{(activeCamp.spend || 0).toLocaleString()}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Cost Per Lead (CPL)</span>
                <div className="text-xl font-black text-blue-600 dark:text-blue-400">₹{activeCamp.costPerLead || 0}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Reach / Impressions</span>
                <div className="text-xl font-black text-slate-900 dark:text-white">{(activeCamp.reach || 0).toLocaleString()} / {(activeCamp.impressions || 0).toLocaleString()}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Clicks (CTR)</span>
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  {(activeCamp.clicks || 0).toLocaleString()}
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 ml-1">
                    ({activeCamp.impressions > 0 ? (((activeCamp.clicks || 0) / activeCamp.impressions) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Lead Pipeline Controls & View Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
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
          <button
            onClick={() => setViewMode('LIST')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1.5 ${
              viewMode === 'LIST'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            LIST VIEW
          </button>
          <button
            onClick={() => setViewMode('KANBAN')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1.5 ${
              viewMode === 'KANBAN'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            KANBAN
          </button>
          <button
            onClick={() => setViewMode('TABLE')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1.5 ${
              viewMode === 'TABLE'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            TABLE VIEW
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: 2-PANE LIST VIEW (EXACT MATCH OF SALES EMPLOYEE DASHBOARD) */}
      {viewMode === 'LIST' && (
        <div className="flex flex-col md:flex-row gap-4 mt-2 items-start">
          {/* Left Pane: Leads List */}
          <div className={`w-full ${activeLead ? 'hidden md:flex md:w-2/5 lg:w-[45%]' : 'flex'} flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 md:sticky md:top-4 md:self-start md:max-h-[calc(100vh-2rem)]`}>
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
                        className="appearance-none bg-[#0f4ca8] hover:bg-blue-800 text-white text-xs font-bold px-3 py-1.5 pr-7 rounded-lg cursor-pointer transition outline-none"
                      >
                        <option value="DEFAULT">SORT: DEFAULT</option>
                        <option value="YELLOW">SORT: YELLOW FIRST</option>
                        <option value="BLUE">SORT: BLUE FIRST</option>
                        <option value="GREEN">SORT: GREEN FIRST</option>
                        <option value="RED">SORT: RED FIRST</option>
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white text-[8px]">▼</div>
                    </div>
                    <div className="relative">
                      <select
                        value={orderBy}
                        onChange={(e) => setOrderBy(e.target.value)}
                        className="appearance-none bg-[#0f4ca8] hover:bg-blue-800 text-white text-xs font-bold px-3 py-1.5 pr-7 rounded-lg cursor-pointer transition outline-none"
                      >
                        <option value="PRIORITY">ORDER BY: PRIORITY</option>
                        <option value="DESCENDING">ORDER BY: DESCENDING (NEWEST)</option>
                        <option value="ASCENDING">ORDER BY: ASCENDING (OLDEST)</option>
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white text-[8px]">▼</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (salesUsers.length > 0 && !leadForm.salesPersonId) {
                        setLeadForm(prev => ({ ...prev, salesPersonId: salesUsers[0].id.toString() }));
                      }
                      setShowAddLeadModal(true);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 justify-center transition shadow-sm"
                  >
                    New <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setExcelModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 justify-center transition shadow-sm"
                    title="Excel Import"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </button>
                  {callsList.length > 0 && (
                    <button
                      onClick={() => {
                        setDeleteScope(selectedSellerId !== 'ALL' ? 'SELLER' : 'ALL');
                        setShowDeleteModal(true);
                      }}
                      className="bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 justify-center transition shadow-sm"
                      title="Clear leads"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    </button>
                  )}
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, phone or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-500 text-xs pl-8 pr-3 py-2 rounded-xl outline-none border border-slate-200 dark:border-slate-700 focus:border-blue-400 transition"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 overflow-y-auto max-h-[750px] divide-y divide-slate-100 dark:divide-slate-800/60">
              {displayedCalls.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">No leads available for this filter.</div>
              ) : (
                displayedCalls.map(call => {
                  const isSelected = selectedLeadId === call.id;
                  const campaign = getCampaign(call);
                  const displayDateObj = call.followUpDate ? new Date(call.followUpDate) : new Date(call.callDate || call.createdAt);
                  const dateString = displayDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
                  const timeString = displayDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={call.id}
                      onClick={() => setSelectedLeadId(call.id)}
                      className={`p-4 border-b border-slate-100 dark:border-slate-800/60 cursor-pointer ${getLeadCardStyle(call.status)} ${
                        isSelected ? '!bg-blue-50/80 dark:!bg-blue-900/30 ring-1 ring-blue-500' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{call.clientName}</h4>
                          <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">{call.phoneNumber}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={getStatusBadge(call.status, false, false)}>
                            {getStatusDisplayText(call.status)}
                          </span>
                          {/* Salesperson tag */}
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                            <span>{call.salesPerson?.avatar || '👤'}</span>
                            <span className="truncate max-w-[100px]">{call.salesPerson?.name || 'Seller'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Campaign / Requirement Tag */}
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-2 flex-wrap">
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          🏷️ {campaign.replace(' Campaign', '')}
                        </span>
                        {call.expectedValue ? (
                          <span className="text-emerald-600 font-black">
                            ₹{call.expectedValue.toLocaleString('en-IN')}
                          </span>
                        ) : null}
                      </div>

                      {call.notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 mb-2">
                          {call.notes}
                        </p>
                      )}

                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold border-t border-slate-200/40 dark:border-slate-800/40 pt-2">
                        <span>Schedule: {dateString} {timeString}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWhatsAppClick(call);
                            }}
                            className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 rounded transition"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendWhatsAppReminder(call);
                            }}
                            disabled={sendingReminderId === call.id}
                            className="p-1 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-teal-600 rounded transition disabled:opacity-50"
                            title="Send WhatsApp Follow-up Reminder"
                          >
                            {sendingReminderId === call.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Bell className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLead(call.id, call.clientName);
                            }}
                            className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 rounded transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Pane: Active Lead Details & Follow-up Actions (Only shown when a lead is selected) */}
          {activeLead && (
            <div className="w-full md:w-3/5 lg:w-[55%] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-start text-center md:self-start md:sticky md:top-4 h-auto md:max-h-[calc(100vh-2rem)] overflow-y-auto relative animate-fade-in">
              {/* Cancel / Close Lead Inspector Button */}
              <button
                type="button"
                onClick={() => setSelectedLeadId(null)}
                className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
                title="Cancel selection / Close lead details"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>

              {showFollowUpForm ? (
                /* Inline Follow-up Form */
                <form onSubmit={(e) => handleSaveFollowUp(e, activeLead.id)} className="w-full text-left flex flex-col gap-4 animate-fade-in pt-6 md:pt-0">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      Next followup for <span className="text-blue-600 dark:text-blue-400 font-extrabold">{activeLead.clientName}</span>
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
                      placeholder="e.g. Call on wednesday, client requested proposal"
                      className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition"
                    ></textarea>
                    {activeLead.notes && (
                      <p className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400/80 mt-1 flex items-center gap-1">
                        <span>🔔 Previous remarks will be appended to history.</span>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Lead Classification*</label>
                      <select
                        value={followUpData.classification}
                        onChange={(e) => setFollowUpData({ ...followUpData, classification: e.target.value })}
                        className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition cursor-pointer"
                      >
                        <option value="Hot Lead">🔥 Hot Lead</option>
                        <option value="Follow up">📞 Follow up</option>
                        <option value="Unusual">❌ Unusual / Not Interested</option>
                        <option value="Cold Lead">❄️ Cold Lead</option>
                        <option value="Other">📁 Other</option>
                      </select>
                    </div>

                    {/* Admin Reassignment Selector */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Assign Salesperson</label>
                      <select
                        value={followUpData.reassignedSellerId}
                        onChange={(e) => setFollowUpData({ ...followUpData, reassignedSellerId: e.target.value })}
                        className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition cursor-pointer"
                      >
                        {salesUsers.map(seller => (
                          <option key={seller.id} value={seller.id}>
                            {seller.name} ({seller.email})
                          </option>
                        ))}
                      </select>
                    </div>
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
              ) : (
                /* Normal Lead Inspector Card */
                <div className="w-full flex flex-col items-center animate-fade-in pt-4 md:pt-0">
                  {/* Mobile Back to Leads Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedLeadId(null)}
                    className="md:hidden self-start flex items-center gap-1.5 px-3 py-1.5 mb-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Leads</span>
                  </button>

                  <div className="w-24 h-24 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-inner shrink-0 text-slate-500 dark:text-slate-400">
                    <svg className="w-14 h-14" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>

                  <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1">{activeLead.clientName}</h2>
                  <a href={`tel:${activeLead.phoneNumber}`} className="text-slate-600 dark:text-slate-400 font-mono text-lg mb-2 hover:text-blue-600 transition">
                    {activeLead.phoneNumber}
                  </a>

                  {/* Assigned Salesperson with Quick Switch */}
                  <div className="flex items-center gap-2 mb-3 bg-blue-50/60 dark:bg-blue-950/40 px-3 py-1.5 rounded-xl border border-blue-200/60 dark:border-blue-900/40 text-xs">
                    <span className="font-bold text-slate-500">Assigned Seller:</span>
                    <span className="font-black text-blue-700 dark:text-blue-300 flex items-center gap-1">
                      <span>{activeLead.salesPerson?.avatar || '👤'}</span>
                      <span>{activeLead.salesPerson?.name || 'Unassigned'}</span>
                    </span>
                    <select
                      value={activeLead.salesPersonId || ''}
                      onChange={(e) => handleReassignLead(activeLead.id, e.target.value)}
                      className="ml-2 text-[11px] font-bold p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
                      title="Reassign to another salesperson"
                    >
                      {salesUsers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Highlight converted deal info if present */}
                  {(activeLead.packageName || (activeLead.expectedValue && activeLead.expectedValue > 0) || activeLead.expectedClosingDate) && (
                    <div className="w-full bg-emerald-50/80 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 mb-4 text-left shadow-xs">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-1">
                          <span>📦</span> {activeLead.packageName || 'Confirmed Deal'}
                        </span>
                        {activeLead.expectedValue > 0 && (
                          <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                            ₹{Number(activeLead.expectedValue).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      {activeLead.expectedClosingDate && (
                        <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <span>🎯 Expected Closing / Payment:</span>
                          <span className="font-bold underline">{new Date(activeLead.expectedClosingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-sm font-semibold text-slate-500 mb-1.5 flex items-center gap-1 flex-wrap justify-center">
                    Call duration <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded text-xs font-bold">Active Lead</span>
                    {activeLead.expectedValue ? (
                      <span className="text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded text-xs font-bold">
                        Deal Value: ₹{activeLead.expectedValue.toLocaleString('en-IN')}
                      </span>
                    ) : null}
                  </p>

                  <p className="text-xs font-bold text-slate-400 flex items-center gap-1 mb-5">
                    <Clock className="w-3.5 h-3.5" /> Scheduled Follow-up: {activeLead.followUpDate ? new Date(activeLead.followUpDate).toLocaleString() : 'Not Scheduled'}
                  </p>

                  {/* Badges Bar */}
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    <button
                      type="button"
                      onClick={() => setShowFollowUpForm(true)}
                      className={`${getStatusBadge(activeLead.status, false, true)} cursor-pointer hover:opacity-90 active:scale-95 transition-all outline-none`}
                    >
                      {getStatusDisplayText(activeLead.status)}
                    </button>
                    <span className="bg-blue-600 text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg flex items-center gap-1">⚑ New Lead</span>
                    <span className="bg-slate-700 text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg flex items-center gap-1">👤 Customer</span>
                    <span className="bg-slate-700 text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg flex items-center gap-1">🏷️ {getCampaign(activeLead).replace(' Campaign', '')}</span>
                  </div>

                  {/* Previous Remarks Section */}
                  {activeLead.notes && (
                    <div className="w-full text-left bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 mb-6 max-h-40 overflow-y-auto">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Previous Remarks</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">{activeLead.notes}</p>
                    </div>
                  )}

                  {/* Action Buttons (Calling, WhatsApp, Mail, Notes) */}
                  <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md mt-2">
                    <a
                      href={`tel:${activeLead.phoneNumber}`}
                      className="w-12 h-12 rounded-full border-2 border-blue-600 text-blue-600 flex items-center justify-center hover:bg-blue-50 active:scale-95 transition"
                      title="Direct Call"
                    >
                      <PhoneCall className="w-5 h-5" />
                    </a>
                    <button
                      onClick={() => handleWhatsAppClick(activeLead)}
                      className="w-12 h-12 rounded-full border-2 border-emerald-600 text-emerald-600 flex items-center justify-center hover:bg-emerald-50 active:scale-95 transition"
                      title="WhatsApp Chat"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleSendWhatsAppReminder(activeLead)}
                      disabled={sendingReminderId === activeLead.id}
                      className="w-12 h-12 rounded-full border-2 border-teal-600 text-teal-600 flex items-center justify-center hover:bg-teal-50 active:scale-95 transition disabled:opacity-50"
                      title="Send WhatsApp Follow-up Reminder (Meta Cloud API)"
                    >
                      {sendingReminderId === activeLead.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Bell className="w-5 h-5" />
                      )}
                    </button>
                    <a
                      href={`mailto:${activeLead.email || ''}`}
                      className="w-12 h-12 rounded-full border-2 border-blue-600 text-blue-600 flex items-center justify-center hover:bg-blue-50 transition"
                      title="Send Email"
                    >
                      <Mail className="w-5 h-5" />
                    </a>
                    <button
                      onClick={() => setShowFollowUpForm(true)}
                      className="w-12 h-12 rounded-full border-2 border-blue-600 text-blue-600 flex items-center justify-center hover:bg-blue-50 transition"
                      title="Schedule Follow-up"
                    >
                      <Clock className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLead(activeLead);
                        setShowEditLeadModal(true);
                      }}
                      className="w-12 h-12 rounded-full border-2 border-blue-600 text-blue-600 flex items-center justify-center hover:bg-blue-50 transition"
                      title="Edit Lead Info"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setShowFollowUpForm(true)}
                      className="w-14 h-14 rounded-full bg-blue-700 hover:bg-blue-800 text-white flex items-center justify-center shadow-lg transition ml-2"
                      title="Log Follow-up & Remarks"
                    >
                      <MessageSquare className="w-6 h-6" fill="currentColor" />
                    </button>
                  </div>

                  {/* Explicit Cancel Selection Option at Bottom */}
                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 w-full flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setSelectedLeadId(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel Selection</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: KANBAN BOARD */}
      {viewMode === 'KANBAN' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {/* STAGE 1: PENDING / NEW */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3 min-h-[500px]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-black uppercase text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> New / Pending
              </span>
              <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-black flex items-center justify-center">
                {displayedCalls.filter(c => c.status === 'PENDING').length}
              </span>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[700px]">
              {displayedCalls.filter(c => c.status === 'PENDING').map(call => (
                <KanbanCard key={call.id} call={call} onWhatsApp={handleWhatsAppClick} onEdit={() => { setSelectedLead(call); setShowEditLeadModal(true); }} onStatusChange={handleSaveFollowUp} />
              ))}
            </div>
          </div>

          {/* STAGE 2: CALLBACK / RINGING */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3 min-h-[500px]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-black uppercase text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Follow-Up / Ringing
              </span>
              <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-black flex items-center justify-center">
                {displayedCalls.filter(c => c.status === 'CALLBACK' || c.status === 'RINGING').length}
              </span>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[700px]">
              {displayedCalls.filter(c => c.status === 'CALLBACK' || c.status === 'RINGING').map(call => (
                <KanbanCard key={call.id} call={call} onWhatsApp={handleWhatsAppClick} onEdit={() => { setSelectedLead(call); setShowEditLeadModal(true); }} onStatusChange={handleSaveFollowUp} />
              ))}
            </div>
          </div>

          {/* STAGE 3: HOT / INTERESTED */}
          <div className="bg-amber-50/40 dark:bg-slate-900/60 p-4 rounded-3xl border border-amber-200/60 dark:border-slate-800 flex flex-col gap-3 min-h-[500px]">
            <div className="flex items-center justify-between pb-2 border-b border-amber-200/60 dark:border-slate-800">
              <span className="text-xs font-black uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Hot Leads
              </span>
              <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-black flex items-center justify-center">
                {displayedCalls.filter(c => c.status === 'INTERESTED').length}
              </span>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[700px]">
              {displayedCalls.filter(c => c.status === 'INTERESTED').map(call => (
                <KanbanCard key={call.id} call={call} onWhatsApp={handleWhatsAppClick} onEdit={() => { setSelectedLead(call); setShowEditLeadModal(true); }} onStatusChange={handleSaveFollowUp} />
              ))}
            </div>
          </div>

          {/* STAGE 4: WON / CLOSED */}
          <div className="bg-emerald-50/40 dark:bg-slate-900/60 p-4 rounded-3xl border border-emerald-200/60 dark:border-slate-800 flex flex-col gap-3 min-h-[500px]">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 dark:border-slate-800">
              <span className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Won / Closed
              </span>
              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-black flex items-center justify-center">
                {displayedCalls.filter(c => c.status === 'ANSWERED').length}
              </span>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[700px]">
              {displayedCalls.filter(c => c.status === 'ANSWERED').map(call => (
                <KanbanCard key={call.id} call={call} onWhatsApp={handleWhatsAppClick} onEdit={() => { setSelectedLead(call); setShowEditLeadModal(true); }} onStatusChange={handleSaveFollowUp} />
              ))}
            </div>
          </div>

          {/* STAGE 5: COLD / UNRESPONSIVE */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3 min-h-[500px]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-black uppercase text-slate-500 flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" /> Cold / Lost
              </span>
              <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black flex items-center justify-center">
                {displayedCalls.filter(c => c.status === 'NOT_ANSWERED' || c.status === 'NOT_INTERESTED').length}
              </span>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[700px]">
              {displayedCalls.filter(c => c.status === 'NOT_ANSWERED' || c.status === 'NOT_INTERESTED').map(call => (
                <KanbanCard key={call.id} call={call} onWhatsApp={handleWhatsAppClick} onEdit={() => { setSelectedLead(call); setShowEditLeadModal(true); }} onStatusChange={handleSaveFollowUp} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: TABLE VIEW */}
      {viewMode === 'TABLE' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Sales Pipeline & Call Records ({displayedCalls.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time status updates and salesperson lead reassignments</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 text-[10px]">
                  <th className="py-2.5 px-4 pl-5 whitespace-nowrap min-w-[180px]">Client / Lead</th>
                  <th className="py-2.5 px-4 whitespace-nowrap min-w-[180px]">Assigned Salesperson</th>
                  <th className="py-2.5 px-4 whitespace-nowrap min-w-[130px]">Stage / Status</th>
                  <th className="py-2.5 px-4 whitespace-nowrap min-w-[110px]">Deal Value (₹)</th>
                  <th className="py-2.5 px-4 whitespace-nowrap min-w-[140px]">Campaign / Source</th>
                  <th className="py-2.5 px-4 whitespace-nowrap min-w-[130px]">Follow-up Date</th>
                  <th className="py-2.5 px-4 min-w-[200px]">Notes & Remarks</th>
                  <th className="py-2.5 px-4 pr-6 text-right whitespace-nowrap min-w-[90px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayedCalls.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-400 font-medium">
                      No leads match the selected sales filters.
                    </td>
                  </tr>
                ) : (
                  displayedCalls.map((call) => {
                    const isFollowUpDue = call.followUpDate && new Date(call.followUpDate).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
                    const isOverdue = call.followUpDate && new Date(call.followUpDate) < new Date() && !isFollowUpDue;

                    return (
                      <tr key={call.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition">
                        {/* Client / Contact */}
                        <td className="py-2 px-4 pl-5 whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-white text-xs leading-tight">
                            {call.clientName}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-slate-500 font-semibold font-mono text-[11px]">
                            <span>{call.phoneNumber}</span>
                            <button
                              onClick={() => handleWhatsAppClick(call)}
                              className="text-emerald-600 hover:text-emerald-700 transition cursor-pointer"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* Assigned Salesperson (With Reassign dropdown) */}
                        <td className="py-2 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {call.salesPerson?.avatar || '👤'}
                            </span>
                            <select
                              value={call.salesPersonId}
                              onChange={(e) => handleReassignLead(call.id, e.target.value)}
                              className="py-1 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer min-w-[130px]"
                              title="Reassign lead to another salesperson"
                            >
                              {salesUsers.map(seller => (
                                <option key={seller.id} value={seller.id}>
                                  {seller.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-2 px-4 whitespace-nowrap">
                          <span className={getStatusBadge(call.status, false, false)}>
                            {getStatusDisplayText(call.status)}
                          </span>
                        </td>

                        {/* Deal Value & Package */}
                        <td className="py-2 px-4 font-bold text-xs text-slate-900 dark:text-white whitespace-nowrap">
                          {call.expectedValue ? (
                            <div>
                              <span>₹{call.expectedValue.toLocaleString('en-IN')}</span>
                              {call.packageName && (
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  {call.packageName.replace(' Management', '').replace(' & Development', '')}
                                </div>
                              )}
                            </div>
                          ) : (
                            call.packageName ? (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                {call.packageName.replace(' Management', '').replace(' & Development', '')}
                              </span>
                            ) : '—'
                          )}
                        </td>

                        {/* Lead Source */}
                        <td className="py-2 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap border border-slate-200/60 dark:border-slate-700/60">
                            🏷️ {getCampaign(call).replace(' Campaign', '')}
                          </span>
                        </td>

                        {/* Follow-up & Expected Closing Date */}
                        <td className="py-2 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            {call.followUpDate ? (
                              <div className={`font-bold flex items-center gap-1 ${
                                isFollowUpDue ? 'text-purple-600 dark:text-purple-400' : isOverdue ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'
                              }`}>
                                <Calendar className="w-3 h-3 shrink-0" />
                                <span className="text-[11px]">{new Date(call.followUpDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-medium text-[11px]">No follow-up</span>
                            )}
                            {isFollowUpDue && <span className="text-[9px] font-black uppercase text-purple-600 bg-purple-50 dark:bg-purple-950 px-1.5 py-0.2 rounded w-max">Due Today</span>}
                            {isOverdue && <span className="text-[9px] font-black uppercase text-red-600 bg-red-50 dark:bg-red-950 px-1.5 py-0.2 rounded w-max">Overdue</span>}
                            {call.expectedClosingDate && (
                              <span className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded w-max border border-emerald-200 dark:border-emerald-800">
                                🎯 Close: {new Date(call.expectedClosingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Notes */}
                        <td className="py-2 px-4 max-w-xs text-slate-600 dark:text-slate-300 text-xs font-medium" title={call.notes}>
                          <div className="truncate text-[11px]">{call.notes || '—'}</div>
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-4 pr-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelectedLead(call);
                                setShowEditLeadModal(true);
                              }}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-blue-600 transition cursor-pointer"
                              title="Edit Lead"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteLead(call.id, call.clientName)}
                              className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-slate-400 hover:text-red-600 transition cursor-pointer"
                              title="Delete Lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* MODAL 1: ASSIGN / ADD NEW LEAD */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Assign New Sales Lead</h3>
              </div>
              <button
                onClick={() => setShowAddLeadModal(false)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddLead} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Client / Lead Name *</label>
                  <input
                    type="text"
                    required
                    value={leadForm.clientName}
                    onChange={(e) => setLeadForm({ ...leadForm, clientName: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={leadForm.phoneNumber}
                    onChange={(e) => setLeadForm({ ...leadForm, phoneNumber: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Assign to Sales Person *</label>
                <select
                  required
                  value={leadForm.salesPersonId}
                  onChange={(e) => setLeadForm({ ...leadForm, salesPersonId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select Sales Rep</option>
                  {salesUsers.map(seller => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name} ({seller.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Campaign Source</label>
                  <select
                    value={leadForm.leadSource}
                    onChange={(e) => setLeadForm({ ...leadForm, leadSource: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Facebook Campaign">Facebook Campaign</option>
                    <option value="LinkedIn Campaign">LinkedIn Campaign</option>
                    <option value="Google Campaign">Google Campaign</option>
                    <option value="Website Inbound">Website Inbound</option>
                    <option value="Direct Referral">Direct Referral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Expected Deal Value (₹)</label>
                  <input
                    type="number"
                    value={leadForm.expectedValue}
                    onChange={(e) => setLeadForm({ ...leadForm, expectedValue: e.target.value })}
                    placeholder="e.g. 15000"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Initial Status / Stage</label>
                  <select
                    value={leadForm.status}
                    onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="INTERESTED">Hot Lead</option>
                    <option value="CALLBACK">Callback</option>
                    <option value="ANSWERED">Won / Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Follow-up Date</label>
                  <input
                    type="datetime-local"
                    value={leadForm.followUpDate}
                    onChange={(e) => setLeadForm({ ...leadForm, followUpDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Target / Sold Package</label>
                  <select
                    value={leadForm.packageName}
                    onChange={(e) => setLeadForm({ ...leadForm, packageName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Meta Ads Management">Meta Ads Management</option>
                    <option value="Google Ads Management">Google Ads Management</option>
                    <option value="Website Design & Development">Website Design & Development</option>
                    <option value="Combo Package (Multiple Services)">Combo Package (Multiple Services)</option>
                    <option value="Custom / Other Service">Custom / Other Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Expected Closing / Payment Date</label>
                  <input
                    type="date"
                    value={leadForm.expectedClosingDate}
                    onChange={(e) => setLeadForm({ ...leadForm, expectedClosingDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Lead Notes & Inquiries</label>
                <textarea
                  rows="3"
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                  placeholder="Requirement details, budget expectations, remarks..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 dark:text-white"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {formSubmitting ? 'Assigning...' : 'Assign Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ONBOARD NEW SALESPERSON */}
      {showAddSellerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Onboard New Sales Representative</h3>
              </div>
              <button
                onClick={() => setShowAddSellerModal(false)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSeller} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={sellerForm.name}
                    onChange={(e) => setSellerForm({ ...sellerForm, name: e.target.value })}
                    placeholder="e.g. Priya Sharma"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Email (Login ID) *</label>
                  <input
                    type="email"
                    required
                    value={sellerForm.email}
                    onChange={(e) => setSellerForm({ ...sellerForm, email: e.target.value })}
                    placeholder="sales.rep@aidigitals.com"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={sellerForm.password}
                    onChange={(e) => setSellerForm({ ...sellerForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Mobile Contact</label>
                  <input
                    type="text"
                    value={sellerForm.mobile}
                    onChange={(e) => setSellerForm({ ...sellerForm, mobile: e.target.value })}
                    placeholder="+91 9988776655"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Designation</label>
                  <input
                    type="text"
                    value={sellerForm.designation}
                    onChange={(e) => setSellerForm({ ...sellerForm, designation: e.target.value })}
                    placeholder="Sales Executive / Closer"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Department</label>
                  <input
                    type="text"
                    disabled
                    value="Sales (Fixed)"
                    className="w-full p-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddSellerModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {formSubmitting ? 'Creating...' : 'Onboard Sales Rep'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT LEAD MODAL */}
      {showEditLeadModal && selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Edit Sales Lead</h3>
              </div>
              <button
                onClick={() => setShowEditLeadModal(false)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch(`/api/calls/${selectedLead.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    clientName: selectedLead.clientName,
                    phoneNumber: selectedLead.phoneNumber,
                    salesPersonId: parseInt(selectedLead.salesPersonId, 10),
                    status: selectedLead.status,
                    expectedValue: selectedLead.expectedValue ? parseFloat(selectedLead.expectedValue) : null,
                    leadSource: selectedLead.leadSource,
                    followUpDate: selectedLead.followUpDate ? new Date(selectedLead.followUpDate).toISOString() : null,
                    notes: selectedLead.notes
                  })
                });
                if (res.ok) {
                  showToast('Lead updated successfully!');
                  setShowEditLeadModal(false);
                  await fetchSellerData();
                } else {
                  showToast('Failed to update lead', 'error');
                }
              } catch (err) {
                showToast('Error updating lead', 'error');
              }
            }} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Client Name *</label>
                  <input
                    type="text"
                    required
                    value={selectedLead.clientName}
                    onChange={(e) => setSelectedLead({ ...selectedLead, clientName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={selectedLead.phoneNumber}
                    onChange={(e) => setSelectedLead({ ...selectedLead, phoneNumber: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Assigned Sales Rep</label>
                  <select
                    value={selectedLead.salesPersonId}
                    onChange={(e) => setSelectedLead({ ...selectedLead, salesPersonId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    {salesUsers.map(seller => (
                      <option key={seller.id} value={seller.id}>{seller.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={selectedLead.status}
                    onChange={(e) => setSelectedLead({ ...selectedLead, status: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="CALLBACK">Callback</option>
                    <option value="RINGING">Ringing</option>
                    <option value="INTERESTED">Hot Lead</option>
                    <option value="ANSWERED">Won / Closed</option>
                    <option value="NOT_ANSWERED">No Answer</option>
                    <option value="NOT_INTERESTED">Not Interested</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Notes</label>
                <textarea
                  rows="3"
                  value={selectedLead.notes || ''}
                  onChange={(e) => setSelectedLead({ ...selectedLead, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 dark:text-white"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditLeadModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Data Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-rose-200 dark:border-rose-900/60 space-y-5 animate-scale-up"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Confirm Full Data Deletion
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Permanent removal of CRM leads
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 space-y-2 text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
              <p className="font-extrabold flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Warning: This action cannot be reversed!
              </p>
              <p>
                You are about to delete lead records from the database. All contact details, notes, stage history, and caller assignments will be permanently removed.
              </p>
            </div>

            {/* Scope Selection */}
            {selectedSellerId !== 'ALL' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Select Deletion Scope:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteScope('SELLER')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition ${
                      deleteScope === 'SELLER'
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>Only Selected Seller</div>
                    <div className="text-[10px] opacity-75">{baseFilteredCalls.length} leads</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteScope('ALL')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition ${
                      deleteScope === 'ALL'
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>All CRM Leads</div>
                    <div className="text-[10px] opacity-75">{callsList.length} total leads</div>
                  </button>
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Total Leads to Delete:</span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black text-xs">
                {deleteScope === 'SELLER' && selectedSellerId !== 'ALL' ? baseFilteredCalls.length : callsList.length} Leads
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || (deleteScope === 'SELLER' ? baseFilteredCalls.length === 0 : callsList.length === 0)}
                onClick={() => handleDeleteAllLeads(deleteScope)}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Yes, Delete {deleteScope === 'SELLER' && selectedSellerId !== 'ALL' ? 'Filtered Leads' : 'All Leads'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Sheet Bulk Upload Modal for Leads */}
      <ExcelImportModal
        isOpen={excelModalOpen}
        onClose={() => setExcelModalOpen(false)}
        panelType="leads"
        salesUsers={salesUsers}
        onSuccess={() => {
          fetchSellerData();
          if (refreshData) refreshData();
          showToast('Leads imported successfully from Excel!', 'success');
        }}
      />
    </div>
  );
}

// Sub-component: Kanban Card
function KanbanCard({ call, onWhatsApp, onEdit, onStatusChange }) {
  return (
    <div className="bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="font-bold text-slate-900 dark:text-white text-xs leading-tight">
          {call.clientName}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onWhatsApp(call)}
            className="text-emerald-600 hover:text-emerald-700 p-0.5 cursor-pointer"
            title="WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onEdit}
            className="text-slate-400 hover:text-blue-600 p-0.5 cursor-pointer"
            title="Edit"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
        <Phone className="w-3 h-3" />
        {call.phoneNumber}
      </div>

      {call.expectedValue ? (
        <div className="flex items-center justify-between text-xs font-black text-emerald-600">
          <span>₹{call.expectedValue.toLocaleString('en-IN')}</span>
          {call.packageName && (
            <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              {call.packageName.replace(' Management', '').replace(' & Development', '')}
            </span>
          )}
        </div>
      ) : (
        call.packageName && (
          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            {call.packageName}
          </div>
        )
      )}

      {call.expectedClosingDate && (
        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded flex items-center justify-between border border-emerald-100 dark:border-emerald-900/40">
          <span>🎯 Expected Close:</span>
          <span>{new Date(call.expectedClosingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
        </div>
      )}

      {call.notes && (
        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg">
          {call.notes}
        </p>
      )}

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 truncate max-w-[120px]">
          <span>{call.salesPerson?.avatar || '👤'}</span>
          <span className="truncate">{call.salesPerson?.name || 'Seller'}</span>
        </div>
        
        {call.followUpDate && (
          <div className="text-[9px] font-bold text-purple-600">
            {new Date(call.followUpDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>
    </div>
  );
}
