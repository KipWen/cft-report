import { NextResponse } from 'next/server';
import { loadLatestReport } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  const report = await loadLatestReport();
  if (!report) {
    return NextResponse.json({ error: 'No reports available' }, { status: 404 });
  }
  return NextResponse.json(report);
}
