/**
 * Standard Task and Deliverable status classification utilities across the entire agency system.
 * Handles all status variants used across manual entry, automated approvals, migrations, and API imports:
 * - Completed: 'DONE', 'Done', 'Completed', 'Complete Task', 'Completion', 'Completed (Done)', 'Delivered', 'Posted', 'Approved', 'Sent'
 * - In Progress: 'Working On It', 'In Progress', 'Assigned', 'Client Review', 'Processing', 'TODO' (if assigned)
 * - Not Started: 'Not Started', 'Pending', 'TODO' (unassigned)
 * - Overdue: 'Overdue', 'OVERDUE'
 */

export const isDoneStatus = (status) => {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return (
    s === 'done' ||
    s === 'completed' ||
    s === 'complete task' ||
    s === 'completion' ||
    s === 'completed (done)' ||
    s === 'delivered' ||
    s === 'posted' ||
    s === 'approved' ||
    s === 'sent'
  );
};

export const isInProgressStatus = (status) => {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return (
    s === 'working on it' ||
    s === 'in progress' ||
    s === 'assigned' ||
    s === 'client review' ||
    s === 'processing'
  );
};

export const isNotStartedStatus = (status) => {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return s === 'not started' || s === 'pending' || s === 'todo';
};

export const isOverdueStatus = (status) => {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return s === 'overdue';
};

/**
 * Filter out deliveries that mirror or link to existing client tasks to prevent duplicate counts
 */
export const getDistinctDeliveries = (deliveries = [], tasks = []) => {
  if (!deliveries || deliveries.length === 0) return [];
  if (!tasks || tasks.length === 0) return deliveries;

  const taskKeySet = new Set();
  tasks.forEach(t => {
    if (t.taskId) taskKeySet.add(String(t.taskId).toLowerCase().trim());
    if (t.id) taskKeySet.add(String(t.id).toLowerCase().trim());
  });

  return deliveries.filter(d => {
    const linked = d.linkedTaskId ? String(d.linkedTaskId).toLowerCase().trim() : null;
    const delivId = d.deliveryId ? String(d.deliveryId).toLowerCase().trim() : null;
    const rawId = d.id ? String(d.id).toLowerCase().trim() : null;

    if (linked && taskKeySet.has(linked)) return false;
    if (delivId && taskKeySet.has(delivId)) return false;
    if (rawId && taskKeySet.has(rawId)) return false;
    return true;
  });
};
