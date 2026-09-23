import { prisma } from '../src/lib/db.js';

async function run() {
  const hotLeads = await prisma.callRecord.findMany({ where: { status: 'HOT' } });
  console.log('Total HOT leads:', hotLeads.length);
  hotLeads.forEach(l => {
    console.log({ id: l.id, name: l.clientName, date: l.expectedClosingDate, value: l.expectedValue });
  });
  process.exit(0);
}
run();
