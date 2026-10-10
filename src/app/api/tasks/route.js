import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

async function getRequester(cookieStore) {
  const userIdStr = cookieStore.get('userId')?.value;
  if (!userIdStr) return null;
  return await prisma.user.findUnique({ where: { id: parseInt(userIdStr) } });
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const requester = await getRequester(cookieStore);

    if (!requester) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    let tasks;
    if (requester.role === 'EMPLOYEE') {
      tasks = await prisma.task.findMany({
        where: {
          OR: [
            { assignedToId: requester.id },
            { createdById: requester.id }
          ]
        },
        include: {
          assignedTo: { select: { id: true, name: true, avatar: true, department: true } },
          createdBy: { select: { id: true, name: true, role: true } }
        },
        orderBy: { id: 'desc' }
      });
    } else {
      tasks = await prisma.task.findMany({
        include: {
          assignedTo: { select: { id: true, name: true, avatar: true, department: true } },
          createdBy: { select: { id: true, name: true, role: true } }
        },
        orderBy: { id: 'desc' }
      });
    }

    const todayIso = new Date().toISOString().split('T')[0];
    const overdueIds = [];
    tasks.forEach(t => {
      if (t.dueDate && t.dueDate < todayIso && !['DONE', 'Completed', 'Completion', 'OVERDUE', 'Overdue'].includes(t.status)) {
        overdueIds.push(t.id);
        t.status = 'OVERDUE';
      }

      // Parse subtasks safely so client always gets an array
      if (typeof t.subtasks === 'string') {
        try {
          t.subtasks = JSON.parse(t.subtasks);
        } catch {
          t.subtasks = [];
        }
      } else if (!t.subtasks) {
        t.subtasks = [];
      }
    });

    if (overdueIds.length > 0) {
      await prisma.task.updateMany({
        where: { id: { in: overdueIds } },
        data: { status: 'OVERDUE' }
      });
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Tasks GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const requester = await getRequester(cookieStore);

    if (!requester || (!['CEO', 'ADMIN', 'TL', 'EMPLOYEE'].includes(requester.role))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { title, description, assignedToId, dueDate, priority, department, subtasks, module, dependency, expectedOutput, taskDate } = await request.json();

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Employees can create tasks assigned to themselves
    let targetAssigneeId = requester.role === 'EMPLOYEE' ? requester.id : (assignedToId ? parseInt(assignedToId) : null);
    if (!targetAssigneeId) {
      return NextResponse.json({ error: 'Assignee is required' }, { status: 400 });
    }

    const assignee = await prisma.user.findUnique({ where: { id: targetAssigneeId } });
    if (!assignee) {
      return NextResponse.json({ error: 'Assignee not found' }, { status: 404 });
    }

    const resolvedDept = department || assignee.department || requester.department || 'Software Development';
    const resolvedSubtasks = Array.isArray(subtasks)
      ? JSON.stringify(subtasks)
      : (typeof subtasks === 'string' ? subtasks : '[]');

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description || '',
        assignedToId: targetAssigneeId,
        createdById: requester.id,
        dueDate: dueDate || null,
        status: 'TODO',
        priority: priority || 'Normal',
        department: resolvedDept,
        subtasks: resolvedSubtasks,
        module: module || null,
        dependency: dependency || null,
        expectedOutput: expectedOutput || null,
        taskDate: taskDate || null
      },
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true, department: true } },
        createdBy: { select: { id: true, name: true, role: true } }
      }
    });

    await prisma.auditLog.create({
      data: {
        action: requester.role === 'EMPLOYEE'
          ? `Created self task "${title.trim()}"`
          : `Created task "${title.trim()}" for ${assignee.name} (${resolvedDept})`,
        performedByName: requester.name,
        performedByRole: requester.role
      }
    });

    // Parse subtasks for client return
    const clientTask = {
      ...task,
      subtasks: typeof task.subtasks === 'string' ? JSON.parse(task.subtasks) : (task.subtasks || [])
    };

    return NextResponse.json({ task: clientTask }, { status: 201 });
  } catch (error) {
    console.error('Tasks POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
