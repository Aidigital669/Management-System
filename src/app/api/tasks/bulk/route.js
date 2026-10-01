import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

async function getRequester(cookieStore) {
  const userIdStr = cookieStore.get('userId')?.value;
  if (!userIdStr) return null;
  return await prisma.user.findUnique({ where: { id: parseInt(userIdStr) } });
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const requester = await getRequester(cookieStore);

    if (!requester || (requester.role !== 'CEO' && requester.role !== 'ADMIN' && requester.role !== 'TL')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { tasks } = await request.json();

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ error: 'Tasks array is required' }, { status: 400 });
    }

    let successCount = 0;

    // We do sequential creation to leverage existing logic, 
    // or we could use prisma.task.createMany if supported, but createMany doesn't return created records in sqlite usually.
    for (const taskData of tasks) {
      const { title, description, assignedToId, dueDate, priority, department, subtasks, module, dependency, expectedOutput } = taskData;
      
      if (!title || !assignedToId) continue;
      
      const assignee = await prisma.user.findUnique({ where: { id: parseInt(assignedToId) } });
      if (!assignee) continue;
      
      const resolvedDept = department || assignee.department || 'Software Development';
      const resolvedSubtasks = Array.isArray(subtasks)
        ? JSON.stringify(subtasks)
        : (typeof subtasks === 'string' ? subtasks : '[]');
        
      await prisma.task.create({
        data: {
          title,
          description,
          assignedToId: parseInt(assignedToId),
          createdById: requester.id,
          dueDate,
          status: 'TODO',
          priority: priority || 'Normal',
          department: resolvedDept,
          subtasks: resolvedSubtasks,
          module,
          dependency,
          expectedOutput
        }
      });
      successCount++;
    }

    await prisma.auditLog.create({
      data: {
        action: `Bulk created ${successCount} dev tasks via Excel upload`,
        performedByName: requester.name,
        performedByRole: requester.role
      }
    });

    return NextResponse.json({ success: true, count: successCount }, { status: 201 });
  } catch (error) {
    console.error('Tasks BULK POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const requester = await getRequester(cookieStore);

    if (!requester || (requester.role !== 'CEO' && requester.role !== 'ADMIN' && requester.role !== 'TL')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { taskIds } = await request.json();

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: 'Task IDs array is required' }, { status: 400 });
    }

    // Delete tasks
    const { count } = await prisma.task.deleteMany({
      where: {
        id: { in: taskIds }
      }
    });

    await prisma.auditLog.create({
      data: {
        action: `Bulk deleted ${count} tasks`,
        performedByName: requester.name,
        performedByRole: requester.role
      }
    });

    return NextResponse.json({ success: true, count }, { status: 200 });
  } catch (error) {
    console.error('Tasks BULK DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
