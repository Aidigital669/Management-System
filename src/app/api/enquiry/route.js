import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// CORS Options Preflight Handler
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    },
  });
}

export async function POST(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  };

  try {
    // API Key Authentication
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization');
    const EXPECTED_KEY = process.env.CRM_API_KEY || process.env.WORKFORCE_API_KEY;

    if (EXPECTED_KEY) {
      const isBearerMatch = apiKey === `Bearer ${EXPECTED_KEY}`;
      const isKeyMatch = apiKey === EXPECTED_KEY;

      if (!apiKey || (!isKeyMatch && !isBearerMatch)) {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid or missing API Key' },
          { status: 401, headers: corsHeaders }
        );
      }
    }

    const body = await request.json();
    const name = body.name || body.clientName || 'Website Visitor';
    const phone = body.phone || body.phoneNumber || body.mobile || '';
    const email = body.email || '';
    const service = body.service || '';
    const message = body.message || body.notes || '';
    const source = body.source || 'Website (aidigital.biz)';

    if (!phone && !email) {
      return NextResponse.json(
        { error: 'Phone number or email address is required.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Assign to active SALES personnel (default to Jennifer)
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

    if (!salesUser) {
      return NextResponse.json(
        { error: 'No sales personnel available in system to assign lead.' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Format notes with all enquiry context
    const noteParts = [
      `[Source: ${source}]`,
      service ? `[Service: ${service}]` : '',
      email ? `[Email: ${email}]` : '',
      message ? `Message: ${message}` : ''
    ].filter(Boolean).join(' ');

    // Create new CallRecord in CRM
    const newLead = await prisma.callRecord.create({
      data: {
        clientName: name,
        phoneNumber: phone || email,
        status: 'PENDING',
        notes: noteParts,
        salesPersonId: salesUser.id,
        leadSource: source
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Enquiry received and assigned to sales team successfully.',
        leadId: newLead.id
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Enquiry API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ONLINE',
    endpoint: '/api/enquiry',
    method: 'POST',
    expectedFields: {
      name: 'Client / Visitor Name',
      phone: 'Phone Number (Required)',
      email: 'Email Address (Optional)',
      service: 'Service of interest (Optional)',
      message: 'Project brief / Message (Optional)',
      source: 'Default: "Website (aidigital.biz)"'
    }
  });
}
