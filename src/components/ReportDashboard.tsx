'use client';

import React from 'react';
import { ReportData, InstrumentRow } from '@/lib/types';

// ============================================================================
// Helpers
// ============================================================================

type Sentiment = 'bullish' | 'bearish' | 'neutral';

function getSentiment(row: InstrumentRow): { sentiment: Sentiment; label: string; strength: number } {
  const z = row.net_z ?? 0;
  const flow = row.flow_state;
  const bullFlows = new Set(['多头建仓', '空头回补', '多头挤压']);
  const bearFlows = new Set(['空头建仓', '多头平仓', '空头施压']);

  let score = 0;
  if (z > 0.5) score += 1;
  if (z > 1.5) score += 1;
  if (z > 2.5) score += 1;
  if (z < -0.5) score -= 1;
  if (z < -1.5) score -= 1;
  if (z < -2.5) score -= 1;
  if (bullFlows.has(flow)) score += 1;
  if (bearFlows.has(flow)) score -= 1;

  const strength = Math.min(Math.abs(score), 3);
  if (score >= 1) return { sentiment: 'bullish', label: '看多', strength };
  if (score <= -1) return { sentiment: 'bearish', label: '看空', strength };
  return { sentiment: 'neutral', label: '中性', strength: 0 };
}

function getFlowLabel(flow: string): string {
  const map: Record<string, string> = {
    '多头建仓': '资金做多',
    '空头回补': '空头撤退',
    '多头挤压': '多头强势挤压',
    '空头建仓': '资金做空',
    '多头平仓': '多头撤退',
    '空头施压': '空头强势施压',
    '多空双增': '多空分歧加大',
    '多空双减': '多空同时离场',
  };
  return map[flow] || '';
}

function isCrowded(row: InstrumentRow): string | null {
  const nz = row.net_z ?? 0;
  const lz = row.long_z ?? 0;
  const sz = row.short_z ?? 0;
  if (nz >= 2.75 || lz >= 2.75) return '极端拥挤多头';
  if (nz <= -2.75 || sz >= 2.75) return '极端拥挤空头';
  if (nz >= 2.0 || lz >= 2.0) return '拥挤多头';
  if (nz <= -2.0 || sz >= 2.0) return '拥挤空头';
  return null;
}

function isDivergence(row: InstrumentRow): boolean {
  if (!row.flow_state || row.price_chg == null) return false;
  const bull = new Set(['多头建仓', '空头回补', '多头挤压']);
  const bear = new Set(['空头建仓', '多头平仓', '空头施压']);
  return (bull.has(row.flow_state) && row.price_chg < -0.05) ||
         (bear.has(row.flow_state) && row.price_chg > 0.05);
}

// ============================================================================
// Market Category Card
// ============================================================================

interface MarketGroup {
  name: string;
  rows: InstrumentRow[];
}

function groupByMarket(tff: InstrumentRow[], disagg: InstrumentRow[]): MarketGroup[] {
  return [
    { name: '美股指数', rows: tff.filter(r => r.section === '股指') },
    { name: '债券与利率', rows: tff.filter(r => r.section === '债券' || r.section === '利率') },
    { name: '外汇', rows: tff.filter(r => r.section === '外汇/加密' && r.instrument !== '比特币') },
    { name: '加密货币', rows: tff.filter(r => r.instrument === '比特币') },
    { name: '能源', rows: disagg.filter(r => r.section === '能源') },
    { name: '贵金属', rows: disagg.filter(r => ['黄金', '白银'].includes(r.instrument)) },
    { name: '工业与农产品', rows: disagg.filter(r => ['铜', '玉米'].includes(r.instrument)) },
  ].filter(g => g.rows.length > 0);
}

