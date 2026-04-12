'use client';

import React from 'react';
import { InstrumentRow } from '@/lib/types';
import { ZScoreBar } from './ZScoreBar';
import { FlowTag, CrowdingTag } from './FlowTag';

function isDivergence(flowState: string, priceChg: number | null): boolean {
  if (!flowState || priceChg == null) return false;
  const bull = new Set(['多头建仓', '空头回补', '多头挤压']);
  const bear = new Set(['空头建仓', '多头平仓', '空头施压']);
  if (bull.has(flowState) && priceChg < -0.05) return true;
  if (bear.has(flowState) && priceChg > 0.05) return true;
  return false;
}

function NumCell({ value }: { value: number | null }) {
  if (value == null) return <td className="px-2 py-1.5 text-right text-text-muted">-</td>;
  const color = value > 0 ? 'text-green-text' : value < 0 ? 'text-red-text' : 'text-text-secondary';
  return <td className={`px-2 py-1.5 text-right tabular-nums text-[11px] ${color}`}>{value.toLocaleString()}</td>;
}

function ChangeCell({ change, z }: { change: number; z: number | null }) {
  const color = change > 0 ? 'text-green-text' : change < 0 ? 'text-red-text' : 'text-text-muted';
  const zStr = z != null ? `${z.toFixed(1)}z` : '';
  const display = zStr ? `${change.toLocaleString()} (${zStr})` : change.toLocaleString();
  return <td className={`px-2 py-1.5 text-right tabular-nums text-[11px] ${color}`}>{display}</td>;
}

function PriceCell({ value, divergence }: { value: number | null; divergence: boolean }) {
  if (value == null) return <td className="px-2 py-1.5 text-right text-text-muted text-[11px]">-</td>;
  const color = value > 0 ? 'text-green-text' : value < 0 ? 'text-red-text' : 'text-text-secondary';
  return (
    <td className={`px-2 py-1.5 text-right tabular-nums text-[11px] font-medium ${color} ${
      divergence ? 'bg-yellow-bg border-l-2 border-yellow-border' : ''
    }`}>
      {value > 0 ? '+' : ''}{value.toFixed(1)}%
    </td>
  );
}

// ============================================================================
// Full (Professional) Table
// ============================================================================

