import { NextRequest, NextResponse } from 'next/server';
import { generateTimeSeries } from '@/lib/cftc';

export async function GET(request: NextRequest) {
  const instrumentsParam = request.nextUrl.searchParams.get('instruments');
  // No param = fetch all instruments
  const instruments = instrumentsParam
    ? instrumentsParam.split(',').map(s => s.trim()).filter(Boolean)
    : undefined;

  try {
    const data = await generateTimeSeries(instruments);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Trends API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
