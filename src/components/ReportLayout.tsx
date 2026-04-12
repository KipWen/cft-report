'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReportData } from '@/lib/types';
import { PositionTable } from './PositionTable';
import { ReportDashboard } from './ReportDashboard';
import { AnalysisView } from './AnalysisView';
import { ReportNotes } from './ReportNotes';

type Tab = 'table' | 'report' | 'analysis';

const TAB_LABELS: Record<Tab, string> = {
  table: 'Table',
  report: 'Report',
  analysis: 'Analysis',
};

export function ReportLayout({
  report,
  dates,
  currentDate,
}: {
  report: ReportData;
  dates: string[];
  currentDate: string;
}) {
  const [tab, setTab] = useState<Tab>('table');
  const [tableCompact, setTableCompact] = useState(false);
  const router = useRouter();

  const switchDate = (d: string) => {
    // Keep current tab when switching dates
    router.push(`/?date=${d}`);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-[200px] shrink-0 bg-bg-white overflow-y-auto">
        <div className="px-4 pt-5 pb-5">
          <h1 className="text-[15px] font-semibold text-text-primary tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
            CFTC Report
          </h1>
        </div>
        <nav className="px-2.5 pb-4">
          <p className="px-2 pb-2 text-[11px] font-semibold text-text-muted uppercase tracking-widest">
            历史报告
          </p>
          <div className="space-y-1">
            {dates.map(d => {
              const isActive = d === currentDate;
              const weekday = new Date(d + 'T00:00:00').toLocaleDateString('zh-CN', { weekday: 'short' });
              return (
                <button
                  key={d}
                  onClick={() => switchDate(d)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-[13px] rounded-lg transition-colors text-left ${
                    isActive
                      ? 'bg-accent-primary text-white font-medium shadow-sm'
                      : 'text-text-secondary hover:bg-bg-secondary'
                  }`}
                >
                  <span>{d}</span>
                  <span className={`text-[11px] ${isActive ? 'text-white/60' : 'text-text-muted'}`}>{weekday}</span>
                </button>
              );
            })}
          </div>
          {dates.length === 0 && (
            <p className="px-3 py-4 text-[13px] text-text-muted">暂无历史数据</p>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-bg-primary">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 bg-bg-primary/95 backdrop-blur-sm border-b border-border-light">
          <div className="px-5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              {(['table', 'report', 'analysis'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3.5 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
                    tab === t
                      ? 'bg-text-primary text-bg-primary'
                      : 'text-text-muted hover:text-text-secondary hover:bg-bg-secondary'
                  }`}
                >
                  {TAB_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-text-muted tabular-nums">
              {report.report_date}
              <span className="mx-1 text-border-dark">|</span>
              {new Date(report.generated_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          {tab === 'table' && (
            <>
              <div className="flex items-center gap-1 mb-3">
                <button
                  onClick={() => setTableCompact(true)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                    tableCompact ? 'bg-bg-secondary text-text-primary' : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  简洁版
                </button>
                <button
                  onClick={() => setTableCompact(false)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                    !tableCompact ? 'bg-bg-secondary text-text-primary' : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  专业版
                </button>
              </div>
              <PositionTable
                title="杠杆基金 Leveraged Funds"
                subtitle="TFF 报告 — 对冲基金等杠杆机构持仓"
                rows={report.tff_rows}
                compact={tableCompact}
              />
              <PositionTable
                title="管理资金 Managed Money"
                subtitle="COT 分类报告 — CTA / 商品基金持仓"
                rows={report.disagg_rows}
                compact={tableCompact}
              />
              <ReportNotes />
            </>
          )}
          {tab === 'report' && <ReportDashboard data={report} />}
          {tab === 'analysis' && <AnalysisView content={report.ai_analysis || ''} reportDate={report.report_date} />}
        </div>
      </main>
    </div>
  );
}
