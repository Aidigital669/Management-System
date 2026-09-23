import { getClientPlanInfo } from './src/lib/planUtils.js';

const client = {
  joiningDate: '2026-08-11', // Assuming it's parsed to this
  packageName: 'Standard (Monthly)',
  services: '',
  extensionDays: 0,
};

const info = getClientPlanInfo(client, new Date('2026-10-15'));
console.log('joiningDate:', client.joiningDate);
console.log('renewalDueDate:', info.renewalDueDate);
console.log('renewalDueDateStr:', info.renewalDueDateStr);
console.log('cycleStartStr:', info.cycleStartStr);
