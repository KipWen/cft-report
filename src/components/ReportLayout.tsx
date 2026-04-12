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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const switchDate = (d: string) => {
    router.push(`/?date=${d}`);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar — hidden on mobile, slide-in when open */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-[220px] shrink-0 bg-bg-white overflow-y-auto
        transform transition-transform duration-200 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="px-4 pt-5 pb-4 flex items-center justify-between">
          <h1 className="text-[15px] font-semibold text-text-primary tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
            CFTC Report
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-text-muted hover:text-text-primary"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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
      <main className="flex-1 overflow-y-auto bg-bg-primary w-full">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 bg-bg-primary/95 backdrop-blur-sm border-b border-border-light">
          <div className="px-3 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1.5 mr-1 text-text-muted hover:text-text-primary hover:bg-bg-secondary rounded-md"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {(['table', 'report', 'analysis'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-2.5 sm:px-3.5 py-1.5 text-[12px] sm:text-[13px] font-medium rounded-md transition-colors ${
                    tab === t
                      ? 'bg-text-primary text-bg-primary'
                      : 'text-text-muted hover:text-text-secondary hover:bg-bg-secondary'
                  }`}
                >
                  {TAB_LABELS[t]}
                </button>
              ))}
            </div>
            {/* Date selector for mobile, text for desktop */}
            <div className="flex items-center gap-1.5">
              <select
                value={currentDate}
                onChange={(e) => switchDate(e.target.value)}
                className="lg:hidden text-[11px] bg-bg-white border border-border-medium rounded px-1.5 py-1 text-text-secondary"
              >
                {dates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <span className="hidden lg:inline text-[10px] text-text-muted tabular-nums">
                {report.report_date}
                <span className="mx-1 text-border-dark">|</span>
                {new Date(report.generated_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-3 sm:px-5 py-3 sm:py-4">
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
