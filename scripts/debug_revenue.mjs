import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
if (!process.env.DATABASE_URL) dotenv.config({ path: '.env' });
import pg from 'pg';
const { Pool } = pg;
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

import {
  getClientPlanInfo,
  isClientPlanActive,
  isClientContractInMonth,
  getClientRevenueStream,
  isClientActiveInMonth
} from '../src/lib/planUtils.js';

async function run() {
  const clients = await prisma.client.findMany({ orderBy: { clientId: 'asc' } });
  console.log('Total clients:', clients.length);

  const activeInPlan = clients.filter(c => isClientPlanActive(c));
  console.log('Active in plan count (isClientPlanActive):', activeInPlan.length);

  const inSept = clients.filter(c => isClientContractInMonth(c, '2026-09'));
  console.log('Contract in Sept 2026 count (isClientContractInMonth):', inSept.length);

  let activePlanTotalPkg = 0;
  let activePlanActual = 0;
  activeInPlan.forEach(c => {
    const pkg = c.packageAmount || 0;
    activePlanTotalPkg += pkg;
    let paid = pkg;
    try {
      if (c.notes && c.notes.trim().startsWith('{')) {
        const parsed = JSON.parse(c.notes);
        if (parsed.paymentStatus === 'Pending' || parsed.paymentStatus === 'Unpaid') paid = 0;
        else if (parsed.paidAmount !== undefined) paid = parseFloat(parsed.paidAmount) || 0;
      }
    } catch (e) {}
    activePlanActual += paid;
  });
  console.log('Active plan total package amount:', activePlanTotalPkg, 'actual paid:', activePlanActual);

  let septContractActual = 0;
  let septContractPkg = 0;
  let salesActual = 0;
  let renewalsActual = 0;
  let retainersActual = 0;

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
    if (stream.type === 'NewPurchase') salesActual += paid;
    else if (stream.type === 'Renewal') renewalsActual += paid;
    else retainersActual += paid;
    console.log(`[Sept] ${c.clientId} - ${c.businessName} | pkg: ${pkg} | paid: ${paid} | stream: ${stream.type} | active: ${c.active} | planActive: ${isClientPlanActive(c)}`);
  });
  console.log('\n--- SEPT CONTRACT SUMMARY ---');
  console.log('Total pkg:', septContractPkg, 'Actual collected:', septContractActual);
  console.log('Sales Actual:', salesActual, 'Renewals Actual:', renewalsActual, 'Retainers:', retainersActual);
}

run().catch(console.error).finally(() => { prisma.$disconnect(); pool.end(); });
