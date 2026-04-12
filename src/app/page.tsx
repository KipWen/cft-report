import { loadLatestReport, loadReport, listReports } from '@/lib/storage';
import { ReportLayout } from '@/components/ReportLayout';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const dates = await listReports();
  const report = date ? await loadReport(date) : await loadLatestReport();

  if (!report) {
    return (
      <main className="flex-1 flex items-center justify-center bg-bg-primary">
        <div className="text-center max-w-sm">
          <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-text-primary mb-1">暂无报告数据</p>
          <p className="text-xs text-text-muted">
            系统将在每周五自动更新
          </p>
        </div>
      </main>
    );
  }

  return <ReportLayout report={report} dates={dates} currentDate={report.report_date} />;
}
