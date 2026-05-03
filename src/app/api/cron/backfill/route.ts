import { NextRequest, NextResponse } from 'next/server';
import { generateReport } from '@/lib/cftc';
import { saveReport, loadReport } from '@/lib/storage';
import { generateAnalysis } from '@/lib/analysis';
import { ReportData } from '@/lib/types';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const urlSecret = request.nextUrl.searchParams.get('secret');
  const isAuthorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (cronSecret && urlSecret === cronSecret) ||
    (!cronSecret && process.env.NODE_ENV === 'development');

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const targetDate = request.nextUrl.searchParams.get('date');
  if (!targetDate) {
    return NextResponse.json({ error: 'date parameter required' }, { status: 400 });
  }

  try {
    // First fetch data to get the actual report date
    const reportData: ReportData = await generateReport(targetDate);

    const force = request.nextUrl.searchParams.get('force') === '1';
    const existing = await loadReport(reportData.report_date);
    if (existing && !force) {
      return NextResponse.json({
        status: 'skipped',
        report_date: reportData.report_date,
        requested_date: targetDate,
        message: 'Already exists. Add &force=1 to regenerate.',
      });
    }

    // Generate AI analysis
    const analysis = await generateAnalysis(reportData);
    if (analysis) {
      reportData.ai_analysis = analysis;
    }

    await saveReport(reportData);

    return NextResponse.json({
      status: 'success',
      report_date: reportData.report_date,
      tff_count: reportData.tff_rows.length,
      disagg_count: reportData.disagg_rows.length,
      has_analysis: !!analysis,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed', detail: String(error) }, { status: 500 });
  }
}
