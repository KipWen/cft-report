import { NextRequest, NextResponse } from 'next/server';
import { generateReport, getLatestReportDate } from '@/lib/cftc';
import { saveReport, loadReport } from '@/lib/storage';
import { generateAnalysis } from '@/lib/analysis';
import { ReportData } from '@/lib/types';
import { notify } from '@/lib/notify';
import { recordFailure, resetFailureState, getFailureState } from '@/lib/failure-state';

export const maxDuration = 300;

const NOTIFY_THRESHOLD = 3;
const MAX_ATTEMPTS = 4;

export async function GET(request: NextRequest) {
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const urlSecret = request.nextUrl.searchParams.get('secret');

  const isAuthorized =
    isVercelCron ||
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (cronSecret && urlSecret === cronSecret) ||
    (!cronSecret && process.env.NODE_ENV === 'development');

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  // Step 1: Lightweight date check — separate try/catch to distinguish
  // "datasets out of sync" (data integrity issue) from "CFTC unreachable" (transient)
  let latestDate: string | null;
  try {
    console.log('Checking latest CFTC report date...');
    latestDate = await getLatestReportDate();
  } catch (e) {
    // TFF/Disagg datasets out of sync — data integrity problem, notify immediately
    console.error('CFTC datasets out of sync:', e);
    const count = await recordFailure(String(e));
    await notify({
      level: 'ERROR',
      title: 'CFTC 数据集不同步',
      error: e,
      attempt: count,
      maxAttempts: MAX_ATTEMPTS,
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: 'CFTC datasets out of sync' },
      { status: 502 },
    );
  }

  if (!latestDate) {
    // CFTC API unreachable — count toward threshold, notify only after repeated failures
    console.error('Failed to fetch CFTC data');
    const count = await recordFailure('CFTC API unreachable');
    if (count >= NOTIFY_THRESHOLD) {
      await notify({
        level: 'WARNING',
        title: 'CFTC 数据获取连续失败',
        message: `已连续失败 ${count} 次，CFTC API 不可达。`,
        attempt: count,
        maxAttempts: MAX_ATTEMPTS,
        durationMs: Date.now() - startTime,
      });
    }
    return NextResponse.json(
      { error: 'Failed to fetch CFTC data' },
      { status: 502 },
    );
  }

  console.log(`  -> Latest CFTC date: ${latestDate}`);

  // Step 2: Skip if report already exists — NOT a failure, don't touch counter
  const force = request.nextUrl.searchParams.get('force') === '1';
  const existing = await loadReport(latestDate);
  if (existing && !force) {
    console.log(`Report for ${latestDate} already exists, skipping. Add &force=1 to regenerate.`);
    return NextResponse.json({
      status: 'skipped',
      report_date: latestDate,
      message: 'Report already exists. Add &force=1 to regenerate.',
    });
  }

  // Step 3: Full pipeline (CFTC + Yahoo + AI + save)
  try {
    console.log(`New report date detected: ${latestDate}, generating full report...`);
    const reportData: ReportData = await generateReport(latestDate);

    console.log('Generating AI analysis...');
    const analysis = await generateAnalysis(reportData);
    if (analysis) {
      reportData.ai_analysis = analysis;
    }

    const savedPath = await saveReport(reportData);
    console.log(`Report saved (immutable): ${savedPath}`);

    // Success — notify recovery if previously failing, then reset counter
    const prevState = await getFailureState();
    if (prevState.consecutiveFailures > 0) {
      await notify({
        level: 'SUCCESS',
        title: 'CFTC 报告已恢复更新',
        reportDate: latestDate,
        message: `此前连续失败 ${prevState.consecutiveFailures} 次，现已恢复正常。`,
        durationMs: Date.now() - startTime,
      });
    }
    await resetFailureState();

    return NextResponse.json({
      status: 'success',
      report_date: reportData.report_date,
      tff_count: reportData.tff_rows.length,
      disagg_count: reportData.disagg_rows.length,
      has_analysis: !!analysis,
    });
  } catch (error) {
    // Report generation failed — count toward threshold
    console.error('Cron update failed:', error);
    const count = await recordFailure(
      error instanceof Error ? error.message : String(error),
    );
    if (count >= NOTIFY_THRESHOLD) {
      await notify({
        level: 'ERROR',
        title: 'CFTC 报告生成失败',
        reportDate: latestDate,
        attempt: count,
        maxAttempts: MAX_ATTEMPTS,
        durationMs: Date.now() - startTime,
        error,
      });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 },
    );
  }
}
