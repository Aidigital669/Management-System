import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

async function getRequester(cookieStore) {
  const userIdStr = cookieStore.get('userId')?.value;
  if (!userIdStr) return null;
  return await prisma.user.findUnique({ where: { id: parseInt(userIdStr) } });
}

export const dynamic = 'force-dynamic';

// Universal helper to find fields across any Excel/CSV spreadsheet format
function extractField(row, candidates) {
  if (!row || typeof row !== 'object') return '';

  // 1. Direct match
  for (const cand of candidates) {
    if (row[cand] !== undefined && row[cand] !== null && String(row[cand]).trim() !== '') {
      return String(row[cand]).trim();
    }
  }

  // 2. Normalized match (strip spaces, underscores, hyphens, colons, case-insensitive)
  const normalizedMap = new Map();
  for (const [k, v] of Object.entries(row)) {
    const cleanK = k.toLowerCase().replace(/[\s_\-\.\:\(\)\[\]]/g, '');
    if (!normalizedMap.has(cleanK) && v !== undefined && v !== null && String(v).trim() !== '') {
      normalizedMap.set(cleanK, String(v).trim());
    }
  }

  for (const cand of candidates) {
    const cleanCand = cand.toLowerCase().replace(/[\s_\-\.\:\(\)\[\]]/g, '');
    if (normalizedMap.has(cleanCand)) {
      return normalizedMap.get(cleanCand);
    }
  }

  // 3. Substring match (e.g. key contains "phone" or "name")
  for (const [k, v] of Object.entries(row)) {
    const cleanK = k.toLowerCase().replace(/[\s_\-\.\:\(\)\[\]]/g, '');
    for (const cand of candidates) {
      const cleanCand = cand.toLowerCase().replace(/[\s_\-\.\:\(\)\[\]]/g, '');
      if (cleanCand.length >= 4 && cleanK.includes(cleanCand) && v !== undefined && v !== null && String(v).trim() !== '') {
        return String(v).trim();
      }
    }
  }

  return '';
}

