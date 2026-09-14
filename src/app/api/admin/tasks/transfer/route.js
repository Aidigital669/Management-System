import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

async function getRequester(cookieStore) {
  try {
    const userIdStr = cookieStore.get('userId')?.value || cookieStore.get('user_id')?.value;
    if (userIdStr && !isNaN(parseInt(userIdStr))) {
      const user = await prisma.user.findUnique({ where: { id: parseInt(userIdStr) } });
      if (user) return user;
    }
    const userCookie = cookieStore.get('user')?.value || cookieStore.get('admin_user')?.value;
    if (userCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(userCookie));
        if (parsed.id) {
          const user = await prisma.user.findUnique({ where: { id: parseInt(parsed.id) } });
          if (user) return user;
        }
      } catch (e) {}
    }
  } catch (e) {}
  return null;
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const requester = await getRequester(cookieStore);

    if (!requester || (requester.role !== 'CEO' && requester.role !== 'ADMIN' && requester.role !== 'TL')) {
      return NextResponse.json({ error: 'Unauthorized: Admin, CEO, or TL access required' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      taskType, 
      taskId, 
      rawId, 
      tasks, 
      fromUserName, 
      targetUserId, 
      targetUserName 
    } = body;

    // Validate target employee
    let targetUser = null;
    if (targetUserId) {
      targetUser = await prisma.user.findUnique({ where: { id: parseInt(targetUserId) } });
    } else if (targetUserName) {
      targetUser = await prisma.user.findFirst({
        where: { name: { equals: targetUserName.trim(), mode: 'insensitive' } }
      });
    }

    if (!targetUser && !targetUserName) {
      return NextResponse.json({ error: 'Please choose an employee to transfer the task(s) to.' }, { status: 400 });
    }

    const newAssigneeName = targetUser ? targetUser.name : targetUserName.trim();
    const newAssigneeId = targetUser ? targetUser.id : null;

    let transferredCount = 0;
    const transferredTitles = [];

    // Case 1: Bulk Transfer by list of tasks
    if (Array.isArray(tasks) && tasks.length > 0) {
      for (const item of tasks) {
        const result = await transferSingleTask(item, newAssigneeName, newAssigneeId);
        if (result.success) {
          transferredCount++;
          if (result.title) transferredTitles.push(result.title);
        }
      }
    } 
    // Case 2: Transfer all tasks of an employee (fromUserName)
    else if (fromUserName && (!taskId && !rawId)) {
      // 1. Client Tasks
      const ctUpdate = await prisma.clientTask.updateMany({
        where: { workingOn: { equals: fromUserName.trim(), mode: 'insensitive' } },
        data: { workingOn: newAssigneeName }
      });
      transferredCount += ctUpdate.count;

      // 2. Client Deliveries
      const cdUpdate = await prisma.clientDelivery.updateMany({
        where: { workingOn: { equals: fromUserName.trim(), mode: 'insensitive' } },
        data: { workingOn: newAssigneeName }
      });
      transferredCount += cdUpdate.count;

      // 3. Internal Tasks if we have target user ID
      if (newAssigneeId) {
        const sourceUser = await prisma.user.findFirst({
          where: { name: { equals: fromUserName.trim(), mode: 'insensitive' } }
        });
        if (sourceUser) {
          const itUpdate = await prisma.task.updateMany({
            where: { assignedToId: sourceUser.id },
            data: { assignedToId: newAssigneeId }
          });
          transferredCount += itUpdate.count;
        }
      }
    }
    // Case 3: Transfer single task
    else if (taskId || rawId) {
      const result = await transferSingleTask({ taskId, rawId, taskType }, newAssigneeName, newAssigneeId);
      if (result.success) {
        transferredCount = 1;
        if (result.title) transferredTitles.push(result.title);
      } else {
        return NextResponse.json({ error: result.error || 'Failed to transfer task.' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'No task or employee specified for transfer.' }, { status: 400 });
    }

    // Record Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          action: `Transferred ${transferredCount} task(s)${fromUserName ? ` from "${fromUserName}"` : ''} to "${newAssigneeName}" by ${requester.name}`,
          performedByName: requester.name,
          performedByRole: requester.role
        }
      });
    } catch (auditErr) {
      console.warn('Could not create audit log for task transfer:', auditErr);
    }

    return NextResponse.json({
      success: true,
      transferredCount,
      targetEmployee: newAssigneeName,
      message: `Successfully transferred ${transferredCount} task(s) to ${newAssigneeName}.`
    });

  } catch (error) {
    console.error('Task transfer error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

async function transferSingleTask({ taskId, rawId, taskType }, newAssigneeName, newAssigneeId) {
  try {
    const isClientTask = taskType === 'Client Task' || taskType === 'ClientTask' || (taskId && String(taskId).startsWith('CT-')) || (!taskType && !String(taskId).startsWith('INT-'));
    const isDelivery = taskType === 'Delivery' || taskType === 'ClientDelivery' || (taskId && String(taskId).startsWith('DEL-'));
    const isInternal = taskType === 'Internal Task' || taskType === 'Task' || (taskId && String(taskId).startsWith('INT-'));

    if (isDelivery) {
      let delivery = null;
      if (rawId) {
        delivery = await prisma.clientDelivery.findUnique({ where: { id: parseInt(rawId) } });
      }
      if (!delivery && taskId) {
        delivery = await prisma.clientDelivery.findFirst({ where: { deliveryId: String(taskId) } });
      }
      if (delivery) {
        await prisma.clientDelivery.update({
          where: { id: delivery.id },
          data: { workingOn: newAssigneeName }
        });
        return { success: true, title: `${delivery.postType || 'Delivery'} (${delivery.deliveryId})` };
      }
    }

    if (isInternal) {
      let task = null;
      const numId = rawId || (taskId ? parseInt(String(taskId).replace(/\D/g, '')) : null);
      if (numId) {
        task = await prisma.task.findUnique({ where: { id: numId } });
      }
      if (task && newAssigneeId) {
        await prisma.task.update({
          where: { id: task.id },
          data: { assignedToId: newAssigneeId }
        });
        return { success: true, title: task.title };
      }
    }

    // Default to ClientTask
    let clientTask = null;
    if (rawId) {
      clientTask = await prisma.clientTask.findUnique({ where: { id: parseInt(rawId) } });
    }
    if (!clientTask && taskId) {
      clientTask = await prisma.clientTask.findFirst({ where: { taskId: String(taskId) } });
    }

    if (clientTask) {
      await prisma.clientTask.update({
        where: { id: clientTask.id },
        data: { workingOn: newAssigneeName }
      });

      // Sync linked internal Task if any
      if (newAssigneeId) {
        try {
          await prisma.task.updateMany({
            where: { description: { contains: clientTask.taskId } },
            data: { assignedToId: newAssigneeId }
          });
        } catch (e) {}
      }

      // Sync linked ClientDelivery if any
      try {
        await prisma.clientDelivery.updateMany({
          where: { linkedTaskId: clientTask.taskId },
          data: { workingOn: newAssigneeName }
        });
      } catch (e) {}

      return { success: true, title: clientTask.taskTitle };
    }

    return { success: false, error: `Task not found with ID ${taskId || rawId}` };
  } catch (err) {
    console.error('Error transferring single task:', err);
    return { success: false, error: err.message };
  }
}