function FullTable({ rows }: { rows: InstrumentRow[] }) {
  let lastSection = '';
  return (
    <div className="overflow-x-auto rounded border border-border-light">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="bg-bg-secondary border-b border-border-medium">
            <th rowSpan={2} className="text-left px-3 py-2 font-semibold text-text-tertiary text-[10px] border-r border-border-light whitespace-nowrap">资产</th>
            <th rowSpan={2} className="px-2 py-2 font-semibold text-text-tertiary text-[10px] border-r border-border-light whitespace-nowrap">涨跌</th>
            <th colSpan={3} className="px-2 py-1 font-semibold text-text-tertiary text-[10px] border-r border-border-light border-b border-border-light">净持仓</th>
            <th colSpan={3} className="px-2 py-1 font-semibold text-text-tertiary text-[10px] border-r border-border-light border-b border-border-light">多头</th>
            <th colSpan={3} className="px-2 py-1 font-semibold text-text-tertiary text-[10px] border-r border-border-light border-b border-border-light">空头</th>
            <th rowSpan={2} className="px-2 py-2 font-semibold text-text-tertiary text-[10px] border-r border-border-light whitespace-nowrap">动作</th>
            <th rowSpan={2} className="px-2 py-2 font-semibold text-text-tertiary text-[10px] whitespace-nowrap">拥挤度</th>
          </tr>
          <tr className="bg-bg-secondary">
            {['持仓','z','周变化','持仓','z','周变化','持仓','z','周变化'].map((h, i) => (
              <th key={i} className="px-2 py-1 text-[9px] text-text-muted font-medium border-r border-border-light">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const sectionHeader = row.section !== lastSection;
            if (sectionHeader) lastSection = row.section;
            const divergence = isDivergence(row.flow_state, row.price_chg);
            return (
              <React.Fragment key={row.instrument}>
                {sectionHeader && (
                  <tr><td colSpan={13} className="bg-bg-secondary/60 text-text-muted font-semibold px-3 py-1 text-[10px] uppercase tracking-wider border-b border-border-light">{row.section}</td></tr>
                )}
                <tr className={`border-b border-border-light hover:bg-bg-secondary/40 transition-colors ${i % 2 === 0 ? '' : 'bg-bg-secondary/20'}`}>
                  <td className="text-left px-3 py-1.5 font-medium text-text-secondary whitespace-nowrap text-[11px]">{row.instrument}</td>
                  <PriceCell value={row.price_chg} divergence={divergence} />
                  <NumCell value={row.net} />
                  <ZScoreBar value={row.net_z} />
                  <ChangeCell change={row.net_ww} z={row.net_ww_z} />
                  <NumCell value={row.long} />
                  <ZScoreBar value={row.long_z} />
                  <ChangeCell change={row.long_ww} z={row.long_ww_z} />
                  <NumCell value={row.short} />
                  <ZScoreBar value={row.short_z} />
                  <ChangeCell change={row.short_ww} z={row.short_ww_z} />
                  <FlowTag state={row.flow_state} />
                  <CrowdingTag netZ={row.net_z} longZ={row.long_z} shortZ={row.short_z} />
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Compact (Simple) Table — 核心字段: 资产 | 涨跌 | 净持仓 | z | 周变化 | 动作 | 拥挤度
// ============================================================================

function CompactTable({ rows }: { rows: InstrumentRow[] }) {
  let lastSection = '';
  return (
    <div className="overflow-x-auto rounded border border-border-light">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="bg-bg-secondary border-b border-border-medium">
            <th className="text-left px-3 py-2 font-semibold text-text-tertiary text-[11px] border-r border-border-light">资产</th>
            <th className="px-3 py-2 font-semibold text-text-tertiary text-[11px] border-r border-border-light">同期涨跌</th>
            <th className="px-3 py-2 font-semibold text-text-tertiary text-[11px] border-r border-border-light">净持仓</th>
            <th className="px-3 py-2 font-semibold text-text-tertiary text-[11px] border-r border-border-light">z-score</th>
            <th className="px-3 py-2 font-semibold text-text-tertiary text-[11px] border-r border-border-light">周变化</th>
            <th className="px-3 py-2 font-semibold text-text-tertiary text-[11px] border-r border-border-light">动作</th>
            <th className="px-3 py-2 font-semibold text-text-tertiary text-[11px]">拥挤度</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const sectionHeader = row.section !== lastSection;
            if (sectionHeader) lastSection = row.section;
            const divergence = isDivergence(row.flow_state, row.price_chg);
            return (
              <React.Fragment key={row.instrument}>
                {sectionHeader && (
                  <tr><td colSpan={7} className="bg-bg-secondary/60 text-text-muted font-semibold px-3 py-1.5 text-[11px] uppercase tracking-wider border-b border-border-light">{row.section}</td></tr>
                )}
                <tr className={`border-b border-border-light hover:bg-bg-secondary/40 transition-colors ${i % 2 === 0 ? '' : 'bg-bg-secondary/20'}`}>
                  <td className="text-left px-3 py-2 font-semibold text-text-primary whitespace-nowrap text-[13px]">{row.instrument}</td>
                  <PriceCell value={row.price_chg} divergence={divergence} />
                  <NumCell value={row.net} />
                  <ZScoreBar value={row.net_z} />
                  <ChangeCell change={row.net_ww} z={row.net_ww_z} />
                  <FlowTag state={row.flow_state} />
                  <CrowdingTag netZ={row.net_z} longZ={row.long_z} shortZ={row.short_z} />
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Exported Component with mode toggle
// ============================================================================

export function PositionTable({ title, subtitle, rows, compact = false }: {
  title: string;
  subtitle: string;
  rows: InstrumentRow[];
  compact?: boolean;
}) {
  return (
    <div className="mb-8">
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-text-primary tracking-tight">{title}</h2>
        <p className="text-[10px] text-text-muted">{subtitle}</p>
      </div>
      {compact ? <CompactTable rows={rows} /> : <FullTable rows={rows} />}
    </div>
  );
}
