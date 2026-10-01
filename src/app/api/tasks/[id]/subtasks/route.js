import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

async function getRequester(cookieStore) {
  const userIdStr = cookieStore.get('userId')?.value;
  if (!userIdStr) return null;
  return await prisma.user.findUnique({ where: { id: parseInt(userIdStr) } });
}

function parseSubtasks(subtasks) {
  if (Array.isArray(subtasks)) return subtasks;
  if (typeof subtasks === 'string') {
    try {
      const parsed = JSON.parse(subtasks);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * POST /api/tasks/[id]/subtasks
 * Adds an additional task to an existing parent task.
 */
export async function POST(request, { params }) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const cookieStore = await cookies();
    const requester = await getRequester(cookieStore);

    if (!requester) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, department: true } }
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const isPowerUser = requester.role === 'CEO' || requester.role === 'ADMIN' || requester.role === 'TL' || task.createdById === requester.id;
    if (!isPowerUser) {
      return NextResponse.json({ error: 'Only admins and managers can add additional tasks to this task' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, priority, dueDate, assignedToId } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Additional task title is required' }, { status: 400 });
    }

    let assigneeName = task.assignedTo?.name || 'Assignee';
    let targetAssigneeId = task.assignedToId;

    if (assignedToId && parseInt(assignedToId) !== task.assignedToId) {
      const specificUser = await prisma.user.findUnique({ where: { id: parseInt(assignedToId) } });
      if (specificUser) {
        assigneeName = specificUser.name;
        targetAssigneeId = specificUser.id;
      }
    }

    const currentSubtasks = parseSubtasks(task.subtasks);

    const newSubtask = {
      id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      description: description ? description.trim() : '',
      status: 'TODO', // 'TODO' | 'IN_PROGRESS' | 'DONE'
      priority: priority || task.priority || 'Normal',
      dueDate: dueDate || task.dueDate || null,
      assignedToId: targetAssigneeId,
      assignedToName: assigneeName,
      createdById: requester.id,
      createdByName: requester.name,
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    const updatedSubtasks = [...currentSubtasks, newSubtask];

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        subtasks: JSON.stringify(updatedSubtasks)
      },
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true, department: true } },
        createdBy: { select: { id: true, name: true, role: true } }
      }
    });

    await prisma.auditLog.create({
      data: {
        action: `Added additional task "${newSubtask.title}" to parent task "${task.title}" (ID: ${id})`,
        performedByName: requester.name,
        performedByRole: requester.role
      }
    });

    return NextResponse.json({
      message: 'Additional task added successfully',
      subtask: newSubtask,
      subtasks: updatedSubtasks,
      task: {
        ...updatedTask,
        subtasks: updatedSubtasks
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Subtask POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/tasks/[id]/subtasks
 * Updates a specific subtask (e.g., mark as DONE or IN_PROGRESS, or edit details).
 */
export async function PATCH(request, { params }) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const cookieStore = await cookies();
    const requester = await getRequester(cookieStore);

    if (!requester) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const isPowerUser = requester.role === 'CEO' || requester.role === 'ADMIN' || requester.role === 'TL' || task.createdById === requester.id;
    const isAssignee = task.assignedToId === requester.id;

    if (!isPowerUser && !isAssignee) {
      return NextResponse.json({ error: 'Unauthorized to modify this task' }, { status: 403 });
    }

    const body = await request.json();
    const { subtaskId, status, title, description, priority, dueDate } = body;

    if (!subtaskId) {
      return NextResponse.json({ error: 'subtaskId is required' }, { status: 400 });
    }

    const currentSubtasks = parseSubtasks(task.subtasks);
    let subtaskFound = false;

    const updatedSubtasks = currentSubtasks.map(st => {
      if (st.id === subtaskId) {
        subtaskFound = true;
        const nextStatus = status !== undefined ? status : st.status;
        return {
          ...st,
          title: title !== undefined ? title : st.title,
          description: description !== undefined ? description : st.description,
          priority: priority !== undefined ? priority : st.priority,
          dueDate: dueDate !== undefined ? dueDate : st.dueDate,
          status: nextStatus,
          completedAt: nextStatus === 'DONE' ? (st.completedAt || new Date().toISOString()) : null
        };
      }
      return st;
    });

    if (!subtaskFound) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        subtasks: JSON.stringify(updatedSubtasks)
      },
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true, department: true } },
        createdBy: { select: { id: true, name: true, role: true } }
      }
    });

    return NextResponse.json({
      message: 'Subtask updated successfully',
      subtasks: updatedSubtasks,
      task: {
        ...updatedTask,
        subtasks: updatedSubtasks
      }
    });
  } catch (error) {
    console.error('Subtask PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/tasks/[id]/subtasks
 * Deletes a specific subtask from the parent task.
 */
export async function DELETE(request, { params }) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const cookieStore = await cookies();
    const requester = await getRequester(cookieStore);

    if (!requester || (requester.role !== 'CEO' && requester.role !== 'ADMIN' && requester.role !== 'TL')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const subtaskId = searchParams.get('subtaskId');

    if (!subtaskId) {
      return NextResponse.json({ error: 'subtaskId query parameter is required' }, { status: 400 });
    }

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const currentSubtasks = parseSubtasks(task.subtasks);
    const updatedSubtasks = currentSubtasks.filter(st => st.id !== subtaskId);

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        subtasks: JSON.stringify(updatedSubtasks)
      },
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true, department: true } },
        createdBy: { select: { id: true, name: true, role: true } }
      }
    });

    return NextResponse.json({
      message: 'Subtask deleted successfully',
      subtasks: updatedSubtasks,
      task: {
        ...updatedTask,
        subtasks: updatedSubtasks
      }
    });
  } catch (error) {
    console.error('Subtask DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