// Robust phone extractor: matches headers or scans row for 10-15 digit phone sequence
function extractPhone(row) {
  const phoneKeys = [
    'phoneNumber', 'phone_number', 'phone number', 'phone', 'mobile', 'mobile_number', 'mobilenumber',
    'contact', 'contact_number', 'contactnumber', 'contact no', 'contact no.', 'mobile no', 'mobile no.',
    'ph no', 'phone no', 'cell', 'cellphone', 'telephone', 'tel', 'whatsapp', 'whatsapp number',
    'calling number', 'caller id', 'caller mobile', 'caller_mobile', 'phone1', 'mobile1', 'number',
    '__EMPTY_1'
  ];

  let val = extractField(row, phoneKeys);
  if (val) {
    val = val.replace(/^['"`]/, '').trim();
    val = val.replace(/^p:\+?/i, '').replace(/^ph:\+?/i, '').replace(/^tel:\+?/i, '').trim();
    if (!val.startsWith('+') && val.length === 10) val = `+91${val}`;
    return val;
  }

  // Fallback: Scan row values for any valid phone number (10 to 15 digits)
  for (const [k, v] of Object.entries(row)) {
    if (!v) continue;
    let str = String(v).trim();
    if (str.includes('-') && str.length <= 10 && str.split('-').length === 3) continue;
    const cleanDigits = str.replace(/[^0-9]/g, '');
    if (cleanDigits.length >= 10 && cleanDigits.length <= 15) {
      str = str.replace(/^p:\+?/i, '').replace(/^ph:\+?/i, '').replace(/^tel:\+?/i, '').trim();
      return str.startsWith('+') ? str : (cleanDigits.length === 10 ? `+91${cleanDigits}` : `+${cleanDigits}`);
    }
  }

  return '';
}

// Robust status parser: translates any Excel status phrase into CRM status
function parseLeadStatus(rawVal) {
  if (!rawVal) return 'PENDING';
  const s = String(rawVal).trim().toLowerCase();

  // Exact uppercase match check first
  const upper = s.toUpperCase().replace(/[\s\-]+/g, '_');
  const valid = ['PENDING', 'RINGING', 'CALLBACK', 'INTERESTED', 'ANSWERED', 'NOT_INTERESTED', 'NOT_ANSWERED'];
  if (valid.includes(upper)) return upper;

  // Not Interested / Lost / Rejected / Junk / Cold / Dead / Invalid
  if (
    s.includes('not interest') || s.includes('not-interest') || s.includes('uninterest') ||
    s.includes('reject') || s.includes('junk') || s.includes('fake') || s.includes('wrong') ||
    s.includes('invalid') || s.includes('lost') || s.includes('drop') || s.includes('dnd') ||
    s.includes('spam') || s.includes('cold') || s.includes('dead') || s.includes('no need') ||
    s.includes('not need') || s.includes('disinterest')
  ) {
    return 'NOT_INTERESTED';
  }

  // Hot / Interested / High priority / Warm / Prospect / Quotation
  if (
    s.includes('hot') || s.includes('interest') || s.includes('warm') || s.includes('positive') ||
    s.includes('prospect') || s.includes('agree') || s.includes('deal') || s.includes('quote') ||
    s.includes('quotation') || s.includes('proposal') || s.includes('negotiat') || s.includes('high')
  ) {
    return 'INTERESTED';
  }

  // Won / Closed / Answered / Deal Done / Sale / Converted / Paid
  if (
    s.includes('won') || s.includes('close') || s.includes('convert') || s.includes('sale') ||
    s.includes('paid') || s.includes('success') || s.includes('answer') || s.includes('done') ||
    s.includes('win') || s.includes('booking')
  ) {
    return 'ANSWERED';
  }

  // Callback / Follow Up / Call Later / Postpone / Reschedule
  if (
    s.includes('call') || s.includes('follow') || s.includes('later') || s.includes('reminder') ||
    s.includes('schedule') || s.includes('cb') || s.includes('postpone') || s.includes('re-call') ||
    s.includes('hold')
  ) {
    return 'CALLBACK';
  }

  // Ringing / RNR / Not Picked / Busy / Unreachable / Switched off
  if (
    s.includes('ring') || s.includes('rnr') || s.includes('busy') || s.includes('not pick') ||
    s.includes('no pick') || s.includes('not reach') || s.includes('switch') || s.includes('na') ||
    s.includes('nr') || s.includes('unreachable') || s.includes('missed') || s.includes('no answer')
  ) {
    return 'RINGING';
  }

  // Pending / New / Fresh / Raw / Open / Assigned
  if (
    s.includes('pending') || s.includes('new') || s.includes('fresh') || s.includes('open') ||
    s.includes('raw') || s.includes('progress') || s.includes('todo') || s.includes('unassigned') ||
    s.includes('assigned')
  ) {
    return 'PENDING';
  }

  return 'PENDING';
}

const PACKAGE_PRICES = {
  'Meta Ads - Basic': 2499,
  'Meta Ads - Standard (Monthly)': 3999,
  'Meta Ads - Premium (3-Month)': 6899,
  'Meta Ads - Platinum': 12599,
  'Google Ads - Basic Plan': 4999,
  'Google Ads - Standard Plan': 13499,
  'Google Ads - Premium Plan': 23999,
  'Combo - Basic': 6999,
  'Combo - Standard': 19499,
  'Combo - Premium': 35999,
  'Website - Static': 7499,
  'Website - Dynamic': 14999,
  'Creative Pack - Starter': 599,
  'Creative Pack - Growth': 1099,
  'Creative Pack - Value': 1499,
  'Creative Pack - Standard': 1899,
  'Creative Pack - Pro': 2699,
  'AI Video - Starter Plan': 4500,
  'AI Video - Growth Plan': 5950,
  'AI Video - Pro Plan': 8000,
  'Basic': 2499,
  'Standard': 3999,
  'Premium': 6899,
  'Platinum': 12599,
  'Standard Plan': 13499
};

// Explicit contact person name extractor
function extractPersonName(row) {
  const personKeys = [
    'personName', 'person_name', 'person name', 'contactPerson', 'contact_person', 'contactperson', 'contact person',
    'clientName', 'client_name', 'client name', 'name', 'full_name', 'fullname', 'full name',
    'customer_name', 'customername', 'customer name', 'lead_name', 'leadname', 'lead name',
    'caller_name', 'caller name', 'first_name', 'firstname', 'user_name', 'username',
    'client', 'customer', 'party', 'party_name', 'party name', 'prospect', 'buyer', 'lead',
    'contact', 'person', 'name of person', 'name of the person', 'name of customer', 'name of party', 'particulars',
    '__EMPTY'
  ];
  return extractField(row, personKeys);
}

// Explicit company / business name extractor
function extractCompanyName(row) {
  const companyKeys = [
    'companyName', 'company_name', 'company name', 'businessName', 'business_name', 'business name',
    'company', 'business', 'firm_name', 'firm', 'brand_name', 'brand', 'shop_name', 'shop',
    'organization_name', 'organization', 'agency', 'enterprise', 'account_name', 'account'
  ];
  return extractField(row, companyKeys);
}

// Clean number / currency string (handles ₹, Rs, commas, /- etc)
function parseCurrency(rawVal) {
  if (!rawVal) return null;
  const str = String(rawVal).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(str);
  return (!isNaN(parsed) && parsed > 0) ? parsed : null;
}

// Robust date parser supporting DD/MM/YYYY, DD-MM-YYYY, ISO, etc.
function parseFlexibleDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  const dmyMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const requester = await getRequester(cookieStore);

    if (!requester || (requester.role !== 'CEO' && requester.role !== 'ADMIN' && requester.role !== 'SALES')) {
      return NextResponse.json({ error: 'Unauthorized: Admin or CEO access required' }, { status: 403 });
    }

    const body = await request.json();
    const { type, rows, assignedSalespersonId, wipeBeforeImport, defaultPackage } = body;

    if (!type || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Invalid payload. "type" and non-empty "rows" array required.' }, { status: 400 });
    }

    const results = {
      total: rows.length,
      successCount: 0,
      failedCount: 0,
      errors: []
    };

    const todayStr = new Date().toISOString().split('T')[0];

    // -------------------------------------------------------------
    // 1. CLIENTS IMPORT
    // -------------------------------------------------------------
    if (type === 'clients') {
      const existingClients = await prisma.client.findMany({ select: { clientId: true } });
      const existingIds = new Set(existingClients.map(c => c.clientId.toUpperCase()));

      let autoIdCounter = 1001;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;

        // Skip completely blank rows
        const hasData = Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '');
        if (!hasData) continue;

        try {
          const contact = extractPhone(row);
          const businessName = extractField(row, [
            'businessName', 'business_name', 'business name', 'company_name', 'company', 'brand',
            'firm', 'clientName', 'client_name', 'name', 'client'
          ]) || (contact ? `Client (${contact.slice(-10)})` : '');

          if (!businessName) {
            results.failedCount++;
            results.errors.push({ row: rowNum, reason: 'Business Name or Contact is required' });
            continue;
          }

          let clientId = extractField(row, ['clientId', 'client_id', 'client id', 'id']).toUpperCase();
          if (!clientId) {
            while (existingIds.has(`CL-${autoIdCounter}`)) {
              autoIdCounter++;
            }
            clientId = `CL-${autoIdCounter}`;
            existingIds.add(clientId);
            autoIdCounter++;
          } else {
            if (existingIds.has(clientId)) {
              results.failedCount++;
              results.errors.push({ row: rowNum, identifier: clientId, reason: `Client ID "${clientId}" already exists` });
              continue;
            }
            existingIds.add(clientId);
          }

          const clientName = extractField(row, ['clientName', 'client_name', 'client name', 'contact_person', 'contactperson', 'name']) || businessName;
          const joiningDate = extractField(row, ['joiningDate', 'joining_date', 'joining date', 'date', 'created_at']) || todayStr;
          const services = extractField(row, ['services', 'service', 'plan', 'package', 'requirement']) || 'Meta Ads';
          const packageName = extractField(row, ['packageName', 'package_name', 'package name', 'plan_name']) || 'Standard Plan';
          const packageAmount = parseFloat(extractField(row, ['packageAmount', 'package_amount', 'amount', 'price', 'fee', 'cost'])) || 0;
          const email = extractField(row, ['email', 'mail', 'email_address', 'e-mail']);
          const website = extractField(row, ['website', 'url', 'domain', 'web']);
          const sector = extractField(row, ['sector', 'industry', 'category', 'domain']);
          const requirement = extractField(row, ['requirement', 'details', 'scope', 'query']);
          const notes = extractField(row, ['notes', 'note', 'remark', 'remarks', 'comment']);

          const client = await prisma.client.create({
            data: {
              clientId,
              businessName,
              clientName,
              joiningDate,
              services,
              packageName,
              packageAmount,
              contact,
              email,
              website,
              sector,
              requirement,
              accountReady: true,
              active: true,
              notes
            }
          });

          // Provision client user credentials
          try {
            let clientEmail = email;
            if (!clientEmail || !clientEmail.includes('@')) {
              const cleanName = businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
              clientEmail = `${cleanName || 'client' + clientId.toLowerCase()}@gmail.com`;
            }

            const numericPart = clientId.replace(/[^0-9]/g, '');
            const plainPassword = `Client@${numericPart || '123'}`;
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(plainPassword, salt);

            const userExists = await prisma.user.findUnique({ where: { email: clientEmail.toLowerCase() } });
            if (!userExists) {
              await prisma.user.create({
                data: {
                  email: clientEmail.toLowerCase(),
                  name: businessName,
                  password: hashedPassword,
                  role: 'CLIENT',
                  department: clientId,
                  status: 'ACTIVE',
                  avatar: '💼'
                }
              });
            }

            await prisma.client.update({
              where: { id: client.id },
              data: {
                email: clientEmail.toLowerCase(),
                password: plainPassword
              }
            });
          } catch (userErr) {
            console.warn('Client provisioning notice:', userErr.message);
          }

          results.successCount++;
        } catch (err) {
          results.failedCount++;
          results.errors.push({ row: rowNum, reason: err.message || 'Error inserting client' });
        }
      }
    }

    // -------------------------------------------------------------
    // 2. EMPLOYEES / DIRECTORY IMPORT
    // -------------------------------------------------------------
    else if (type === 'employees') {
      const existingUsers = await prisma.user.findMany({ select: { email: true } });
      const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;

        const hasData = Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '');
        if (!hasData) continue;

        try {
          const name = extractField(row, ['name', 'full_name', 'fullname', 'employee_name', 'staff_name', 'staff', 'employee']);
          let email = extractField(row, ['email', 'mail', 'email_address', 'e-mail']).toLowerCase();

          if (!name) {
            results.failedCount++;
            results.errors.push({ row: rowNum, reason: 'Staff Name is required' });
            continue;
          }

          if (!email || !email.includes('@')) {
            // Auto generate staff email if missing
            const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            email = `${clean || 'staff' + rowNum}@aidigital.com`;
          }

          if (existingEmails.has(email)) {
            results.failedCount++;
            results.errors.push({ row: rowNum, identifier: email, reason: `Email "${email}" is already registered` });
            continue;
          }

          existingEmails.add(email);

          const plainPassword = extractField(row, ['password', 'pass']) || 'Staff@123';
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(plainPassword, salt);

          const department = extractField(row, ['department', 'dept', 'team', 'domain']) || 'Social Media Marketing';
          const role = extractField(row, ['role', 'user_role']).toUpperCase() || 'EMPLOYEE';
          const designation = extractField(row, ['designation', 'position', 'title']) || 'Executive';
          const salary = parseFloat(extractField(row, ['salary', 'pay', 'ctc', 'stipend'])) || 0;
          const mobile = extractPhone(row);
          const dateOfJoining = extractField(row, ['dateOfJoining', 'joiningDate', 'joining_date', 'date_of_joining']) || todayStr;
          const address = extractField(row, ['address', 'city', 'location']);

          await prisma.user.create({
            data: {
              name,
              email,
              password: hashedPassword,
              department,
              role,
              designation,
              salary,
              mobile,
              dateOfJoining,
              address,
              status: 'ACTIVE',
              avatar: '👤'
            }
          });

          results.successCount++;
        } catch (err) {
          results.failedCount++;
          results.errors.push({ row: rowNum, reason: err.message || 'Error inserting employee' });
        }
      }
    }

    // -------------------------------------------------------------
    // 3. TASKS IMPORT
    // -------------------------------------------------------------
    else if (type === 'tasks') {
      const allUsers = await prisma.user.findMany({
        select: { id: true, name: true, email: true }
      });

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;

        const hasData = Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '');
        if (!hasData) continue;

        try {
          const title = extractField(row, ['title', 'taskTitle', 'task_title', 'task', 'subject', 'name']);
          if (!title) {
            results.failedCount++;
            results.errors.push({ row: rowNum, reason: 'Task Title is required' });
            continue;
          }

          const assigneeStr = extractField(row, ['assignedTo', 'assignee', 'assigned_to', 'staff', 'employee', 'user', 'email']).toLowerCase();
          
          let assignedUser = null;
          if (assigneeStr) {
            assignedUser = allUsers.find(u => 
              u.email.toLowerCase() === assigneeStr || 
              u.name.toLowerCase() === assigneeStr ||
              u.name.toLowerCase().includes(assigneeStr)
            );
          }

          const assignedToId = assignedUser ? assignedUser.id : requester.id;
          const description = extractField(row, ['description', 'desc', 'details', 'notes']);
          const dueDate = extractField(row, ['dueDate', 'due_date', 'due date', 'deadline']) || todayStr;
          const rawPriority = extractField(row, ['priority', 'urgency']);
          const rawStatus = extractField(row, ['status', 'state']).toUpperCase();

          await prisma.task.create({
            data: {
              title,
              description: description || null,
              assignedToId,
              createdById: requester.id,
              dueDate: dueDate || null,
              priority: ['Low', 'Normal', 'High', 'Urgent'].includes(rawPriority) ? rawPriority : 'Normal',
              status: ['TODO', 'IN_PROGRESS', 'COMPLETED'].includes(rawStatus) ? rawStatus : 'TODO'
            }
          });

          results.successCount++;
        } catch (err) {
          results.failedCount++;
          results.errors.push({ row: rowNum, reason: err.message || 'Error inserting task' });
        }
      }
    }

    // -------------------------------------------------------------
    // 4. LEADS / CALL RECORDS IMPORT (CRM)
    // -------------------------------------------------------------
    else if (type === 'leads') {
      if (wipeBeforeImport) {
        await prisma.callRecord.deleteMany({});
      }

      const salesUsers = await prisma.user.findMany({
        where: { role: 'SALES', status: 'ACTIVE' },
        select: { id: true, name: true, email: true, role: true }
      });

      const fallbackUsers = salesUsers.length > 0 ? salesUsers : await prisma.user.findMany({
        where: { role: { in: ['SALES', 'ADMIN', 'CEO'] } },
        select: { id: true, name: true, email: true, role: true }
      });

      const activeSalesList = fallbackUsers.length > 0 ? fallbackUsers : [requester];

      let roundRobinIndex = 0;
      let targetSalesUser = null;

      if (assignedSalespersonId && assignedSalespersonId !== 'ROUND_ROBIN' && assignedSalespersonId !== 'EXCEL_COLUMN') {
        const parsedId = parseInt(assignedSalespersonId, 10);
        const found = activeSalesList.find(u => u.id === parsedId) || await prisma.user.findUnique({ where: { id: parsedId } });
        if (found) targetSalesUser = found;
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;

        // Skip blank rows
        const hasData = Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '');
        if (!hasData) continue;

        try {
          let phoneNumber = extractPhone(row);
          const companyName = row.companyName || extractCompanyName(row);
          const personName = row.personName || extractPersonName(row);

          let clientName = '';
          if (companyName && personName && companyName.toLowerCase() !== personName.toLowerCase()) {
            clientName = `${companyName} (${personName})`;
          } else if (companyName) {
            clientName = companyName;
          } else if (personName) {
            clientName = personName;
          } else if (row.clientName) {
            clientName = String(row.clientName).trim();
          }

          // Smart text scanner: if name still blank, pick first valid non-phone/non-date text field
          if (!clientName) {
            for (const [k, v] of Object.entries(row)) {
              if (!v || typeof v === 'object') continue;
              const val = String(v).trim();
              if (val.length >= 2 && val.length <= 40 && !/^\+?[0-9\s\-()]{7,}$/.test(val) && !val.includes('@') && !val.startsWith('http')) {
                const cleanK = k.toLowerCase().replace(/[\s_\-\.\:\(\)\[\]]/g, '');
                if (!['status', 'date', 'phone', 'mobile', 'contact', 'package', 'plan', 'notes', 'remark', 'source', 'leadsource'].some(t => cleanK.includes(t))) {
                  clientName = val;
                  break;
                }
              }
            }
          }

          // Guarantee 100% of rows are uploaded! Never skip rows with data
          if (!phoneNumber && !clientName) {
            const anyText = Object.values(row).find(v => v && String(v).trim() !== '');
            clientName = anyText ? String(anyText).trim().slice(0, 50) : `Lead #${rowNum}`;
            phoneNumber = 'N/A';
          } else if (!phoneNumber) {
            phoneNumber = 'N/A';
          } else if (!clientName) {
            const digits = phoneNumber.replace(/[^0-9]/g, '');
            clientName = `Lead (${digits.slice(-10) || phoneNumber})`;
          }

          const finalPhone = phoneNumber;
          const finalName = clientName;

          let assignedUser = targetSalesUser;

          if (!assignedUser) {
            if (assignedSalespersonId === 'EXCEL_COLUMN') {
              const salespersonStr = extractField(row, [
                'salesperson', 'salesPerson', 'sales_person', 'sales person', 'sales_rep', 'sales rep',
                'assignee', 'assigned_to', 'assigned to', 'agent', 'owner'
              ]).toLowerCase();

              if (salespersonStr) {
                assignedUser = activeSalesList.find(u => 
                  u.email.toLowerCase() === salespersonStr || 
                  u.name.toLowerCase().includes(salespersonStr)
                );
              }
            }

            // Fallback or ROUND_ROBIN mode
            if (!assignedUser) {
              assignedUser = activeSalesList[roundRobinIndex % activeSalesList.length];
              roundRobinIndex++;
            }
          }

          const leadSource = extractField(row, [
            'leadSource', 'lead_source', 'lead source', 'source', 'campaign', 'campaign_name',
            'campaignname', 'platform', 'channel', 'medium', 'category'
          ]) || 'Excel Import';

          // Extract Package (from row or defaultPackage selected in modal)
          const pkgFromRow = row.packageName || extractField(row, [
            'packageName', 'package_name', 'package name', 'package', 'plan', 'plan_name', 'plan name',
            'service', 'services', 'product', 'requirement'
          ]);
          const finalPackage = pkgFromRow || defaultPackage || '';

          // Extract Status and Status Lead from explicit mapped fields or file headers
          const colStatusLead = row.statusLead || extractField(row, [
            'statusLead', 'status_lead', 'status lead', 'statuslead', 'lead_sub_status', 'sub_status', 'substatus', 'sub status',
            'leadstatus', 'lead_status', 'lead status'
          ]);

          const colGeneralStatus = row.status || extractField(row, [
            'status', 'general_status', 'leadStatus', 'lead_status', 'lead status', 'leadstatus',
            'stage', 'lead stage', 'lead_stage', 'pipeline status', 'state', 'call_status', 'call status',
            'disposition'
          ]);

          // Determine primary status string for CRM status mapping
          const primaryStatusStr = colStatusLead || colGeneralStatus || '';
          const status = parseLeadStatus(primaryStatusStr);

          let notes = extractField(row, ['notes', 'note', 'remark', 'remarks', 'comment', 'comments', 'requirement', 'description', 'enquiry', 'query']);
          let expectedValue = parseCurrency(extractField(row, ['expectedValue', 'expected_value', 'value', 'amount', 'budget', 'price', 'deal_value', 'deal value', 'cost', 'fee']));

          // Auto-fill expectedValue from package price if not already specified in sheet
          if ((!expectedValue || expectedValue === 0) && finalPackage) {
            const matchedKey = Object.keys(PACKAGE_PRICES).find(k => 
              k.toLowerCase() === finalPackage.toLowerCase() || 
              finalPackage.toLowerCase().includes(k.toLowerCase()) || 
              k.toLowerCase().includes(finalPackage.toLowerCase())
            );
            if (matchedKey && PACKAGE_PRICES[matchedKey]) {
              expectedValue = PACKAGE_PRICES[matchedKey];
            }
          }

          // Extract specific rich fields from spreadsheet
          const customerRequirement = extractField(row, [
            'customerRequirement', 'customer_requirement', 'customer requirement', 'requirement',
            'service', 'service_name', 'scope', 'product', 'course'
          ]);

          const scheduleDateTime = extractField(row, [
            'schechuledatetime', 'schechule date & time', 'schechule date and time', 'schedule date & time',
            'schedule date and time', 'schechule', 'schedule', 'timing', 'next call', 'callback',
            'call date', 'date & time', 'appointment'
          ]);

          const unlabelledRemarks = row['__EMPTY_2'] ? String(row['__EMPTY_2']).trim() : '';

          // Parse optional follow up date from spreadsheet
          const followUpRaw = extractField(row, ['followUpDate', 'follow_up_date', 'followup date', 'follow up', 'next call', 'reminder date', 'callback date']) || scheduleDateTime;
          const followUpDate = parseFlexibleDate(followUpRaw);

          // Compile all rich context into notes
          const extraDetails = [];
          if (customerRequirement) {
            extraDetails.push(`Requirement: ${customerRequirement}`);
          }
          if (scheduleDateTime) {
            extraDetails.push(`Schedule: ${scheduleDateTime}`);
          }
          if (unlabelledRemarks && unlabelledRemarks.toLowerCase() !== 'empty') {
            extraDetails.push(`Remarks: ${unlabelledRemarks}`);
          }
          if (companyName) {
            extraDetails.push(`Company: ${companyName}`);
          }
          if (personName && (!companyName || personName.toLowerCase() !== companyName.toLowerCase())) {
            extraDetails.push(`Contact Person: ${personName}`);
          }
          if (finalPackage && finalPackage !== customerRequirement) {
            extraDetails.push(`Package: ${finalPackage}`);
          }
          if (colStatusLead) {
            extraDetails.push(`Status Lead: ${colStatusLead}`);
          }
          if (colGeneralStatus && colGeneralStatus.toLowerCase() !== colStatusLead?.toLowerCase()) {
            extraDetails.push(`Status: ${colGeneralStatus}`);
          }

          for (const [k, v] of Object.entries(row)) {
            if (!v || typeof v === 'object') continue;
            const valStr = String(v).trim();
            if (!valStr || valStr.toLowerCase() === 'empty') continue;

            const cleanK = k.toLowerCase().replace(/[\s_\-\.\:\(\)\[\]]/g, '');
            // Skip keys that are already stored in dedicated columns or __EMPTY placeholders
            if (['clientname', 'name', 'person', 'personname', 'company', 'companyname', 'phone', 'phonenumber', 'mobile', 'status', 'statuslead', 'leadstatus', 'leadsource', 'source', 'notes', 'salesperson', 'expectedvalue', 'followupdate', 'package', 'packagename', 'plan', 'customerrequirement', 'requirement', 'schechuledatetime', 'schechule', 'schedule', 'empty', 'empty1', 'empty2'].some(t => cleanK.includes(t))) {
              continue;
            }

            extraDetails.push(`${k}: ${valStr}`);
          }

          if (extraDetails.length > 0) {
            notes = extraDetails.join(' | ');
          }

          await prisma.callRecord.create({
            data: {
              clientName: finalName,
              phoneNumber: finalPhone,
              salesPersonId: assignedUser.id,
              leadSource,
              status,
              notes: notes || `Imported via Excel spreadsheet on ${todayStr}`,
              expectedValue,
              followUpDate
            }
          });

          results.successCount++;
        } catch (err) {
          results.failedCount++;
          results.errors.push({ row: rowNum, reason: err.message || 'Error inserting lead' });
        }
      }
    } else {
      return NextResponse.json({ error: `Unsupported import type "${type}"` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${results.successCount} of ${results.total} records.`,
      ...results
    });

  } catch (error) {
    console.error('Bulk Import API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
