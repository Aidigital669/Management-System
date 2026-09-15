'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  RefreshCw,
  Info,
  Trash2
} from 'lucide-react';

const TEMPLATE_CONFIGS = {
  clients: {
    title: 'Clients & Accounts',
    filename: 'Clients_Upload_Template.xlsx',
    badge: 'CLIENT CRM',
    description: 'Bulk import clients, billing packages, services, and auto-provision client portal logins.',
    headers: [
      'Business Name',
      'Client Name',
      'Contact Number',
      'Email',
      'Joining Date',
      'Services',
      'Package Name',
      'Package Amount',
      'Client ID',
      'Website',
      'Sector',
      'Requirement',
      'Notes'
    ],
    sampleRows: [
      [
        'Apex Realty Solutions',
        'Rajesh Kumar',
        '9876543210',
        'rajesh@apexrealty.in',
        '2026-03-01',
        'Meta Ads + Creative Design',
        'Standard Plan',
        19499,
        'CL-1045',
        'https://apexrealty.in',
        'Real Estate',
        'Lead generation campaigns for luxury 3BHK flats',
        'Monthly contract renewed on 1st'
      ],
      [
        'Bloom Dental Clinic',
        'Dr. Ananya Roy',
        '9823456781',
        'info@bloomdental.com',
        '2026-03-15',
        'Social Media Management',
        'Basic Plan',
        7499,
        '',
        'https://bloomdental.com',
        'Healthcare',
        'Instagram reels and local Google reviews growth',
        'Auto client ID generated if left blank'
      ]
    ],
    requiredFields: ['Business Name']
  },

  employees: {
    title: 'Employees & Staff Directory',
    filename: 'Employees_Upload_Template.xlsx',
    badge: 'HR / STAFF',
    description: 'Bulk onboard employees, set department, role, mobile, designation, and salary.',
    headers: [
      'Name',
      'Email',
      'Password',
      'Department',
      'Role',
      'Designation',
      'Salary',
      'Mobile',
      'Date of Joining',
      'Address'
    ],
    sampleRows: [
      [
        'Aman Verma',
        'aman.verma@company.com',
        'Staff@123',
        'Social Media Marketing',
        'EMPLOYEE',
        'Social Media Executive',
        25000,
        '9811223344',
        '2026-02-01',
        'Noida Sector 62'
      ],
      [
        'Priya Sharma',
        'priya.s@company.com',
        'Staff@123',
        'Graphic Designing',
        'EMPLOYEE',
        'Graphic Designer',
        28000,
        '9722334455',
        '2026-02-15',
        'South Delhi'
      ]
    ],
    requiredFields: ['Name', 'Email']
  },

  tasks: {
    title: 'Tasks Management',
    filename: 'Tasks_Upload_Template.xlsx',
    badge: 'TASK OPERATIONS',
    description: 'Bulk assign tasks with assignees, due dates, and priority flags.',
    headers: [
      'Task Title',
      'Description',
      'Assigned To',
      'Due Date',
      'Priority',
      'Status'
    ],
    sampleRows: [
      [
        'Design 5 Instagram Creatives for Apex Realty',
        'Create high-converting real estate promotional banners in 1080x1080 and story formats',
        'aman.verma@company.com',
        '2026-03-25',
        'High',
        'TODO'
      ],
      [
        'Review March Monthly Ads Performance Report',
        'Compile impressions, CPC, CTR, and deliver to client account manager',
        'priya.s@company.com',
        '2026-03-28',
        'Normal',
        'TODO'
      ]
    ],
    requiredFields: ['Task Title']
  },

  leads: {
    title: 'Sales Leads CRM (Seller Command Center)',
    filename: 'Sales_Leads_Upload_Template.xlsx',
    badge: 'LEADS CRM',
    description: 'Bulk import leads with Contact Person, Company Name, Package / Service, and Phone Number.',
    headers: [
      'Contact Person',
      'Company Name',
      'Phone Number',
      'Package / Plan',
      'Lead Source',
      'Status',
      'Status Lead',
      'Expected Value',
      'Notes',
      'Salesperson Email'
    ],
    sampleRows: [
      [
        'Vikram Malhotra',
        'Malhotra Enterprises',
        '9899001122',
        'Combo - Standard',
        'Justdial',
        'PENDING',
        'Raw Lead',
        19499,
        'Inquired for Meta + Google Ads marketing',
        ''
      ],
      [
        'Sonia Singhania',
        'Singhania Fashion Studio',
        '9711882233',
        'Meta Ads - Standard (Monthly)',
        'Facebook Campaign',
        'INTERESTED',
        'Hot Lead',
        3999,
        'Requested quotation for Instagram Growth & Reels Package',
        ''
      ]
    ],
    requiredFields: ['Contact Person', 'Phone Number']
  }
};

