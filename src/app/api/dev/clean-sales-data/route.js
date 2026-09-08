import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Delete all test call records
    const deleteResult = await prisma.callRecord.deleteMany({});
    
    return NextResponse.json({
      success: true,
      message: `Cleared ${deleteResult.count} test call records from database. Sales dashboard is now reset to show only live incoming leads from Facebook campaigns.`
    });
  } catch (error) {
    console.error('Error clearing test sales data:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
