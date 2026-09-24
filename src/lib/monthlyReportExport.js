import * as XLSX from 'xlsx';
import { 
  getClientPlanInfo, 
  getClientRevenueStream, 
  isClientPlanActive,
  isClientContractInMonth,
  parseDbDate,
  formatDateToDb
} from '@/lib/planUtils';
import { isDoneStatus, getDistinctDeliveries } from '@/lib/taskStatusUtils';

/**
 * Generates and downloads a multi-sheet Excel (.xlsx) report for the selected month or date range.
 * 
 * @param {Object} options
 * @param {string} options.monthKey - e.g. '2026-09' or 'all' or 'custom'
 * @param {string} options.startDate - e.g. '2026-09-01'
 * @param {string} options.endDate - e.g. '2026-09-30'
 * @param {string} options.periodLabel - e.g. 'September 2026'
 * @param {Array} options.clients - List of all CRM clients
 * @param {Array} options.tasks - List of client tasks
 * @param {Array} options.deliveries - List of deliveries
 * @param {Array} options.employeeData - List of employees with stats
 * @param {Array} options.calls - Telemarketing/internal calls
 */
export function exportMonthlyReport({
  monthKey = 'current',
  startDate = '',
  endDate = '',
  periodLabel = '',
  clients = [],
  tasks = [],
  deliveries = [],
  employeeData = [],
  calls = []
}) {
  const wb = XLSX.utils.book_new();

  // 1. Filter clients relevant to this period
  const periodClients = clients.filter(c => {
    if (monthKey === 'all' && !startDate && !endDate) return true;
    if (startDate || endDate) {
      return isClientContractInMonth(c, null, startDate, endDate);
    }
    return isClientContractInMonth(c, monthKey);
  });

  // Calculate financial figures for the period
  let totalContractValue = 0;
  let totalCollected = 0;
  let totalPending = 0;
  let newSalesAmount = 0;
  let newSalesCount = 0;
  let renewalAmount = 0;
  let renewalCount = 0;
  let retainerAmount = 0;
  let retainerCount = 0;

  const clientRows = periodClients.map(c => {
    const pkgAmt = c.packageAmount || 0;
    totalContractValue += pkgAmt;

    let pStatus = 'Full';
    let paidAmt = pkgAmt;
    try {
      if (c.notes && c.notes.trim().startsWith('{')) {
        const parsed = JSON.parse(c.notes);
        pStatus = parsed.paymentStatus || 'Full';
        paidAmt = parseFloat(parsed.paidAmount) !== undefined ? parseFloat(parsed.paidAmount) : pkgAmt;
      }
    } catch (e) {}

    let actualPaid = 0;
    if (pStatus === 'Full') {
      actualPaid = pkgAmt;
    } else if (pStatus === 'Partial' || pStatus === 'Half') {
      actualPaid = paidAmt;
    } else {
      actualPaid = 0;
    }

    const pendingAmt = Math.max(0, pkgAmt - actualPaid);
    totalCollected += actualPaid;
    totalPending += pendingAmt;

    const stream = getClientRevenueStream(c, monthKey);
    const planInfo = getClientPlanInfo(c);

    if (stream.type === 'NewPurchase') {
      newSalesCount++;
      newSalesAmount += actualPaid;
    } else if (stream.type === 'Renewal') {
      renewalCount++;
      renewalAmount += actualPaid;
    } else {
      retainerCount++;
      retainerAmount += actualPaid;
    }

    return {
      'Client ID': c.clientId || c.id || '',
      'Business Name': c.businessName || c.clientName || 'Unnamed Business',
      'Contact Person': c.clientName || c.contactPerson || '',
      'Phone Number': c.phone || '',
      'Package Name': c.packageName || c.selectedPackage || 'Standard Package',
      'Contract Value (INR)': pkgAmt,
      'Amount Collected (INR)': actualPaid,
      'Pending Balance (INR)': pendingAmt,
      'Payment Status': pStatus,
      'Revenue Stream': stream.type === 'NewPurchase' ? 'New Client Sale' : stream.type === 'Renewal' ? 'Plan Renewal' : 'Retainer',
      'Plan Duration': planInfo.planDurationLabel || '1 Month',
      'Start Date': c.planStartDate || c.contractStartDate || '',
      'Expiry Date': c.planEndDate || c.contractEndDate || '',
      'Plan Status': planInfo.status || 'Active',
      'Social Media Exec': c.dedicatedStaff || c.assignedExecutive || 'Unassigned',
      'Video Editor': c.dedicatedEditor || 'Unassigned'
    };
  });

  // 2. Filter tasks and deliveries relevant to the period
  const distinctDels = getDistinctDeliveries(deliveries, tasks);

  const isDateInPeriod = (dateStr) => {
    if (!dateStr) return false;
    let d = dateStr;
    if (d.includes('T')) d = d.split('T')[0];
    if (d.includes(' ')) d = d.split(' ')[0];
    if (startDate && endDate) {
      return d >= startDate && d <= endDate;
    }
    if (monthKey && monthKey !== 'all') {
      return d.startsWith(monthKey);
    }
    return true;
  };

  const periodTasks = tasks.filter(t => isDateInPeriod(t.date));
  const periodDeliveries = distinctDels.filter(d => isDateInPeriod(d.postDate));

  const totalDeliverablesCount = periodTasks.length + periodDeliveries.length;
  const completedTasksCount = periodTasks.filter(t => isDoneStatus(t.status)).length;
  const completedDeliveriesCount = periodDeliveries.filter(d => isDoneStatus(d.status)).length;
  const totalCompletedCount = completedTasksCount + completedDeliveriesCount;
  const totalPendingCount = totalDeliverablesCount - totalCompletedCount;
  const completionRate = totalDeliverablesCount > 0 ? Math.round((totalCompletedCount / totalDeliverablesCount) * 100) : 0;

  // 3. Telemarketing Leads
  const convertedCalls = calls.filter(c => c.status === 'ANSWERED' || c.status === 'CONVERTED' || c.status === 'WON');
  const hotCalls = calls.filter(c => c.status === 'INTERESTED' || c.status === 'CALLBACK');
  const callingPipelineValue = [...convertedCalls, ...hotCalls].reduce((sum, c) => {
    const val = typeof c.expectedValue === 'number' && c.expectedValue > 0
      ? c.expectedValue
      : (parseFloat(c.expectedValue) > 0 ? parseFloat(c.expectedValue) : 3500);
    return sum + val;
  }, 0);

  // -------------------------------------------------------------------------
  // SHEET 1: EXECUTIVE SUMMARY
  // -------------------------------------------------------------------------
  const summaryAoa = [
    ['AiDigitals Business Management System'],
    ['MONTHLY PERFORMANCE & REVENUE EXECUTIVE REPORT'],
    [''],
    ['Reporting Period:', periodLabel || monthKey],
    ['Date Range:', startDate && endDate ? `${startDate} to ${endDate}` : 'Full Calendar Month'],
    ['Generated On:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'],
    [''],
    ['--------------------------------------------------------------'],
    ['1. FINANCIAL PERFORMANCE & REVENUE RECONCILIATION'],
    ['--------------------------------------------------------------'],
    ['Metric', 'Amount (INR)', 'Details / Breakdown'],
    ['Actual Revenue Collected', totalCollected, 'Cash realized from all active client contracts in period'],
    ['Total Contract Value (Expected)', totalContractValue, 'Total billable contract amounts in period'],
    ['Collection Efficiency', `${totalContractValue > 0 ? Math.round((totalCollected / totalContractValue) * 100) : 100}%`, 'Percentage of contract revenue collected'],
    ['Achieved Sale (New Purchases)', newSalesAmount, `${newSalesCount} new client accounts acquired in period`],
    ['Achieved Renewal (Plan Renewals)', renewalAmount, `${renewalCount} existing client contracts renewed`],
    ['Retainer Revenue', retainerAmount, `${retainerCount} ongoing retainer contracts`],
    ['Outstanding Balance (Pending)', totalPending, 'Uncollected partial/pending contract balance'],
    ['Reconciliation Check', totalCollected === (newSalesAmount + renewalAmount + retainerAmount) ? 'BALANCED (100% Exact Match)' : 'Discrepancy Detected', `Sales (₹${newSalesAmount}) + Renewals (₹${renewalAmount}) + Retainers (₹${retainerAmount}) = ₹${totalCollected}`],
    [''],
    ['--------------------------------------------------------------'],
    ['2. OPERATIONAL WORKLOAD & DELIVERABLES SUMMARY'],
    ['--------------------------------------------------------------'],
    ['Metric', 'Count', 'Details'],
    ['Total Workload Scheduled', totalDeliverablesCount, 'Combined tasks and client content deliverables in period'],
    ['Deliverables Completed / Posted', totalCompletedCount, 'Completed, posted, or delivered items'],
    ['Deliverables Pending', totalPendingCount, 'Awaiting completion or approval'],
    ['Workload Velocity', `${completionRate}%`, 'Completion rate across all active assignments'],
    [''],
    ['--------------------------------------------------------------'],
    ['3. CLIENT PORTFOLIO HEALTH'],
    ['--------------------------------------------------------------'],
    ['Metric', 'Count', 'Details'],
    ['Total In-Scope Clients for Period', periodClients.length, 'Clients with active contract days in period'],
    ['New Acquisitions', newSalesCount, 'New accounts signed'],
    ['Renewed Accounts', renewalCount, 'Existing accounts continuing on renewed plans'],
    ['Telemarketing Pipeline Volume', `${convertedCalls.length + hotCalls.length} Leads`, `Projected value: ₹${callingPipelineValue.toLocaleString()}`],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  wsSummary['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive_Summary');

  // -------------------------------------------------------------------------
  // SHEET 2: CLIENTS & BILLING
  // -------------------------------------------------------------------------
  const wsClients = XLSX.utils.json_to_sheet(clientRows);
  wsClients['!cols'] = [
    { wch: 14 }, // Client ID
    { wch: 28 }, // Business Name
    { wch: 20 }, // Contact Person
    { wch: 16 }, // Phone
    { wch: 24 }, // Package
    { wch: 18 }, // Contract Value
    { wch: 20 }, // Collected
    { wch: 18 }, // Pending
    { wch: 14 }, // Status
    { wch: 18 }, // Stream
    { wch: 14 }, // Duration
    { wch: 14 }, // Start
    { wch: 14 }, // Expiry
    { wch: 14 }, // Plan Status
    { wch: 20 }, // Staff
    { wch: 20 }  // Editor
  ];
  XLSX.utils.book_append_sheet(wb, wsClients, 'Clients_Billing');

  // -------------------------------------------------------------------------
  // SHEET 3: STAFF PERFORMANCE
  // -------------------------------------------------------------------------
  const staffRows = employeeData.map(emp => {
    return {
      'Staff Name': emp.name,
      'Department / Role': emp.department || emp.role || 'Production',
      'Assigned Deliverables': emp.assigned || emp.tasks?.length || (emp.done + emp.pending) || 0,
      'Completed / Posted': emp.done || 0,
      'Pending Tasks': emp.pending || 0,
      'Completion Velocity (%)': emp.completionRate !== undefined ? `${emp.completionRate}%` : `${emp.assigned > 0 ? Math.round((emp.done / emp.assigned) * 100) : 0}%`,
      'Performance Status': (emp.completionRate || 0) >= 70 ? 'Excellent' : (emp.completionRate || 0) >= 40 ? 'On Track' : 'Needs Followup'
    };
  });

  const wsStaff = XLSX.utils.json_to_sheet(staffRows);
  wsStaff['!cols'] = [
    { wch: 24 },
    { wch: 20 },
    { wch: 22 },
    { wch: 18 },
    { wch: 16 },
    { wch: 22 },
    { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, wsStaff, 'Staff_Performance');

  // -------------------------------------------------------------------------
  // SHEET 4: DELIVERABLES & TASKS
  // -------------------------------------------------------------------------
  const taskDeliverableRows = [
    ...periodTasks.map(t => ({
      'Type': 'Client Task',
      'Task ID / Ref': t.id || '',
      'Client': t.client || t.clientName || 'General',
      'Deliverable Title': t.title || t.task || 'Untitled Task',
      'Assigned Staff': t.assignTo || 'Unassigned',
      'Scheduled Date': t.date ? t.date.split('T')[0] : '',
      'Status': isDoneStatus(t.status) ? 'Completed' : (t.status || 'Pending'),
      'Raw Status': t.status || 'Pending'
    })),
    ...periodDeliveries.map(d => ({
      'Type': 'Content Delivery',
      'Task ID / Ref': d.id || '',
      'Client': d.clientName || d.client || 'General',
      'Deliverable Title': d.title || d.topic || 'Content Deliverable',
      'Assigned Staff': d.assignTo || d.employee || 'Unassigned',
      'Scheduled Date': d.postDate ? d.postDate.split('T')[0] : '',
      'Status': isDoneStatus(d.status) ? 'Posted' : (d.status || 'Pending'),
      'Raw Status': d.status || 'Pending'
    }))
  ];

  const wsTasks = XLSX.utils.json_to_sheet(taskDeliverableRows);
  wsTasks['!cols'] = [
    { wch: 16 },
    { wch: 14 },
    { wch: 24 },
    { wch: 35 },
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, wsTasks, 'Tasks_Deliverables_Log');

  // -------------------------------------------------------------------------
  // TRIGGER DOWNLOAD
  // -------------------------------------------------------------------------
  const cleanLabel = (periodLabel || monthKey).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `AiDigitals_Monthly_Report_${cleanLabel}.xlsx`;
  XLSX.writeFile(wb, filename);
}