function SentimentDot({ sentiment, strength }: { sentiment: Sentiment; strength: number }) {
  const colors = {
    bullish: 'bg-green-text',
    bearish: 'bg-red-text',
    neutral: 'bg-text-muted',
  };
  return (
    <div className="flex gap-0.5 items-center">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i < strength ? colors[sentiment] : 'bg-border-medium'
          }`}
        />
      ))}
    </div>
  );
}

function PositionGauge({ z, label }: { z: number | null; label: string }) {
  const value = z ?? 0;
  // Map z-score to 0-100 (center=50, range -3 to +3)
  const position = Math.max(0, Math.min(100, ((value + 3) / 6) * 100));

  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-[10px] text-text-muted w-14 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-bg-secondary rounded-full relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 rounded-full" style={{
          background: 'linear-gradient(to right, var(--red-text), var(--border-medium) 40%, var(--border-medium) 60%, var(--green-text))',
          opacity: 0.15,
        }} />
        {/* Center line */}
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border-dark" />
        {/* Indicator */}
        <div
          className="absolute top-[-1px] w-2.5 h-2.5 rounded-full border-2 border-bg-white shadow-sm"
          style={{
            left: `calc(${position}% - 5px)`,
            backgroundColor: value > 0.5 ? 'var(--green-text)' : value < -0.5 ? 'var(--red-text)' : 'var(--text-muted)',
          }}
        />
      </div>
      <span className={`text-[10px] font-semibold tabular-nums w-8 text-right ${
        value > 0 ? 'text-green-text' : value < 0 ? 'text-red-text' : 'text-text-muted'
      }`}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function getCardInsight(row: InstrumentRow): string {
  const z = row.net_z ?? 0;
  const ww = row.net_ww;
  const wwz = row.net_ww_z ?? 0;
  const flow = row.flow_state;
  const price = row.price_chg;
  const crowded = isCrowded(row);

  // Priority: crowding > divergence > significant flow > position level
  if (crowded) {
    const dir = z > 0 ? '多头' : '空头';
    return `${dir}仓位处于3年极端水平，注意反转风险`;
  }

  const bull = new Set(['多头建仓', '空头回补', '多头挤压']);
  const bear = new Set(['空头建仓', '多头平仓', '空头施压']);
  if (flow && price != null) {
    if (bull.has(flow) && price < -0.5) return `资金看多但价格下跌，关注是否为抄底信号`;
    if (bear.has(flow) && price > 0.5) return `资金看空但价格上涨，警惕获利回吐`;
  }

  if (Math.abs(wwz) >= 1.5) {
    const dir = ww > 0 ? '净多头大幅增加' : '净多头大幅减少';
    return `本周${dir}，变化幅度为近3年${Math.abs(wwz).toFixed(1)}倍标准差`;
  }

  if (flow) {
    const flowDesc: Record<string, string> = {
      '多头建仓': '机构正在积极建立多头仓位',
      '空头回补': '空头正在平仓离场，减轻下行压力',
      '多头挤压': '多头强势进入，空头被迫回补',
      '空头建仓': '机构正在积极建立空头仓位',
      '多头平仓': '多头获利了结，仓位减少',
      '空头施压': '空头强势施压，多头被迫离场',
      '多空双增': '多空分歧加大，波动率可能上升',
      '多空双减': '多空同时减仓，市场观望情绪浓',
    };
    if (flowDesc[flow]) return flowDesc[flow];
  }

  if (Math.abs(z) >= 1.5) {
    return z > 0 ? '净多头处于历史较高水平' : '净空头处于历史较高水平';
  }

  return '持仓变化温和，无显著异常信号';
}

function InstrumentCard({ row }: { row: InstrumentRow }) {
  const { sentiment, label, strength } = getSentiment(row);
  const crowded = isCrowded(row);
  const divergence = isDivergence(row);
  const flowLabel = getFlowLabel(row.flow_state);
  const insight = getCardInsight(row);

  const sentimentColor = {
    bullish: 'text-green-text',
    bearish: 'text-red-text',
    neutral: 'text-text-muted',
  };

  return (
    <div className={`rounded-lg border bg-bg-white p-3 flex flex-col ${
      crowded ? 'border-accent-primary/40' : divergence ? 'border-yellow-border/50' : 'border-border-light'
    }`}>
      <div className="flex items-start justify-between mb-1.5">
        <div>
          <p className="text-[14px] font-semibold text-text-primary">{row.instrument}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[12px] font-semibold ${sentimentColor[sentiment]}`}>{label}</span>
            <SentimentDot sentiment={sentiment} strength={strength} />
          </div>
        </div>
        <div className="text-right">
          {row.price_chg != null && (
            <span className={`text-[15px] font-bold tabular-nums ${
              row.price_chg > 0 ? 'text-green-text' : row.price_chg < 0 ? 'text-red-text' : 'text-text-muted'
            }`}>
              {row.price_chg > 0 ? '+' : ''}{row.price_chg.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      <PositionGauge z={row.net_z} label="净持仓" />

      {/* Insight */}
      <p className="text-[11px] leading-snug text-text-muted mt-1.5 line-clamp-2">{insight}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mt-auto pt-1.5">
        {flowLabel && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
            ['资金做多', '空头撤退', '多头强势挤压'].includes(flowLabel)
              ? 'bg-green-bg text-green-text'
              : ['资金做空', '多头撤退', '空头强势施压'].includes(flowLabel)
              ? 'bg-red-bg text-red-text'
              : 'bg-bg-secondary text-text-muted'
          }`}>
            {flowLabel}
          </span>
        )}
        {crowded && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent-lighter text-accent-primary border border-accent-primary/20">
            {crowded}
          </span>
        )}
        {divergence && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-yellow-bg text-amber-600 border border-yellow-border/30">
            价格背离
          </span>
        )}
      </div>
    </div>
  );
}

function MarketSection({ group }: { group: MarketGroup }) {
  return (
    <div className="mb-4">
      <h3 className="text-[13px] font-semibold text-text-primary tracking-tight mb-2">{group.name}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {group.rows.map(row => (
          <InstrumentCard key={row.instrument} row={row} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Summary Header
// ============================================================================

function SummaryHeader({ data }: { data: ReportData }) {
  const all = [...data.tff_rows, ...data.disagg_rows];
  const bullCount = all.filter(r => getSentiment(r).sentiment === 'bullish').length;
  const bearCount = all.filter(r => getSentiment(r).sentiment === 'bearish').length;
  const neutralCount = all.length - bullCount - bearCount;
  const crowdedItems = all.filter(r => isCrowded(r) !== null);
  const divergenceItems = all.filter(r => isDivergence(r));

  const overallSentiment = bullCount > bearCount + 3 ? '整体偏多' :
                           bearCount > bullCount + 3 ? '整体偏空' : '多空均衡';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
      <div className="col-span-2 rounded-lg border border-border-light bg-bg-white p-3.5">
        <p className="text-[11px] text-text-muted font-medium uppercase tracking-wider">市场情绪</p>
        <p className="text-lg font-bold text-text-primary mt-0.5">{overallSentiment}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-text" />
            <span className="text-[13px] text-text-secondary">{bullCount} 看多</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-text" />
            <span className="text-[13px] text-text-secondary">{bearCount} 看空</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-text-muted" />
            <span className="text-[13px] text-text-secondary">{neutralCount} 中性</span>
          </div>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden mt-2 bg-bg-secondary">
          <div className="bg-green-text/60" style={{ width: `${(bullCount / all.length) * 100}%` }} />
          <div className="bg-text-muted/30" style={{ width: `${(neutralCount / all.length) * 100}%` }} />
          <div className="bg-red-text/60" style={{ width: `${(bearCount / all.length) * 100}%` }} />
        </div>
      </div>
      <div className="rounded-lg border border-border-light bg-bg-white p-3.5">
        <p className="text-[11px] text-text-muted font-medium uppercase tracking-wider">拥挤交易</p>
        <p className="text-2xl font-bold text-accent-primary mt-0.5 tabular-nums">{crowdedItems.length}</p>
        <p className="text-[11px] text-text-muted mt-1 leading-snug truncate" title={crowdedItems.map(r => r.instrument).join('、')}>
          {crowdedItems.length > 0 ? crowdedItems.map(r => r.instrument).join('、') : '无'}
        </p>
      </div>
      <div className="rounded-lg border border-border-light bg-bg-white p-3.5">
        <p className="text-[11px] text-text-muted font-medium uppercase tracking-wider">价格背离</p>
        <p className="text-2xl font-bold text-amber-600 mt-0.5 tabular-nums">{divergenceItems.length}</p>
        <p className="text-[11px] text-text-muted mt-1 leading-snug truncate" title={divergenceItems.map(r => r.instrument).join('、')}>
          {divergenceItems.length > 0 ? divergenceItems.map(r => r.instrument).join('、') : '无'}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Dashboard
// ============================================================================

export function ReportDashboard({ data }: { data: ReportData }) {
  const groups = groupByMarket(data.tff_rows, data.disagg_rows);

  return (
    <div>
      <SummaryHeader data={data} />
      {groups.map(g => (
        <MarketSection key={g.name} group={g} />
      ))}
    </div>
  );
}
