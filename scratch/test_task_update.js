const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('--- TEST CASE: Updating Task Status ---');
  
  // Find a random client task
  const clientTask = await prisma.clientTask.findFirst();
  
  if (!clientTask) {
    console.log('No client tasks found in the database to test.');
  } else {
    console.log(`Found ClientTask: "${clientTask.taskTitle}" for client "${clientTask.businessName}"`);
    console.log(`Old Status: ${clientTask.status}`);
    
    // Update the status
    const updatedClientTask = await prisma.clientTask.update({
      where: { id: clientTask.id },
      data: { status: 'TEST_STATUS_UPDATED' }
    });
    
    console.log(`New Status: ${updatedClientTask.status}`);
    console.log(`\nSUCCESS: The status in the database has been changed to 'TEST_STATUS_UPDATED'.`);
    console.log(`Go to your Admin/CEO Dashboard or Pipeline now, refresh the page, and look for "${clientTask.taskTitle}"!`);
    
    // Put it back to old status after 30 seconds so we don't ruin their data
    console.log(`\n(I will automatically revert this back to '${clientTask.status}' in 30 seconds...)`);
    
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    await prisma.clientTask.update({
      where: { id: clientTask.id },
      data: { status: clientTask.status }
    });
    console.log(`Reverted status back to '${clientTask.status}'`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