export const AGENCY_PACKAGES = [
  { category: 'Meta Ads Plans', name: 'Meta Ads - Basic', price: 2499 },
  { category: 'Meta Ads Plans', name: 'Meta Ads - Standard (Monthly)', price: 3999 },
  { category: 'Meta Ads Plans', name: 'Meta Ads - Premium (3-Month)', price: 6899 },
  { category: 'Meta Ads Plans', name: 'Meta Ads - Platinum', price: 12599 },
  { category: 'Google Ads Plans', name: 'Google Ads - Basic Plan', price: 4999 },
  { category: 'Google Ads Plans', name: 'Google Ads - Standard Plan', price: 13499 },
  { category: 'Google Ads Plans', name: 'Google Ads - Premium Plan', price: 23999 },
  { category: 'Combine Plans (Meta + Google Ads)', name: 'Combo - Basic', price: 6999 },
  { category: 'Combine Plans (Meta + Google Ads)', name: 'Combo - Standard', price: 19499 },
  { category: 'Combine Plans (Meta + Google Ads)', name: 'Combo - Premium', price: 35999 },
  { category: 'Website Design & Development', name: 'Website - Static', price: 7499 },
  { category: 'Website Design & Development', name: 'Website - Dynamic', price: 14999 },
  { category: 'Creative Design Packs', name: 'Creative Pack - Starter', price: 599 },
  { category: 'Creative Design Packs', name: 'Creative Pack - Growth', price: 1099 },
  { category: 'Creative Design Packs', name: 'Creative Pack - Value', price: 1499 },
  { category: 'Creative Design Packs', name: 'Creative Pack - Standard', price: 1899 },
  { category: 'Creative Design Packs', name: 'Creative Pack - Pro', price: 2699 },
  { category: 'AI Video Plans', name: 'AI Video - Starter Plan', price: 4500 },
  { category: 'AI Video Plans', name: 'AI Video - Growth Plan', price: 5950 },
  { category: 'AI Video Plans', name: 'AI Video - Pro Plan', price: 8000 }
];

