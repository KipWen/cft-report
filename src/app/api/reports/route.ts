import { NextResponse } from 'next/server';
import { listReports } from '@/lib/storage';

export async function GET() {
  const dates = await listReports();
  return NextResponse.json({ dates });
}
