import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    },
  });
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const salesPersonId = url.searchParams.get('salesPersonId');
    const wipeAll = url.searchParams.get('wipe') === 'true';

    // Auto-clean any test/dummy data from database
    if (wipeAll) {
      await prisma.callRecord.deleteMany({});
    } else {
      await prisma.callRecord.deleteMany({
        where: {
          OR: [
            { clientName: { startsWith: 'Test Lead' } },
            { clientName: { contains: 'Test Lead' } },
            { clientName: 'Saidur Rahman' },
            { clientName: 'Gora Ranger Pura Velpura' },
            { clientName: 'Ke Sh Av' },
            { clientName: 'Elena Gilbert' },
            { clientName: 'Michael Scott' },
            { clientName: 'Sarah Connor' },
            { phoneNumber: { contains: '555' } },
            { notes: { contains: 'Auto-generated lead' } }
          ]
        }
      });
    }

    const whereClause = salesPersonId ? { salesPersonId: parseInt(salesPersonId, 10) } : {};

    const calls = await prisma.callRecord.findMany({
      where: whereClause,
      include: {
        salesPerson: {
          select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
            department: true,
            designation: true,
            avatar: true,
            role: true
          }
        }
      },
      orderBy: { callDate: 'desc' }
    });

    return NextResponse.json({ calls });
  } catch (error) {
    console.error('Fetch calls error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  };

  try {
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization');
    const EXPECTED_KEY = process.env.CRM_API_KEY || process.env.WORKFORCE_API_KEY;

    // Check if authenticated via API key or internal user session
    const cookieStore = await cookies();
    const sessionUserId = cookieStore.get('userId')?.value;

    if (EXPECTED_KEY && !sessionUserId) {
      const isBearerMatch = apiKey === `Bearer ${EXPECTED_KEY}`;
      const isKeyMatch = apiKey === EXPECTED_KEY;

      if (!apiKey || (!isKeyMatch && !isBearerMatch)) {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid or missing API Key' },
          { status: 401, headers: corsHeaders }
        );
      }
    }

    const body = await req.json();
    let { clientName, phoneNumber, salesPersonId, notes, status, followUpDate, expectedValue, leadSource } = body;

    // Fallback for name / phone variations
    clientName = clientName || body.name || 'Website Lead';
    phoneNumber = phoneNumber || body.phone || body.mobile || '';

    // If salesPersonId not provided by external webhook/form, auto-assign to active sales person
    if (!salesPersonId) {
      if (sessionUserId) {
        salesPersonId = parseInt(sessionUserId, 10);
      } else {
        let salesUser = await prisma.user.findFirst({
          where: { email: 'jennifer@aidigital.com' }
        });
        if (!salesUser) {
          salesUser = await prisma.user.findFirst({
            where: { role: 'SALES', status: 'ACTIVE' }
          }) || await prisma.user.findFirst({
            where: { role: 'SALES' }
          }) || await prisma.user.findFirst();
        }
        if (salesUser) {
          salesPersonId = salesUser.id;
        }
      }
    }

    if (!clientName || !phoneNumber || !salesPersonId) {
      return NextResponse.json(
        { error: 'Missing required fields (clientName, phoneNumber)' },
        { status: 400, headers: corsHeaders }
      );
    }

    const newCall = await prisma.callRecord.create({
      data: {
        clientName,
        phoneNumber,
        salesPersonId: parseInt(salesPersonId, 10),
        notes: notes || '',
        status: status || 'PENDING',
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        expectedValue: expectedValue ? parseFloat(expectedValue) : null,
        leadSource: leadSource || 'Website'
      }
    });

    return NextResponse.json({ call: newCall, success: true }, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error('Create call error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  };

  try {
    const url = new URL(req.url);
    const sellerId = url.searchParams.get('sellerId');
    const wipeAll = url.searchParams.get('all') === 'true' || !sellerId || sellerId === 'ALL';

    let deleteResult;
    if (!wipeAll && sellerId) {
      deleteResult = await prisma.callRecord.deleteMany({
        where: { salesPersonId: parseInt(sellerId, 10) }
      });
    } else {
      deleteResult = await prisma.callRecord.deleteMany({});
    }

    return NextResponse.json({
      success: true,
      count: deleteResult.count,
      message: wipeAll 
        ? `Successfully deleted all ${deleteResult.count} leads from system.`
        : `Successfully deleted ${deleteResult.count} leads for specified seller.`
    }, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('Delete calls error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}