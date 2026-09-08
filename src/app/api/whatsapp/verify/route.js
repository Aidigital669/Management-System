import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const rawPhone = url.searchParams.get('phone');

    if (!rawPhone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Clean phone number (leave only digits)
    const cleanPhone = rawPhone.replace(/\D/g, '');

    // 1. Basic validation checks (length and fake/test number patterns)
    if (cleanPhone.length < 10) {
      return NextResponse.json({ exists: false, reason: 'Invalid phone number length' });
    }

    // Common mock / test patterns used in sales dashboards
    const isMockPattern = 
      cleanPhone.includes('99999') || 
      cleanPhone.includes('12345') || 
      cleanPhone.includes('00000') || 
      cleanPhone.startsWith('555') ||
      cleanPhone === '1234567890';

    if (isMockPattern) {
      return NextResponse.json({ exists: false, reason: 'Mock/test phone number pattern detected' });
    }

    // 2. Extensible Hook: If user has a real WhatsApp validation API configured in the future
    const provider = process.env.WHATSAPP_CHECKER_PROVIDER; // e.g. "WASSENGER"
    const token = process.env.WHATSAPP_CHECKER_TOKEN;

    if (provider === 'WASSENGER' && token) {
      try {
        // Wassenger numbers verification API endpoint
        const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const res = await fetch(`https://api.wassenger.com/v1/numbers/exists?phone=${phoneWithCountry}`, {
          headers: { 'Token': token }
        });
        const data = await res.json();
         
        return NextResponse.json({ 
          exists: data.exists === true, 
          reason: data.exists ? 'Verified via Wassenger' : 'Number not registered on WhatsApp' 
        });
      } catch (err) {
        console.error('Wassenger verification API error:', err);
        // Fallback to format validation if API fails
      }
    }

    // 3. Default behavior: Assume valid-looking formats are active
    return NextResponse.json({ exists: true, reason: 'Valid format' });

  } catch (error) {
    console.error('WhatsApp verification route error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