export default function ExcelImportModal({ isOpen, onClose, panelType = 'clients', salesUsers = [], onSuccess }) {
  const [mounted, setMounted] = useState(false);
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [assignedSalespersonId, setAssignedSalespersonId] = useState('ROUND_ROBIN');
  const [localSalesUsers, setLocalSalesUsers] = useState(salesUsers);

  // Column mapping states
  const [selectedNameCol, setSelectedNameCol] = useState('');
  const [selectedCompanyCol, setSelectedCompanyCol] = useState('');
  const [selectedPhoneCol, setSelectedPhoneCol] = useState('');
  const [selectedStatusCol, setSelectedStatusCol] = useState('');
  const [selectedStatusLeadCol, setSelectedStatusLeadCol] = useState('');
  const [selectedPackageCol, setSelectedPackageCol] = useState('');
  const [selectedDefaultPackage, setSelectedDefaultPackage] = useState('');
  const [selectedSourceCol, setSelectedSourceCol] = useState('');
  const [wipeBeforeImport, setWipeBeforeImport] = useState(false);
  const [wipingData, setWipingData] = useState(false);
  const [wipeSuccessMsg, setWipeSuccessMsg] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (salesUsers && salesUsers.length > 0) {
      setLocalSalesUsers(salesUsers);
    } else if (panelType === 'leads') {
      fetch('/api/users')
        .then(res => res.json())
        .then(data => {
          const list = (data.users || []).filter(u => 
            u.role === 'SALES' || 
            (u.department && u.department.toLowerCase().includes('sales')) ||
            (u.designation && u.designation.toLowerCase().includes('sales'))
          );
          setLocalSalesUsers(list);
        })
        .catch(err => console.warn('Failed to fetch sales users:', err));
    }
  }, [salesUsers, panelType, isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const config = TEMPLATE_CONFIGS[panelType] || TEMPLATE_CONFIGS.clients;

  // 1. Download formatted Excel template
  const handleDownloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();
      const sheetData = [config.headers, ...config.sampleRows];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      const colWidths = config.headers.map(h => ({ wch: Math.max(h.length + 5, 20) }));
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Import_Template');
      XLSX.writeFile(wb, config.filename);
    } catch (err) {
      console.error('Error generating template:', err);
      setErrorMsg('Failed to generate template file.');
    }
  };

  // Full delete handler for existing leads
  const handleWipeExistingData = async () => {
    if (!window.confirm('Are you sure you want to delete ALL existing leads from the CRM? This will permanently wipe all current leads.')) {
      return;
    }
    setWipingData(true);
    setErrorMsg('');
    setWipeSuccessMsg('');
    try {
      if (panelType === 'leads') {
        const res = await fetch('/api/calls?all=true', { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to wipe leads data');
        setWipeSuccessMsg(`All ${data.count} existing leads have been permanently deleted.`);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error('Wipe data error:', err);
      setErrorMsg(err.message || 'Failed to delete data');
    } finally {
      setWipingData(false);
    }
  };

  // 2. Parse uploaded file (.xlsx, .xls, .csv) with intelligent header detection
  const processFile = async (uploadedFile) => {
    if (!uploadedFile) return;
    setErrorMsg('');
    setResult(null);
    setIsProcessing(true);
    setFile(uploadedFile);

    try {
      const data = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert to array of arrays to find the actual header row
      const aoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (!aoa || aoa.length === 0) {
        setErrorMsg('The uploaded spreadsheet contains no rows.');
        setParsedRows([]);
        setIsProcessing(false);
        return;
      }

      // Find first row that has 2 or more filled cells (skips single title headers)
      let headerRowIndex = 0;
      for (let r = 0; r < Math.min(aoa.length, 6); r++) {
        const rowCells = (aoa[r] || []).filter(c => c !== null && c !== undefined && String(c).trim() !== '');
        if (rowCells.length >= 2) {
          headerRowIndex = r;
          break;
        }
      }

      const rawJson = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex, defval: '' });

      // Filter out completely blank rows
      const validRows = (rawJson || []).filter(row => 
        Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '')
      );

      if (validRows.length === 0) {
        setErrorMsg('The spreadsheet contains no valid data rows.');
        setParsedRows([]);
        setIsProcessing(false);
        return;
      }

      const headers = Object.keys(validRows[0] || {});
      setPreviewHeaders(headers);

      // 1. Auto-detect by header name
      let detectedName = headers.find(h => {
        const c = h.toLowerCase().replace(/[\s_\-\.\:\(\)]/g, '');
        return ['clientname', 'fullname', 'customername', 'leadname', 'businessname', 'contactperson', 'name', 'person', 'caller', 'party', 'customer', 'client', 'buyer', 'prospect', 'lead'].some(t => c.includes(t));
      }) || '';

      let detectedPhone = headers.find(h => {
        const c = h.toLowerCase().replace(/[\s_\-\.\:\(\)]/g, '');
        return ['phone', 'mobile', 'contact', 'cell', 'tel', 'whatsapp', 'number'].some(t => c.includes(t));
      }) || '';

      // 2. Content-based scanning (Crucial for PDF converted files with __EMPTY, __EMPTY_1, etc.)
      const sampleRows = validRows.slice(0, 10);

      // Detect phone column by values (starts with 'p:', '+', or has 10-15 digits)
      if (!detectedPhone) {
        for (const h of headers) {
          const matchCount = sampleRows.filter(row => {
            const val = String(row[h] || '').trim().toLowerCase();
            return val.startsWith('p:') || val.startsWith('ph:') || val.startsWith('tel:') || /^\+?[0-9\s\-()]{10,}$/.test(val) || val.replace(/[^0-9]/g, '').length >= 10;
          }).length;
          if (matchCount >= Math.min(2, sampleRows.length)) {
            detectedPhone = h;
            break;
          }
        }
      }

      // Detect name column by values (letters with space, not starting with 'p:', not a date or url)
      if (!detectedName) {
        for (const h of headers) {
          if (h === detectedPhone) continue;
          const matchCount = sampleRows.filter(row => {
            const val = String(row[h] || '').trim();
            return val.length >= 2 && val.length <= 40 &&
                   /[a-zA-Z]/.test(val) &&
                   !/^p:\+?[0-9]/i.test(val) &&
                   !/^(call|setp|sept|meet|http|\d)/i.test(val) &&
                   !val.includes('@');
          }).length;
          if (matchCount >= Math.min(2, sampleRows.length)) {
            detectedName = h;
            break;
          }
        }
      }

      // Explicit fallback for __EMPTY headers commonly created by PDF converters
      if (!detectedName && headers.includes('__EMPTY')) {
        detectedName = '__EMPTY';
      }
      if (!detectedPhone && headers.includes('__EMPTY_1')) {
        detectedPhone = '__EMPTY_1';
      }

      // Auto-detect Status Lead / Sub-status
      const detectedStatusLead = headers.find(h => {
        const c = h.toLowerCase().replace(/[\s_\-\.\:\(\)\[\]]/g, '');
        return ['statuslead', 'leadstatus', 'leadsubstatus', 'substatus', 'leadstage', 'stagelead'].some(t => c === t || c.includes(t));
      }) || '';

      // Auto-detect general Status
      const detectedStatus = headers.find(h => {
        if (h === detectedStatusLead) return false;
        const c = h.toLowerCase().replace(/[\s_\-\.\:\(\)\[\]]/g, '');
        return ['status', 'stage', 'disposition', 'state', 'callstatus', 'leadstate'].some(t => c === t || c.includes(t));
      }) || (detectedStatusLead ? '' : (headers.find(h => h.toLowerCase().includes('status')) || ''));

      const detectedSource = headers.find(h => {
        const c = h.toLowerCase().replace(/[\s_\-\.\:\(\)]/g, '');
        return ['source', 'campaign', 'channel', 'medium', 'platform'].some(t => c.includes(t));
      }) || '';

      setSelectedNameCol(detectedName);
      setSelectedPhoneCol(detectedPhone);
      setSelectedStatusCol(detectedStatus || (detectedStatusLead && !headers.some(h => h.toLowerCase() === 'status') ? detectedStatusLead : ''));
      setSelectedStatusLeadCol(detectedStatusLead);
      setSelectedSourceCol(detectedSource);

      setParsedRows(validRows);
    } catch (err) {
      console.error('Failed to parse spreadsheet:', err);
      setErrorMsg('Could not parse the uploaded file. Please make sure it is a valid .xlsx, .xls, or .csv file.');
      setParsedRows([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) processFile(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) processFile(droppedFile);
  };

  const resetUpload = () => {
    setFile(null);
    setParsedRows([]);
    setPreviewHeaders([]);
    setSelectedNameCol('');
    setSelectedPhoneCol('');
    setSelectedStatusCol('');
    setSelectedStatusLeadCol('');
    setSelectedSourceCol('');
    setResult(null);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 3. Confirm and send batch to backend
  const handleConfirmImport = async () => {
    if (!parsedRows || parsedRows.length === 0) return;
    setImporting(true);
    setErrorMsg('');

    try {
      // Map user-selected columns to standard keys
      const preparedRows = parsedRows.map(row => {
        const normalized = { ...row };
        if (selectedNameCol && row[selectedNameCol] !== undefined) {
          normalized.clientName = String(row[selectedNameCol]).trim();
          normalized.personName = normalized.clientName;
        }
        if (selectedPhoneCol && row[selectedPhoneCol] !== undefined) {
          let p = String(row[selectedPhoneCol]).trim();
          p = p.replace(/^p:\+?/i, '').replace(/^ph:\+?/i, '').replace(/^tel:\+?/i, '').trim();
          normalized.phoneNumber = p;
        }
        if (selectedStatusCol && row[selectedStatusCol] !== undefined) {
          normalized.status = String(row[selectedStatusCol]).trim();
        }
        if (selectedStatusLeadCol && row[selectedStatusLeadCol] !== undefined) {
          normalized.statusLead = String(row[selectedStatusLeadCol]).trim();
        }
        if (selectedSourceCol && row[selectedSourceCol] !== undefined) {
          normalized.leadSource = String(row[selectedSourceCol]).trim();
        }
        return normalized;
      });

      const res = await fetch('/api/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: panelType,
          rows: preparedRows,
          assignedSalespersonId: panelType === 'leads' ? assignedSalespersonId : undefined,
          wipeBeforeImport: panelType === 'leads' ? wipeBeforeImport : undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Server error while importing rows');
      }

      setResult(data);
      if (data.successCount > 0 && onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Import error:', err);
      setErrorMsg(err.message || 'Failed to import data');
    } finally {
      setImporting(false);
    }
  };

  const modalJSX = (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl lg:max-w-4xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] my-auto"
      >
        
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/50">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {config.badge}
                </span>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  Bulk Excel Upload: <span className="text-emerald-600 dark:text-emerald-400">{config.title}</span>
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {config.description}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          
          {/* Top Info & Download Template Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Don&apos;t have our spreadsheet template?</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  You can upload your own file directly, or download our template with sample rows.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {panelType === 'leads' && (
                <button
                  type="button"
                  onClick={handleWipeExistingData}
                  disabled={wipingData}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  title="Wipe all existing leads from database"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  {wipingData ? 'Deleting...' : 'Delete All Existing Leads'}
                </button>
              )}
              <button
                onClick={handleDownloadTemplate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download Template (.xlsx)
              </button>
            </div>
          </div>

          {/* Wipe Success Banner */}
          {wipeSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{wipeSuccessMsg}</span>
              </div>
              <button onClick={() => setWipeSuccessMsg('')} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Admin Lead Assignment Selector (Only for Leads CRM) */}
          {panelType === 'leads' && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/60 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <label className="text-xs font-extrabold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                  <span>🎯 Assign Uploaded Leads To:</span>
                </label>
                <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 mt-0.5">
                  Admin decides who works on these leads: distribute evenly or allocate to a designated salesperson.
                </p>
              </div>

              <select
                value={assignedSalespersonId}
                onChange={(e) => setAssignedSalespersonId(e.target.value)}
                className="px-3.5 py-2 text-xs font-bold rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs min-w-[240px]"
              >
                <option value="ROUND_ROBIN">🔄 Round-Robin (Distribute Evenly)</option>
                <option value="EXCEL_COLUMN">📄 From Excel &quot;Salesperson Email&quot; column</option>
                {localSalesUsers.length > 0 && (
                  <optgroup label="Directly Assign to Salesperson:">
                    {localSalesUsers.map(seller => (
                      <option key={seller.id} value={seller.id.toString()}>
                        👤 {seller.name} ({seller.email})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Upload Dropzone (if no rows parsed yet) */}
          {parsedRows.length === 0 && !result && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
                {isProcessing ? (
                  <Loader2 className="w-7 h-7 animate-spin" />
                ) : (
                  <UploadCloud className="w-7 h-7" />
                )}
              </div>

              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mb-1">
                {isProcessing ? 'Reading spreadsheet data...' : 'Click to upload or drag & drop spreadsheet'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-3">
                Supports any Excel spreadsheet (<span className="font-semibold text-slate-700 dark:text-slate-300">.xlsx, .xls</span>) and Comma-Separated Values (<span className="font-semibold text-slate-700 dark:text-slate-300">.csv</span>).
              </p>

              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>Auto-maps any column names (Name, Phone, Mobile, Contact, Source, Notes)</span>
              </div>
            </div>
          )}

          {/* Interactive Column Mapping & Table Preview (if file parsed) */}
          {parsedRows.length > 0 && !result && (
            <div className="space-y-4">
              
              {/* Column Mapping Selector Card */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs font-extrabold text-emerald-950 dark:text-emerald-200">
                      Spreadsheet Columns Detected ({parsedRows.length} rows)
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    Verify or change mapped columns below
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      👤 Client / Person Name:
                    </label>
                    <select
                      value={selectedNameCol}
                      onChange={(e) => setSelectedNameCol(e.target.value)}
                      className={`w-full px-3 py-1.5 text-xs font-bold rounded-xl border ${
                        !selectedNameCol ? 'border-amber-400 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-950/20' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                      } text-slate-800 dark:text-white outline-none focus:border-emerald-500 cursor-pointer shadow-xs`}
                    >
                      <option value="">-- Auto-detect Name --</option>
                      {previewHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    {!selectedNameCol && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5 block">
                        Select column to avoid "Lead (phone)"
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      📞 Phone / Mobile Number:
                    </label>
                    <select
                      value={selectedPhoneCol}
                      onChange={(e) => setSelectedPhoneCol(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-emerald-400 dark:border-emerald-600 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 font-extrabold outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
                    >
                      <option value="">-- Auto-scan Phone --</option>
                      {previewHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {panelType === 'leads' && (
                    <>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          🏷️ Status:
                        </label>
                        <select
                          value={selectedStatusCol}
                          onChange={(e) => setSelectedStatusCol(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-emerald-500 cursor-pointer shadow-xs"
                        >
                          <option value="">-- Auto-detect Status --</option>
                          {previewHeaders.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          📋 Status Lead:
                        </label>
                        <select
                          value={selectedStatusLeadCol}
                          onChange={(e) => setSelectedStatusLeadCol(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-emerald-500 cursor-pointer shadow-xs"
                        >
                          <option value="">-- Auto-detect Status Lead --</option>
                          {previewHeaders.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          📢 Lead Source / Platform:
                        </label>
                        <select
                          value={selectedSourceCol}
                          onChange={(e) => setSelectedSourceCol(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-emerald-500 cursor-pointer shadow-xs"
                        >
                          <option value="">-- Default ("Excel Import") --</option>
                          {previewHeaders.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>

                <div className="text-[11px] text-emerald-800 dark:text-emerald-300/90 bg-emerald-100/60 dark:bg-emerald-950/50 p-2 rounded-xl flex items-center gap-1.5 font-medium">
                  <Info className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>100% of rows from your spreadsheet will be uploaded. The exact status and status lead from your sheet will be mapped to the CRM pipeline and recorded in lead notes.</span>
                </div>
              </div>

              {/* Data Preview Header Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    File: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{file?.name}</span>
                  </span>
                  <span className="px-2 py-0.5 text-[11px] font-extrabold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    {parsedRows.length} Rows Ready
                  </span>
                </div>

                <button
                  onClick={resetUpload}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition font-medium"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Choose different file
                </button>
              </div>

              {/* Data Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-100 dark:bg-slate-800/60 px-3.5 py-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex justify-between">
                  <span>Data Preview (Showing first 5 rows)</span>
                  <span>{previewHeaders.length} Columns Detected</span>
                </div>

                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="p-2.5 w-10 text-center text-slate-400">#</th>
                        {previewHeaders.slice(0, 8).map((header, idx) => {
                          const isName = header === selectedNameCol;
                          const isPhone = header === selectedPhoneCol;
                          const isStatus = header === selectedStatusCol || header === selectedStatusLeadCol;
                          return (
                            <th key={idx} className="p-2.5 whitespace-nowrap">
                              <span className={isName || isPhone ? 'font-extrabold text-slate-900 dark:text-white' : ''}>{header}</span>
                              {isName && <span className="ml-1 px-1.5 py-0.5 text-[9px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded font-bold">👤 Name</span>}
                              {isPhone && <span className="ml-1 px-1.5 py-0.5 text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded font-bold">📞 Phone</span>}
                              {isStatus && <span className="ml-1 px-1.5 py-0.5 text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded font-bold">🏷️ Status</span>}
                            </th>
                          );
                        })}
                        {previewHeaders.length > 8 && (
                          <th className="p-2.5 text-slate-400 italic">+{previewHeaders.length - 8} more cols</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedRows.slice(0, 5).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 text-slate-700 dark:text-slate-300">
                          <td className="p-2.5 text-center text-slate-400 text-[11px] font-mono">{rIdx + 1}</td>
                          {previewHeaders.slice(0, 6).map((header, cIdx) => (
                            <td key={cIdx} className="p-2.5 whitespace-nowrap max-w-[160px] truncate">
                              {String(row[header] ?? '') || <span className="text-slate-300 dark:text-slate-600 italic">empty</span>}
                            </td>
                          ))}
                          {previewHeaders.length > 6 && (
                            <td className="p-2.5 text-slate-400">...</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Import Result Screen */}
          {result && (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Import Processing Completed!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {result.message}
                  </p>
                </div>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Total Rows</span>
                  <p className="text-lg font-black text-slate-800 dark:text-slate-100">{result.total}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
                  <span className="text-[10px] text-emerald-600 uppercase font-bold">Successfully Added</span>
                  <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{result.successCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-center">
                  <span className="text-[10px] text-rose-600 uppercase font-bold">Failed / Skipped</span>
                  <p className="text-lg font-black text-rose-700 dark:text-rose-400">{result.failedCount}</p>
                </div>
              </div>

              {/* Error Details if any */}
              {result.errors && result.errors.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    Issues encountered ({result.errors.length}):
                  </span>
                  <div className="max-h-36 overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    {result.errors.map((err, eIdx) => (
                      <div key={eIdx} className="p-2.5 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                        <span>Row {err.row}: {err.reason}</span>
                        {err.identifier && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            {err.identifier}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            {result ? 'Close' : 'Cancel'}
          </button>

          {!result && parsedRows.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              {panelType === 'leads' && (
                <label className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 cursor-pointer select-none px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl">
                  <input
                    type="checkbox"
                    checked={wipeBeforeImport}
                    onChange={(e) => setWipeBeforeImport(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Wipe previous leads before importing</span>
                </label>
              )}

              <button
                onClick={resetUpload}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importing}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing {parsedRows.length} Records...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    Upload & Commit {parsedRows.length} Rows
                  </>
                )}
              </button>
            </div>
          )}

          {result && (
            <button
              onClick={() => {
                resetUpload();
                onClose();
              }}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md shadow-emerald-600/20"
            >
              Done
            </button>
          )}
        </div>

      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
}
