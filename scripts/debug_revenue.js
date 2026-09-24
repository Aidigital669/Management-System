require('dotenv').config({ path: '.env.local' });
if (!process.env.DATABASE_URL) require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const {
  getClientPlanInfo,
  isClientPlanActive,
  isClientContractInMonth,
  getClientRevenueStream,
  isClientActiveInMonth
} = require('./src/lib/planUtils.js');

async function run() {
  const clients = await prisma.client.findMany({ orderBy: { clientId: 'asc' } });
  console.log('Total clients:', clients.length);

  const activeInPlan = clients.filter(c => isClientPlanActive(c));
  console.log('Active in plan count:', activeInPlan.length);

  const inSept = clients.filter(c => isClientContractInMonth(c, '2026-09'));
  console.log('Contract in Sept 2026 count:', inSept.length);

  let activePlanTotalPkg = 0;
  activeInPlan.forEach(c => {
    activePlanTotalPkg += (c.packageAmount || 0);
  });
  console.log('Active plan total package amount:', activePlanTotalPkg);

  let septContractActual = 0;
  let septContractPkg = 0;
  inSept.forEach(c => {
    const pkg = c.packageAmount || 0;
    septContractPkg += pkg;
    let paid = pkg;
    try {
      if (c.notes && c.notes.trim().startsWith('{')) {
        const parsed = JSON.parse(c.notes);
        if (parsed.paymentStatus === 'Pending' || parsed.paymentStatus === 'Unpaid') paid = 0;
        else if (parsed.paidAmount !== undefined) paid = parseFloat(parsed.paidAmount) || 0;
      }
    } catch (e) {}
    septContractActual += paid;
    const stream = getClientRevenueStream(c, '2026-09');
    console.log(`[Sept] ${c.clientId} - ${c.businessName} | pkg: ${pkg} | paid: ${paid} | stream: ${stream.type} | active: ${c.active} | planActive: ${isClientPlanActive(c)}`);
  });
  console.log('Sept contract total pkg:', septContractPkg, 'actual collected:', septContractActual);

  console.log('\n--- ACTIVE CLIENTS (isClientPlanActive) ---');
  activeInPlan.forEach(c => {
    const pkg = c.packageAmount || 0;
    let paid = pkg;
    try {
      if (c.notes && c.notes.trim().startsWith('{')) {
        const parsed = JSON.parse(c.notes);
        if (parsed.paymentStatus === 'Pending' || parsed.paymentStatus === 'Unpaid') paid = 0;
        else if (parsed.paidAmount !== undefined) paid = parseFloat(parsed.paidAmount) || 0;
      }
    } catch (e) {}
    const info = getClientPlanInfo(c);
    const stream = getClientRevenueStream(c, '2026-09');
    console.log(`${c.clientId} | ${c.businessName} | pkg: ${pkg} | paid: ${paid} | status: ${info.status} | end: ${info.planEndDate} | stream: ${stream.type}`);
  });
}

run().catch(console.error).finally(() => { prisma.$disconnect(); pool.end(); });
