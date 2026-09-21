import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

async function getRequester(cookieStore) {
  const userIdStr = cookieStore.get('userId')?.value;
  if (!userIdStr) return null;
  return await prisma.user.findUnique({ where: { id: parseInt(userIdStr) } });
}

export async function PUT(request, { params }) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    const cookieStore = await cookies();
    const requester = await getRequester(cookieStore);

    if (!requester || (requester.role !== 'CEO' && requester.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const {
      clientId,
      businessName,
      clientName,
      joiningDate,
      services,
      packageName,
      packageAmount,
      contact,
      email,
      website,
      sector,
      requirement,
      accountReady,
      active,
      notes
    } = body;

    const targetClient = await prisma.client.findUnique({ where: { id } });
    if (!targetClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // If changing Client ID, make sure it is still unique
    if (clientId && clientId !== targetClient.clientId) {
      const existing = await prisma.client.findUnique({ where: { clientId } });
      if (existing) {
        return NextResponse.json({ error: 'New Client ID is already in use.' }, { status: 400 });
      }
    }

    const data = {};
    if (clientId) data.clientId = clientId;
    if (businessName) data.businessName = businessName;
    if (clientName !== undefined) data.clientName = clientName;
    if (joiningDate) data.joiningDate = joiningDate;
    if (services) data.services = services;
    if (packageName) data.packageName = packageName;
    if (packageAmount !== undefined) data.packageAmount = parseFloat(packageAmount) || 0;
    if (contact !== undefined) data.contact = contact;
    if (email !== undefined) data.email = email;
    if (website !== undefined) data.website = website;
    if (sector !== undefined) data.sector = sector;
    if (requirement !== undefined) data.requirement = requirement;
    if (accountReady !== undefined) data.accountReady = !!accountReady;
    if (active !== undefined) data.active = !!active;
    if (notes !== undefined) data.notes = notes;

    const updatedClient = await prisma.client.update({
      where: { id },
      data
    });

    // Sync all associated client tasks, deliveries, and feedbacks if client details were updated
    const oldClientId = targetClient.clientId;
    await prisma.clientTask.updateMany({
      where: { clientId: oldClientId },
      data: {
        clientId: updatedClient.clientId,
        businessName: updatedClient.businessName,
        ...(data.packageName ? { packageName: updatedClient.packageName } : {}),
        ...(data.services ? { service: updatedClient.services } : {})
      }
    });

    await prisma.clientDelivery.updateMany({
      where: { clientId: oldClientId },
      data: {
        clientId: updatedClient.clientId,
        clientName: updatedClient.businessName || updatedClient.clientName || ''
      }
    });

    await prisma.clientFeedback.updateMany({
      where: { clientId: oldClientId },
      data: {
        clientId: updatedClient.clientId,
        businessName: updatedClient.businessName,
        clientName: updatedClient.clientName || ''
      }
    });

    if (body.staffAssignments && typeof body.staffAssignments === 'object') {
      const typeMap = {
        c: ['Graphic', 'Creatives'],
        graphic: ['Graphic', 'Creatives'],
        r: ['Reel', 'Reels', 'Shorts'],
        reel: ['Reel', 'Reels', 'Shorts'],
        a: ['AI Video', 'AiVideo'],
        aiVideo: ['AI Video', 'AiVideo'],
        script: ['Script'],
        poster: ['Posting', 'Post', 'Poster'],
        posting: ['Posting', 'Post', 'Poster'],
        sm: ['Report', 'Weekly Report', 'Weekly Reports', 'Onboarding', 'Access', 'Setup', 'Ads']
      };

      for (const [key, toUser] of Object.entries(body.staffAssignments)) {
        if (!toUser || toUser === 'AUTO') continue;
        const targetUser = await prisma.user.findFirst({
          where: { name: { equals: toUser, mode: 'insensitive' } }
        });
        const targetName = targetUser ? targetUser.name : toUser;
        const postTypes = typeMap[key] || [];

        if (postTypes.length === 0) continue;

        for (const pType of postTypes) {
          const taskWhere = {
            clientId: updatedClient.clientId,
            OR: [
              { postType: { contains: pType, mode: 'insensitive' } },
              { taskTitle: { contains: pType, mode: 'insensitive' } }
            ]
          };

          const deliveryWhere = {
            clientId: updatedClient.clientId,
            postType: { contains: pType, mode: 'insensitive' }
          };

          const notFilters = [];
          if (!['poster', 'posting', 'sm'].includes(key)) {
            notFilters.push({ taskTitle: { startsWith: 'Post ', mode: 'insensitive' } });
          }
          if (key === 'a' || key === 'aiVideo') {
            notFilters.push({ taskTitle: { contains: 'Script', mode: 'insensitive' } });
          }
          if (notFilters.length > 0) {
            taskWhere.NOT = notFilters;
          }

          await prisma.clientTask.updateMany({
            where: taskWhere,
            data: { workingOn: targetName }
          });

          await prisma.clientDelivery.updateMany({
            where: deliveryWhere,
            data: { workingOn: targetName }
          });

          if (targetUser) {
            const matchedTasks = await prisma.clientTask.findMany({
              where: taskWhere,
              select: { taskId: true }
            });
            const codes = matchedTasks.flatMap(t => [t.taskId]).filter(Boolean);
            if (codes.length > 0) {
              await prisma.task.updateMany({
                where: {
                  OR: [
                    ...codes.map(c => ({ description: { contains: c } })),
                    ...codes.map(c => ({ title: { contains: c } }))
                  ]
                },
                data: { assignedToId: targetUser.id }
              });
            }
          }
        }
      }
    }

    if (body.reassignStaff) {
      const { fromUser, toUser, postType } = body.reassignStaff;
      if (toUser) {
        const targetUser = await prisma.user.findFirst({
          where: { name: { equals: toUser, mode: 'insensitive' } }
        });
        const sourceUser = fromUser ? await prisma.user.findFirst({
          where: { name: { equals: fromUser, mode: 'insensitive' } }
        }) : null;

        const targetName = targetUser ? targetUser.name : toUser;

        const taskWhere = { clientId: updatedClient.clientId };
        if (fromUser) taskWhere.workingOn = { equals: fromUser, mode: 'insensitive' };
        if (postType) taskWhere.postType = { equals: postType, mode: 'insensitive' };

        await prisma.clientTask.updateMany({
          where: taskWhere,
          data: { workingOn: targetName }
        });

        const deliveryWhere = { clientId: updatedClient.clientId };
        if (fromUser) deliveryWhere.workingOn = { equals: fromUser, mode: 'insensitive' };

        await prisma.clientDelivery.updateMany({
          where: deliveryWhere,
          data: { workingOn: targetName }
        });

        if (targetUser) {
          if (sourceUser) {
            await prisma.task.updateMany({
              where: { assignedToId: sourceUser.id },
              data: { assignedToId: targetUser.id }
            });
          } else {
            const clientTasks = await prisma.clientTask.findMany({
              where: taskWhere,
              select: { taskId: true }
            });
            const tIds = clientTasks.map(t => t.taskId);
            if (tIds.length > 0) {
              await prisma.task.updateMany({
                where: { OR: tIds.map(tId => ({ description: { contains: tId } })) },
                data: { assignedToId: targetUser.id }
              });
            }
          }
        }
      }
    }

    await prisma.auditLog.create({
      data: {
        action: `Updated client profile: ${updatedClient.businessName} (${updatedClient.clientId})`,
        performedByName: requester.name,
        performedByRole: requester.role
      }
    });

    return NextResponse.json({ client: updatedClient });
  } catch (error) {
    console.error('Client PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    
    const cookieStore = await cookies();
    const requester = await getRequester(cookieStore);

    if (!requester || (requester.role !== 'CEO' && requester.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 1. Look up target client in Client table by integer ID or by clientId string
    let targetClient = !isNaN(id) 
      ? await prisma.client.findUnique({ where: { id } })
      : null;

    if (!targetClient && idParam) {
      targetClient = await prisma.client.findFirst({
        where: {
          OR: [
            { clientId: idParam },
            { clientId: { equals: idParam, mode: 'insensitive' } },
            { businessName: { equals: idParam, mode: 'insensitive' } }
          ]
        }
      });
    }

    // 2. Also check if this is a Client portal user in User table (role: 'CLIENT')
    let targetUserClient = null;
    if (!targetClient && idParam) {
      targetUserClient = await prisma.user.findFirst({
        where: {
          role: 'CLIENT',
          OR: [
            ...(!isNaN(id) ? [{ id }] : []),
            { department: idParam },
            { name: { equals: idParam, mode: 'insensitive' } }
          ]
        }
      });
    }

    // If neither exists in the database, the client was already deleted!
    if (!targetClient && !targetUserClient) {
      return NextResponse.json({ 
        success: true, 
        alreadyDeleted: true, 
        message: 'Client was already removed or does not exist.' 
      }, { status: 200 });
    }

    // CASE A: Client exists in Client table
    if (targetClient) {
      const clientIdStr = targetClient.clientId;
      const bizName = targetClient.businessName;

      // Clean up RenewalRequests referencing this client
      try {
        await prisma.renewalRequest.deleteMany({
          where: {
            OR: [
              { clientDbId: targetClient.id },
              { clientId: clientIdStr }
            ]
          }
        });
      } catch (e) {}

      // Clean up ClientTask, ClientDelivery, ClientFeedback
      try {
        await prisma.clientTask.deleteMany({
          where: { clientId: clientIdStr }
        });
      } catch (e) {}

      try {
        await prisma.clientDelivery.deleteMany({
          where: { clientId: clientIdStr }
        });
      } catch (e) {}

      try {
        await prisma.clientFeedback.deleteMany({
          where: { clientId: clientIdStr }
        });
      } catch (e) {}

      // Clean up internal Task model referencing this client
      try {
        await prisma.task.deleteMany({
          where: {
            OR: [
              { description: { contains: clientIdStr } },
              { description: { contains: bizName } },
              { title: { contains: clientIdStr } },
              { title: { contains: bizName } }
            ]
          }
        });
      } catch (e) {}

      // Clean up associated portal user accounts in User table
      try {
        const userOrConditions = [{ department: clientIdStr }];
        if (targetClient.email) {
          userOrConditions.push({ email: targetClient.email });
        }
        userOrConditions.push({ name: bizName });

        const usersToDelete = await prisma.user.findMany({
          where: {
            role: 'CLIENT',
            OR: userOrConditions
          },
          select: { id: true }
        });

        if (usersToDelete.length > 0) {
          const userIds = usersToDelete.map(u => u.id);
          await prisma.callRecord.deleteMany({
            where: { salesPersonId: { in: userIds } }
          });
          await prisma.user.deleteMany({
            where: { id: { in: userIds } }
          });
        }
      } catch (e) {}

      // Finally, delete the Client record from Client table
      await prisma.client.delete({
        where: { id: targetClient.id }
      });

      try {
        await prisma.auditLog.create({
          data: {
            action: `Deleted client account: ${bizName} (${clientIdStr})`,
            performedByName: requester.name,
            performedByRole: requester.role
          }
        });
      } catch (e) {}

      return NextResponse.json({ success: true, message: `Deleted client: ${bizName}` });
    }

    // CASE B: Client only exists in User table
    if (targetUserClient) {
      const userClientId = targetUserClient.department || `USER-${targetUserClient.id}`;
      const userName = targetUserClient.name;

      try {
        await prisma.clientTask.deleteMany({
          where: {
            OR: [
              { clientId: userClientId },
              { businessName: userName }
            ]
          }
        });
      } catch (e) {}

      try {
        await prisma.clientDelivery.deleteMany({
          where: {
            OR: [
              { clientId: userClientId },
              { clientName: userName }
            ]
          }
        });
      } catch (e) {}

      try {
        await prisma.callRecord.deleteMany({
          where: { salesPersonId: targetUserClient.id }
        });
      } catch (e) {}

      await prisma.user.delete({
        where: { id: targetUserClient.id }
      });

      try {
        await prisma.auditLog.create({
          data: {
            action: `Deleted client user account: ${userName} (${userClientId})`,
            performedByName: requester.name,
            performedByRole: requester.role
          }
        });
      } catch (e) {}

      return NextResponse.json({ success: true, message: `Deleted client account: ${userName}` });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Client DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
