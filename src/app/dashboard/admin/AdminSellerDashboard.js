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
  FileSpreadsheet
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
  const [selectedCampaign, setSelectedCampaign] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [viewMode, setViewMode] = useState('TABLE'); // 'TABLE', 'KANBAN', 'SELLERS'
  const [toast, setToast] = useState({ message: '', type: '' });

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
    notes: ''
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

  // Filter calls by sales person and other criteria
  const filteredCalls = useMemo(() => {
    return callsList.filter(call => {
      // 1. Seller filter
      if (selectedSellerId !== 'ALL' && call.salesPersonId !== parseInt(selectedSellerId, 10)) {
        return false;
      }
      // 2. Campaign filter
      if (selectedCampaign !== 'ALL') {
        const leadSrc = call.leadSource || (call.notes && call.notes.includes('[Campaign:') ? call.notes : '');
        if (!leadSrc.toLowerCase().includes(selectedCampaign.toLowerCase())) {
          return false;
        }
      }
      // 3. Status filter
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'HOT' && call.status !== 'INTERESTED') return false;
        if (selectedStatus === 'WON' && call.status !== 'ANSWERED') return false;
        if (selectedStatus === 'FOLLOW_UP' && call.status !== 'CALLBACK' && call.status !== 'RINGING') return false;
        if (selectedStatus === 'COLD' && call.status !== 'NOT_ANSWERED' && call.status !== 'NOT_INTERESTED') return false;
        if (selectedStatus === 'PENDING' && call.status !== 'PENDING') return false;
      }
      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const clientNameMatch = call.clientName?.toLowerCase().includes(q);
        const phoneMatch = call.phoneNumber?.includes(q);
        const sellerNameMatch = call.salesPerson?.name?.toLowerCase().includes(q);
        const notesMatch = call.notes?.toLowerCase().includes(q);
        if (!clientNameMatch && !phoneMatch && !sellerNameMatch && !notesMatch) {
          return false;
        }
      }
      return true;
    });
  }, [callsList, selectedSellerId, selectedCampaign, selectedStatus, searchQuery]);

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

  // Handlers
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
          notes: leadForm.notes
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
          notes: ''
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
          role: 'SALES', // STRICTLY SALES ROLE
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

  const handleUpdateLeadStatus = async (leadId, newStatus) => {
    try {
      const res = await fetch(`/api/calls/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showToast(`Status updated to ${newStatus}`);
        setCallsList(prev => prev.map(c => c.id === leadId ? { ...c, status: newStatus } : c));
      } else {
        showToast('Failed to update status', 'error');
      }
    } catch (err) {
      showToast('Error updating status', 'error');
    }
  };

  const handleReassignLead = async (leadId, newSalesPersonId) => {
    try {
      const res = await fetch(`/api/calls/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesPersonId: newSalesPersonId })
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

  const handleEditLeadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLead) return;
    setFormSubmitting(true);
    try {
      const res = await fetch(`/api/calls/${selectedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: selectedLead.clientName,
          phoneNumber: selectedLead.phoneNumber,
          salesPersonId: selectedLead.salesPersonId,
          status: selectedLead.status,
          expectedValue: selectedLead.expectedValue ? parseFloat(selectedLead.expectedValue) : null,
          leadSource: selectedLead.leadSource,
          followUpDate: selectedLead.followUpDate ? new Date(selectedLead.followUpDate).toISOString() : null,
          notes: selectedLead.notes
        })
      });

      if (res.ok) {
        showToast('Lead details updated successfully!');
        setShowEditLeadModal(false);
        await fetchSellerData();
      } else {
        showToast('Failed to update lead', 'error');
      }
    } catch (err) {
      showToast('Error updating lead', 'error');
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
      } else {
        showToast('Failed to delete lead', 'error');
      }
    } catch (err) {
      showToast('Error deleting lead', 'error');
    }
  };

  const handleWhatsApp = (phone, name = 'Client') => {
    const clean = phone.replace(/\D/g, '');
    const finalPhone = clean.length === 10 ? `91${clean}` : clean;
    const msg = encodeURIComponent(`Hello ${name}, this is from AiDigitals regarding your inquiry. How can we help you today?`);
    window.open(`https://wa.me/${finalPhone}?text=${msg}`, '_blank');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'INTERESTED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800"><Flame className="w-3 h-3 text-amber-500 fill-amber-500" /> Hot Lead</span>;
      case 'ANSWERED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Won / Closed</span>;
      case 'CALLBACK':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800"><Clock className="w-3 h-3 text-blue-500" /> Callback</span>;
      case 'RINGING':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800"><Phone className="w-3 h-3 text-indigo-500" /> Ringing</span>;
      case 'NOT_ANSWERED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">No Answer</span>;
      case 'NOT_INTERESTED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">Not Interested</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800">Pending</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
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

      {/* Header Banner */}
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
              Admin Seller & Lead Management
            </h1>
            <p className="text-sm text-blue-100/80 max-w-2xl font-medium leading-relaxed">
              Exclusively manage sales personnel, assign incoming campaign leads, track conversion pipelines, and review sales performance metrics.
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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Sales Reps */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Sales Personnel</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{kpis.totalSellers}</h3>
            <span className="text-xs font-bold text-slate-400">Active Reps</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Exclusively sales staff</p>
        </div>

        {/* Total Leads Pipeline */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Leads</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{kpis.totalLeads}</h3>
            <span className="text-xs font-bold text-slate-400">In Pipeline</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">All logged calls & inquiries</p>
        </div>

        {/* Hot & Won Deals */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Hot & Won</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{kpis.hotLeads + kpis.convertedDeals}</h3>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{kpis.conversionRate}% Rate</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">{kpis.convertedDeals} Won, {kpis.hotLeads} Hot Leads</p>
        </div>

        {/* Total Pipeline Value (₹) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Pipeline Value</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-lg font-extrabold text-emerald-600">₹</span>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {kpis.totalPipelineValue.toLocaleString('en-IN')}
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Potential deal revenue</p>
        </div>

        {/* Follow-ups Due Today */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-purple-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Follow-ups Today</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{kpis.followUpsToday}</h3>
            <span className="text-xs font-bold text-slate-400">Scheduled</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Calls due for today</p>
        </div>
      </div>

      {/* Sales Team Members Cards / Switcher */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              Dedicated Sales Personnel ({salesUsers.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Click any salesperson below to isolate their active lead pipeline.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedSellerId('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedSellerId === 'ALL'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All Salespersons ({callsList.length} leads)
            </button>
          </div>
        </div>

        {salesUsers.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-3">
            <Users className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No sales persons registered yet</p>
            <p className="text-xs text-slate-400">Onboard your first sales representative to begin logging and distributing leads.</p>
            <button
              onClick={() => setShowAddSellerModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
            >
              + Onboard Sales Rep Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {sellerStats.map(seller => {
              const isSelected = selectedSellerId === seller.id.toString();
              return (
                <div
                  key={seller.id}
                  onClick={() => setSelectedSellerId(isSelected ? 'ALL' : seller.id.toString())}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10 ring-2 ring-blue-500/20'
                      : 'bg-slate-50/50 dark:bg-slate-850/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-lg shadow-xs">
                        {seller.avatar || '👤'}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition">
                          {seller.name}
                        </h4>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                          {seller.designation || 'Sales Rep'}
                        </p>
                      </div>
                    </div>
                    
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                      {seller.totalLeads} Leads
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 py-2 border-y border-slate-200/60 dark:border-slate-750 text-center">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400">Hot / Won</div>
                      <div className="text-xs font-black text-amber-600 dark:text-amber-400">{seller.hotLeads + seller.wonDeals}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400">Conversion</div>
                      <div className="text-xs font-black text-emerald-600">{seller.conversionRate}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400">Pipeline</div>
                      <div className="text-xs font-black text-slate-900 dark:text-white">₹{seller.pipelineValue.toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate">{seller.email}</span>
                    {isSelected && (
                      <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Active Filter
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CRM Filter Bar & View Mode Switcher */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search & Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-3 flex-grow">
            {/* Search Input */}
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lead name, phone, seller, notes..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 dark:text-white transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Campaign Filter */}
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Campaigns</option>
              <option value="Facebook">Facebook Campaign</option>
              <option value="LinkedIn">LinkedIn Campaign</option>
              <option value="Google">Google Campaign</option>
              <option value="Website">Website Leads</option>
              <option value="Direct">Direct Inquiries</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Stages / Statuses</option>
              <option value="HOT">🔥 Hot Leads (Interested)</option>
              <option value="WON">✅ Won / Closed Deals</option>
              <option value="FOLLOW_UP">📞 Follow-Up / Callback</option>
              <option value="PENDING">⏳ Pending / New</option>
              <option value="COLD">❄️ Cold / Not Interested</option>
            </select>
          </div>

          {/* View Mode Switcher & Delete Action */}
          <div className="flex items-center gap-2 shrink-0">
            {callsList.length > 0 && (
              <button
                onClick={() => {
                  setDeleteScope(selectedSellerId !== 'ALL' ? 'SELLER' : 'ALL');
                  setShowDeleteModal(true);
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Delete leads"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Delete All Leads</span>
              </button>
            )}

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('TABLE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition ${
                  viewMode === 'TABLE'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Table View
              </button>
              <button
                onClick={() => setViewMode('KANBAN')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition ${
                  viewMode === 'KANBAN'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Pipeline Kanban
              </button>
            </div>
          </div>
        </div>

        {/* Current Active Filter Indicators */}
        {(selectedSellerId !== 'ALL' || selectedCampaign !== 'ALL' || selectedStatus !== 'ALL' || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="font-bold text-slate-400">Active Filters:</span>
            {selectedSellerId !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold">
                Seller: {salesUsers.find(s => s.id.toString() === selectedSellerId)?.name || selectedSellerId}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedSellerId('ALL')} />
              </span>
            )}
            {selectedCampaign !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold">
                Campaign: {selectedCampaign}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCampaign('ALL')} />
              </span>
            )}
            {selectedStatus !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                Status: {selectedStatus}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedStatus('ALL')} />
              </span>
            )}
            <button
              onClick={() => {
                setSelectedSellerId('ALL');
                setSelectedCampaign('ALL');
                setSelectedStatus('ALL');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-red-600 hover:underline ml-2"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* VIEW MODE 1: CRM TABLE VIEW */}
      {viewMode === 'TABLE' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Sales Pipeline & Call Records ({filteredCalls.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time status updates and salesperson lead reassignments</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4 pl-6">Client / Lead</th>
                  <th className="p-4">Assigned Salesperson</th>
                  <th className="p-4">Stage / Status</th>
                  <th className="p-4">Deal Value (₹)</th>
                  <th className="p-4">Campaign / Source</th>
                  <th className="p-4">Follow-up Date</th>
                  <th className="p-4">Notes & Remarks</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-12 text-center text-slate-400 font-medium">
                      No leads match the selected sales filters.
                    </td>
                  </tr>
                ) : (
                  filteredCalls.map((call) => {
                    const isFollowUpDue = call.followUpDate && new Date(call.followUpDate).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
                    const isOverdue = call.followUpDate && new Date(call.followUpDate) < new Date() && !isFollowUpDue;

                    return (
                      <tr key={call.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition">
                        {/* Client / Contact */}
                        <td className="p-4 pl-6">
                          <div className="font-black text-slate-900 dark:text-white text-sm">
                            {call.clientName}
                          </div>
                          {(() => {
                            const reqMatch = call.notes?.match(/Requirement:\s*([^|\[\]]+)/i);
                            const req = reqMatch ? reqMatch[1].trim() : null;
                            if (req) {
                              return (
                                <div className="mt-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                    🎯 {req}
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          <div className="flex items-center gap-2 mt-1 text-slate-500 font-semibold">
                            <span>{call.phoneNumber}</span>
                            <button
                              onClick={() => handleWhatsApp(call.phoneNumber, call.clientName)}
                              className="text-emerald-600 hover:text-emerald-700 transition"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Assigned Salesperson (With Reassign dropdown) */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold shrink-0">
                              {call.salesPerson?.avatar || '👤'}
                            </span>
                            <select
                              value={call.salesPersonId}
                              onChange={(e) => handleReassignLead(call.id, e.target.value)}
                              className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
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

                        {/* Status (With inline stage picker) */}
                        <td className="p-4">
                          <select
                            value={call.status}
                            onChange={(e) => handleUpdateLeadStatus(call.id, e.target.value)}
                            className="p-1.5 bg-transparent border-0 font-bold text-xs cursor-pointer focus:outline-none rounded-lg"
                          >
                            <option value="INTERESTED">🔥 Hot Lead</option>
                            <option value="ANSWERED">✅ Won / Closed</option>
                            <option value="CALLBACK">📞 Callback</option>
                            <option value="RINGING">🔔 Ringing</option>
                            <option value="PENDING">⏳ Pending</option>
                            <option value="NOT_ANSWERED">❄️ No Answer</option>
                            <option value="NOT_INTERESTED">❌ Not Interested</option>
                          </select>
                          <div className="mt-0.5">{getStatusBadge(call.status)}</div>
                        </td>

                        {/* Deal Value */}
                        <td className="p-4 font-black text-slate-900 dark:text-white">
                          {call.expectedValue ? `₹${call.expectedValue.toLocaleString('en-IN')}` : '—'}
                        </td>

                        {/* Lead Source */}
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold">
                            {call.leadSource || 'Campaign Lead'}
                          </span>
                        </td>

                        {/* Follow-up Date */}
                        <td className="p-4">
                          {call.followUpDate ? (
                            <div>
                              <div className={`font-bold flex items-center gap-1 ${
                                isFollowUpDue ? 'text-purple-600 dark:text-purple-400' : isOverdue ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'
                              }`}>
                                <Calendar className="w-3 h-3" />
                                {new Date(call.followUpDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                              {isFollowUpDue && <span className="text-[9px] font-black uppercase text-purple-600 bg-purple-50 dark:bg-purple-950 px-1.5 py-0.5 rounded">Due Today</span>}
                              {isOverdue && <span className="text-[9px] font-black uppercase text-red-600 bg-red-50 dark:bg-red-950 px-1.5 py-0.5 rounded">Overdue</span>}
                            </div>
                          ) : (() => {
                            const schedMatch = call.notes?.match(/Schedule:\s*([^|\[\]]+)/i);
                            const sched = schedMatch ? schedMatch[1].trim() : null;
                            if (sched) {
                              return (
                                <div className="font-bold text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                  <span>{sched}</span>
                                </div>
                              );
                            }
                            return <span className="text-slate-400">None</span>;
                          })()}
                        </td>

                        {/* Notes */}
                        <td className="p-4 max-w-xs text-slate-600 dark:text-slate-300 text-xs font-medium" title={call.notes}>
                          {(() => {
                            const remarksMatch = call.notes?.match(/Remarks:\s*([^|\[\]]+)/i);
                            if (remarksMatch) {
                              return (
                                <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                                  <span>💬</span>
                                  <span className="truncate">{remarksMatch[1].trim()}</span>
                                </div>
                              );
                            }
                            return <div className="truncate">{call.notes || '—'}</div>;
                          })()}
                          {call.notes && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5" title={call.notes}>
                              {call.notes}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedLead(call);
                                setShowEditLeadModal(true);
                              }}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-blue-600 transition"
                              title="Edit Lead"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteLead(call.id, call.clientName)}
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-slate-400 hover:text-red-600 transition"
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
                {filteredCalls.filter(c => c.status === 'PENDING').length}
              </span>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[700px]">
              {filteredCalls.filter(c => c.status === 'PENDING').map(call => (
                <KanbanCard key={call.id} call={call} onWhatsApp={handleWhatsApp} onEdit={() => { setSelectedLead(call); setShowEditLeadModal(true); }} onStatusChange={handleUpdateLeadStatus} />
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
                {filteredCalls.filter(c => c.status === 'CALLBACK' || c.status === 'RINGING').length}
              </span>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[700px]">
              {filteredCalls.filter(c => c.status === 'CALLBACK' || c.status === 'RINGING').map(call => (
                <KanbanCard key={call.id} call={call} onWhatsApp={handleWhatsApp} onEdit={() => { setSelectedLead(call); setShowEditLeadModal(true); }} onStatusChange={handleUpdateLeadStatus} />
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
                {filteredCalls.filter(c => c.status === 'INTERESTED').length}
              </span>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[700px]">
              {filteredCalls.filter(c => c.status === 'INTERESTED').map(call => (
                <KanbanCard key={call.id} call={call} onWhatsApp={handleWhatsApp} onEdit={() => { setSelectedLead(call); setShowEditLeadModal(true); }} onStatusChange={handleUpdateLeadStatus} />
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
                {filteredCalls.filter(c => c.status === 'ANSWERED').length}
              </span>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[700px]">
              {filteredCalls.filter(c => c.status === 'ANSWERED').map(call => (
                <KanbanCard key={call.id} call={call} onWhatsApp={handleWhatsApp} onEdit={() => { setSelectedLead(call); setShowEditLeadModal(true); }} onStatusChange={handleUpdateLeadStatus} />
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
                {filteredCalls.filter(c => c.status === 'NOT_ANSWERED' || c.status === 'NOT_INTERESTED').length}
              </span>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[700px]">
              {filteredCalls.filter(c => c.status === 'NOT_ANSWERED' || c.status === 'NOT_INTERESTED').map(call => (
                <KanbanCard key={call.id} call={call} onWhatsApp={handleWhatsApp} onEdit={() => { setSelectedLead(call); setShowEditLeadModal(true); }} onStatusChange={handleUpdateLeadStatus} />
              ))}
            </div>
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
                    placeholder="e.g. Ramesh Kumar"
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
                    placeholder="e.g. +91 98765 43210"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 dark:text-white"
                  />
                </div>
              </div>

              {/* STRICT DROPDOWN: ONLY SALES PERSONS */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Assign to Salesperson * <span className="text-[10px] text-blue-500 font-bold">(Exclusively Sales Reps)</span>
                </label>
                <select
                  required
                  value={leadForm.salesPersonId}
                  onChange={(e) => setLeadForm({ ...leadForm, salesPersonId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select Salesperson...</option>
                  {salesUsers.map(seller => (
                    <option key={seller.id} value={seller.id}>
                      👤 {seller.name} ({seller.email})
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

      {/* MODAL 3: EDIT LEAD DETAILS */}
      {showEditLeadModal && selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Edit Lead & Stage Information</h3>
              <button
                onClick={() => setShowEditLeadModal(false)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditLeadSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Client Name</label>
                  <input
                    type="text"
                    required
                    value={selectedLead.clientName}
                    onChange={(e) => setSelectedLead({ ...selectedLead, clientName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={selectedLead.phoneNumber}
                    onChange={(e) => setSelectedLead({ ...selectedLead, phoneNumber: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Reassign Salesperson</label>
                <select
                  value={selectedLead.salesPersonId}
                  onChange={(e) => setSelectedLead({ ...selectedLead, salesPersonId: parseInt(e.target.value, 10) })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  {salesUsers.map(seller => (
                    <option key={seller.id} value={seller.id}>
                      👤 {seller.name} ({seller.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Stage / Status</label>
                  <select
                    value={selectedLead.status}
                    onChange={(e) => setSelectedLead({ ...selectedLead, status: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="INTERESTED">🔥 Hot Lead</option>
                    <option value="CALLBACK">📞 Callback</option>
                    <option value="RINGING">🔔 Ringing</option>
                    <option value="ANSWERED">✅ Won / Closed</option>
                    <option value="NOT_ANSWERED">❄️ No Answer</option>
                    <option value="NOT_INTERESTED">❌ Not Interested</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Deal Value (₹)</label>
                  <input
                    type="number"
                    value={selectedLead.expectedValue || ''}
                    onChange={(e) => setSelectedLead({ ...selectedLead, expectedValue: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Notes & Follow-up History</label>
                <textarea
                  rows="4"
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
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : 'Save Changes'}
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
                    <div className="text-[10px] opacity-75">{filteredCalls.length} leads</div>
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
                {deleteScope === 'SELLER' && selectedSellerId !== 'ALL' ? filteredCalls.length : callsList.length} Leads
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
                disabled={isDeleting || (deleteScope === 'SELLER' ? filteredCalls.length === 0 : callsList.length === 0)}
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
            onClick={() => onWhatsApp(call.phoneNumber, call.clientName)}
            className="text-emerald-600 hover:text-emerald-700 p-0.5"
            title="WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onEdit}
            className="text-slate-400 hover:text-blue-600 p-0.5"
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

      {call.expectedValue && (
        <div className="text-xs font-black text-emerald-600">
          ₹{call.expectedValue.toLocaleString('en-IN')}
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
