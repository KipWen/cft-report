"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Customized,
} from "recharts";
import {
  TFF_CONTRACTS,
  DISAGG_CONTRACTS,
  ContractConfig,
} from "@/lib/contracts";

// ============================================================================
// Professional color palette — subdued, high contrast, academic
// ============================================================================

const COLORS = [
  "#1a5276", // 藏青
  "#b03a2e", // 深红
  "#1e8449", // 墨绿
  "#b9770e", // 橙黄
  "#6c3483", // 深紫
  "#117864", // 青绿
  "#a04000", // 焦橙
  "#283747", // 深灰蓝
  "#7d3c98", // 梅紫
  "#0e6655", // 森林绿
  "#943126", // 暗砖红
  "#5d6d7e", // 钢灰
  "#154360", // 暗藏青
  "#7e5109", // 暗金
  "#4a235a", // 暗紫
];

// ============================================================================
// Types
// ============================================================================

interface SeriesPoint {
  date: string;
  net: number;
  net_z: number | null;
  long: number;
  long_z: number | null;
  short: number;
  short_z: number | null;
}

interface InstrumentSeries {
  instrument: string;
  section: string;
  series: SeriesPoint[];
}

type Metric = "net" | "long" | "short" | "net_z" | "long_z" | "short_z";

// ============================================================================
// Scale detection: if one instrument dwarfs others, split Y-axes
// ============================================================================

function partitionByScale(
  selected: Set<string>,
  allSeries: Record<string, InstrumentSeries>,
  metric: Metric,
) {
  const left = new Set<string>();
  const right = new Set<string>();

  if (selected.size < 2) {
    for (const n of selected) left.add(n);
    return { left, right };
  }

  const valueOf = (pt: SeriesPoint) => Math.abs((pt[metric as keyof SeriesPoint] as number) ?? 0);

  const ranges: { name: string; maxAbs: number }[] = [];
  for (const name of selected) {
    const s = allSeries[name];
    if (!s) continue;
    let maxAbs = 0;
    for (const pt of s.series) {
      const v = valueOf(pt);
      if (v > maxAbs) maxAbs = v;
    }
    ranges.push({ name, maxAbs });
  }
  ranges.sort((a, b) => b.maxAbs - a.maxAbs);

  if (ranges.length < 2) {
    for (const n of selected) left.add(n);
    return { left, right };
  }

  // If largest is 5x larger than the second-largest, it gets its own axis
  if (ranges[0].maxAbs > ranges[1].maxAbs * 5) {
    const threshold = ranges[1].maxAbs * 3;
    for (const item of ranges) {
      if (item.maxAbs > threshold) right.add(item.name);
      else left.add(item.name);
    }
    return { left, right };
  }

  for (const n of selected) left.add(n);
  return { left, right };
}

// ============================================================================
// Chart data transform
// ============================================================================

function toChartData(
  allSeries: Record<string, InstrumentSeries>,
  selected: Set<string>,
  metric: Metric,
) {
  const allDates = new Set<string>();
  for (const name of selected) {
    const s = allSeries[name];
    if (!s) continue;
    for (const pt of s.series) allDates.add(pt.date);
  }
  const sortedDates = [...allDates].sort();

  return sortedDates.map((date) => {
    const row: Record<string, string | number | null> = { date };
    for (const name of selected) {
      const s = allSeries[name];
      if (!s) continue;
      const pt = s.series.find((p) => p.date === date);
      row[name] = pt ? (pt[metric as keyof SeriesPoint] as number) : null;
    }
    return row;
  });
}

// ============================================================================
// Instrument Selector
// ============================================================================

function InstrumentSelector({
  selected,
  onToggle,
  onToggleGroup,
}: {
  selected: Set<string>;
  onToggle: (name: string) => void;
  onToggleGroup: (names: string[]) => void;
}) {
  const allContracts = useMemo(
    () => [...TFF_CONTRACTS, ...DISAGG_CONTRACTS],
    [],
  );

  const groups = useMemo(() => {
    const map = new Map<string, ContractConfig[]>();
    for (const c of allContracts) {
      const list = map.get(c.section) || [];
      list.push(c);
      map.set(c.section, list);
    }
    return [...map.entries()];
  }, [allContracts]);

  const allSelected = allContracts.every((c) => selected.has(c.name));
  const noneSelected = allContracts.every((c) => !selected.has(c.name));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => onToggleGroup(allContracts.map((c) => c.name))}
          className="text-[11px] text-accent-primary hover:text-accent-hover font-medium"
        >
          {allSelected ? "取消全选" : "全选"}
        </button>
        {!noneSelected && !allSelected && (
          <button
            onClick={() => onToggleGroup([])}
            className="text-[11px] text-text-muted hover:text-text-secondary font-medium"
          >
            清除
          </button>
        )}
      </div>

      {groups.map(([section, contracts]) => {
        const sectionAll = contracts.every((c) => selected.has(c.name));
        const sectionSome = contracts.some((c) => selected.has(c.name));
        return (
          <div key={section}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <input
                type="checkbox"
                id={`section-${section}`}
                checked={sectionAll}
                ref={(el) => {
                  if (el) el.indeterminate = sectionSome && !sectionAll;
                }}
                onChange={() => onToggleGroup(contracts.map((c) => c.name))}
                className="w-3 h-3 rounded border-border-medium text-accent-primary cursor-pointer"
              />
              <label
                htmlFor={`section-${section}`}
                className="text-[11px] font-semibold text-text-tertiary cursor-pointer select-none"
              >
                {section}
              </label>
            </div>
            <div className="ml-4 space-y-0">
              {contracts.map((c) => (
                <label
                  key={c.name}
                  className="flex items-center gap-1.5 py-0.5 cursor-pointer select-none hover:text-text-primary transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(c.name)}
                    onChange={() => onToggle(c.name)}
                    className="w-3 h-3 rounded border-border-medium text-accent-primary cursor-pointer"
                  />
                  <span
                    className={`text-[12px] ${selected.has(c.name) ? "text-text-primary font-medium" : "text-text-muted"}`}
                  >
                    {c.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Tooltip with dynamic sorting
// ============================================================================

function ChartTooltip({
  active,
  payload,
  label,
  metric,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number | null; color: string }>;
  label?: string;
  metric: Metric;
}) {
  if (!active || !payload || !payload.length) return null;

  const items = payload
    .filter((p) => p.value != null)
    .map((p) => ({
      name: p.name,
      value: p.value as number,
      color: p.color,
    }))
    .sort((a, b) => b.value - a.value);

  if (!items.length) return null;

  return (
    <div className="bg-bg-white/95 backdrop-blur-sm border border-border-light rounded-lg shadow-md px-3 py-2 text-[12px] min-w-[160px]">
      <p className="text-[10px] text-text-muted mb-1.5 font-medium tracking-wide">
        {label}
      </p>
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-2 py-0.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-text-secondary flex-1">{item.name}</span>
          <span className="font-semibold text-text-primary tabular-nums">
            {metric.endsWith("_z")
              ? item.value.toFixed(1)
              : item.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Single Trend Chart — handles both single & dual Y-axis
// ============================================================================

function TrendChart({
  allSeries,
  selected,
  metric,
  title,
  thresholds,
  highlighted,
  onHighlight,
}: {
  allSeries: Record<string, InstrumentSeries>;
  selected: Set<string>;
  metric: Metric;
  title: string;
  thresholds?: number[];
  highlighted: string | null;
  onHighlight: (name: string | null) => void;
}) {
  const chartData = useMemo(
    () => toChartData(allSeries, selected, metric),
    [allSeries, selected, metric],
  );

  const { left: leftNames, right: rightNames } = useMemo(
    () =>
      metric.endsWith("_z")
        ? { left: selected, right: new Set<string>() }
        : partitionByScale(selected, allSeries, metric),
    [selected, allSeries, metric],
  );

  const hasDualAxis =
    metric === "net" && rightNames.size > 0 && leftNames.size > 0;

  const allSelected = [...selected].filter((n) => allSeries[n]);

  const yDomain = useMemo(() => {
    let min = Infinity,
      max = -Infinity;
    for (const row of chartData) {
      for (const key of Object.keys(row)) {
        if (key === "date") continue;
        const val = row[key] as number;
        if (val != null && isFinite(val)) {
          min = Math.min(min, val);
          max = Math.max(max, val);
        }
      }
    }
    if (!isFinite(min) || !isFinite(max)) return ["auto", "auto"] as const;
    const range = max - min || 1;
    return [
      Math.floor(min - range * 0.08),
      Math.ceil(max + range * 0.08),
    ] as const;
  }, [chartData]);

  if (!chartData.length || !allSelected.length) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-[13px] font-semibold text-text-primary">{title}</h3>
        {hasDualAxis && (
          <span className="text-[10px] text-text-muted bg-bg-secondary px-1.5 py-0.5 rounded">
            双Y轴：{[...rightNames].join("、")} → 右侧
          </span>
        )}
      </div>

      <div
        className="rounded-lg border border-border-light bg-bg-white p-3"
        onMouseLeave={() => onHighlight(null)}
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            syncId="cftc-sync"
            margin={{ top: 5, right: 80, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="#F0EDE9"
              strokeWidth={0.5}
            />

            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#A8A29E" }}
              tickFormatter={(d: string) => {
                const parts = d.split("-");
                return `${parts[1]}/${parts[2]}`;
              }}
              interval="preserveStartEnd"
              minTickGap={60}
              axisLine={{ stroke: "#E8E5E0" }}
              tickLine={false}
            />

            <YAxis
              yAxisId="left"
              domain={yDomain}
              tick={{ fontSize: 10, fill: "#A8A29E" }}
              width={55}
              tickFormatter={(v: number) =>
                metric === "net"
                  ? v >= 1000000
                    ? `${(v / 1000000).toFixed(1)}M`
                    : v >= 1000
                      ? `${(v / 1000).toFixed(0)}k`
                      : v.toString()
                  : v.toFixed(1)
              }
              axisLine={{ stroke: "#E8E5E0" }}
              tickLine={false}
            />

            {hasDualAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={yDomain}
                tick={{ fontSize: 10, fill: "#A8A29E" }}
                width={55}
                tickFormatter={(v: number) =>
                  v >= 1000000
                    ? `${(v / 1000000).toFixed(1)}M`
                    : v >= 1000
                      ? `${(v / 1000).toFixed(0)}k`
                      : v.toString()
                }
                axisLine={{ stroke: "#E8E5E0" }}
                tickLine={false}
              />
            )}

            <Tooltip content={<ChartTooltip metric={metric} />} />

            {thresholds?.map((t) => (
              <ReferenceLine
                key={t}
                y={t}
                yAxisId="left"
                stroke="#D6D3D1"
                strokeDasharray="3 3"
                strokeWidth={0.8}
              />
            ))}

            {allSelected.map((name, i) => {
              const onRight = rightNames.has(name);
              const isActive = !highlighted || highlighted === name;
              return (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  name={name}
                  yAxisId={onRight ? "right" : "left"}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={isActive ? 2 : 1}
                  opacity={isActive ? 1 : 0.15}
                  dot={false}
                  activeDot={{
                    r: 3.5,
                    strokeWidth: 2,
                    stroke: "#fff",
                    fill: COLORS[i % COLORS.length],
                    onMouseEnter: () => onHighlight(name),
                    onMouseLeave: () => onHighlight(null),
                  }}
                  connectNulls
                  animationDuration={300}
                />
              );
            })}

            {/* End-of-line labels or legend */}
            {allSelected.length <= 6 && (
              <Customized
                component={(props: Record<string, unknown>) => {
                  const items = (
                    props as {
                      formattedGraphicalItems?: Array<{
                        props: {
                          name: string;
                          points?: Array<{
                            x: number;
                            y: number;
                            value: number | null;
                          }>;
                        };
                      }>;
                    }
                  ).formattedGraphicalItems;
                  if (!items) return null;

                  // Collect end points with collision avoidance
                  const endPoints: {
                    name: string;
                    x: number;
                    y: number;
                    color: string;
                    valStr: string;
                  }[] = [];

                  for (const item of items) {
                    const name = item.props.name;
                    if (!name || !allSelected.includes(name)) continue;
                    const points = item.props.points || [];
                    const lastPt = [...points]
                      .reverse()
                      .find((p) => p.value != null);
                    if (!lastPt) continue;

                    const val = lastPt.value as number;
                    endPoints.push({
                      name,
                      x: lastPt.x,
                      y: lastPt.y,
                      color: COLORS[allSelected.indexOf(name) % COLORS.length],
                      valStr: metric.endsWith("_z")
                        ? val.toFixed(1)
                        : val.toLocaleString(),
                    });
                  }

                  // Sort by Y, then push apart overlapping labels
                  endPoints.sort((a, b) => a.y - b.y);
                  const MIN_GAP = 15;
                  for (let i = 1; i < endPoints.length; i++) {
                    if (endPoints[i].y - endPoints[i - 1].y < MIN_GAP) {
                      endPoints[i].y = endPoints[i - 1].y + MIN_GAP;
                    }
                  }

                  return (
                    <g>
                      {endPoints.map((ep) => {
                        const isActive =
                          !highlighted || highlighted === ep.name;
                        return (
                          <g
                            key={ep.name}
                            opacity={isActive ? 1 : 0.2}
                            onMouseEnter={() => onHighlight(ep.name)}
                            style={{ cursor: "pointer" }}
                          >
                            <text
                              x={ep.x + 4}
                              y={ep.y - 3}
                              fill={ep.color}
                              fontSize={10}
                              fontWeight={600}
                              textAnchor="start"
                            >
                              {ep.name}
                            </text>
                            <text
                              x={ep.x + 4}
                              y={ep.y + 11}
                              fill={ep.color}
                              fontSize={9}
                              opacity={0.7}
                              textAnchor="start"
                            >
                              {ep.valStr}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                }}
              />
            )}

            {/* Fallback legend for 7+ instruments */}
            {allSelected.length > 6 && (
              <Customized
                component={(props: Record<string, unknown>) => {
                  const items = (
                    props as {
                      formattedGraphicalItems?: Array<{
                        props: { name: string; color: string };
                      }>;
                    }
                  ).formattedGraphicalItems;
                  if (!items) return null;
                  const chartW = (props as { width?: number }).width || 800;
                  const perRow = Math.min(items.length, 5);
                  const rowHeight = 16;
                  const startY = 290;

                  return (
                    <g>
                      {items.map((item, itemIdx) => {
                        const name = item.props.name;
                        if (!name || !allSelected.includes(name)) return null;
                        const color =
                          COLORS[allSelected.indexOf(name) % COLORS.length];
                        const isActive = !highlighted || highlighted === name;
                        const col = itemIdx % perRow;
                        const row = Math.floor(itemIdx / perRow);
                        const x = 20 + col * (chartW / perRow);
                        const y = startY + row * rowHeight;

                        return (
                          <g
                            key={name}
                            opacity={isActive ? 1 : 0.3}
                            onMouseEnter={() => onHighlight(name)}
                            style={{ cursor: "pointer" }}
                          >
                            <circle cx={x} cy={y + 2} r={3.5} fill={color} />
                            <text
                              x={x + 8}
                              y={y + 8}
                              fill="#555"
                              fontSize={10}
                              fontWeight={isActive ? 600 : 400}
                            >
                              {name}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ============================================================================
// Main TrendView
// ============================================================================

export function TrendView() {
  const [allSeries, setAllSeries] = useState<Record<string, InstrumentSeries>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [positionMetric, setPositionMetric] = useState<"net" | "long" | "short">("net");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch("/api/trends");
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = (await resp.json()) as Record<string, InstrumentSeries>;
        if (!cancelled) {
          setAllSeries(data);
          const names = Object.keys(data).slice(0, 5);
          setSelected(new Set(names));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = useCallback((name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleToggleGroup = useCallback(
    (names: string[]) => {
      if (!names.length) {
        setSelected(new Set());
      } else {
        const allSelected = names.every((n) => selected.has(n));
        setSelected((prev) => {
          const next = new Set(prev);
          for (const n of names) {
            if (allSelected) next.delete(n);
            else next.add(n);
          }
          return next;
        });
      }
    },
    [selected],
  );

  const hasData = Object.keys(allSeries).length > 0;
  const availableNames = Object.keys(allSeries);

  return (
    <div className="flex gap-0">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="hidden lg:flex items-center justify-center w-4 hover:bg-bg-secondary rounded transition-colors shrink-0 group"
        title={sidebarOpen ? "收起选择面板" : "展开选择面板"}
      >
        <svg
          className={`w-3 h-3 text-text-muted group-hover:text-text-secondary transition-transform ${sidebarOpen ? "" : "rotate-180"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <div
        className={`${sidebarOpen ? "w-[200px]" : "w-0"} shrink-0 transition-all duration-200 overflow-hidden`}
      >
        <div className="w-[200px]">
          <div className="bg-bg-secondary/60 rounded-lg border border-border-light p-3 max-h-[calc(100vh-140px)] overflow-y-auto">
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-2">
              选择品种
            </p>
            {loading ? (
              <p className="text-[11px] text-text-muted">加载中...</p>
            ) : (
              <InstrumentSelector
                selected={selected}
                onToggle={handleToggle}
                onToggleGroup={handleToggleGroup}
              />
            )}
          </div>
        </div>
      </div>

      <div className={`flex-1 ${sidebarOpen ? "ml-4" : "ml-0"} transition-all`}>
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-2 text-text-muted">
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span className="text-[13px]">
                正在从 CFTC 拉取历史数据（约3年窗口），请稍候...
              </span>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-[14px] text-red-text mb-1">加载失败</p>
              <p className="text-[12px] text-text-muted">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 text-[12px] text-accent-primary hover:text-accent-hover font-medium"
              >
                重试
              </button>
            </div>
          </div>
        )}

        {!loading && !error && hasData && (
          <>
            <p className="text-[10px] text-text-muted mb-2">
              已加载 {availableNames.length} 个品种 · 勾选即时对比 ·
              悬停高亮单个品种
            </p>

            {/* 仓位指标切换 */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] text-text-muted font-medium">仓位指标：</span>
              <div className="flex rounded-md border border-border-medium overflow-hidden">
                {(["net", "long", "short"] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => setPositionMetric(key)}
                    className={`px-3 py-1 text-[12px] font-medium transition-colors ${
                      positionMetric === key
                        ? "bg-accent-primary text-white"
                        : "bg-bg-white text-text-secondary hover:bg-bg-secondary"
                    }`}
                  >
                    {{ net: "净持仓", long: "多头", short: "空头" }[key]}
                  </button>
                ))}
              </div>
            </div>

            <TrendChart
              allSeries={allSeries}
              selected={selected}
              metric={positionMetric}
              title={`${{ net: "净持仓", long: "多头持仓", short: "空头持仓" }[positionMetric]}（合约数）`}
              highlighted={highlighted}
              onHighlight={setHighlighted}
            />
            <TrendChart
              allSeries={allSeries}
              selected={selected}
              metric={`${positionMetric}_z` as Metric}
              title={`${{ net: "净持仓", long: "多头持仓", short: "空头持仓" }[positionMetric]} Z-Score（156周滚动窗口）`}
              thresholds={[-2, 0, 2]}
              highlighted={highlighted}
              onHighlight={setHighlighted}
            />

            <div className="rounded-lg border border-border-light bg-bg-secondary/40 p-4 text-[11px] text-text-tertiary mt-6">
              <div className="flex items-center gap-2 mb-2.5">
                <svg className="w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-text-secondary">图表与指标说明</span>
              </div>

              <div className="space-y-2 leading-relaxed">
                <p>
                  <span className="font-medium text-text-secondary">数据口径：</span>源自 CFTC 公开数据，涵盖 TFF（杠杆基金）与 COT Disagg（管理资金）双口径。
                </p>
                <p>
                  <span className="font-medium text-text-secondary">净持仓：</span>多头合约数 − 空头合约数。正值代表净多头，负值代表净空头。
                </p>
                <p>
                  <span className="font-medium text-text-secondary">多头 / 空头：</span>管理基金或杠杆基金的绝对多头、空头合约数，用于观察单边仓位的水位变化。
                </p>
                <p>
                  <span className="font-medium text-text-secondary">Z-Score：</span>基于 156 周（约 3 年）滚动窗口的标准化偏离度，下方图表自动跟随上方仓位指标切换对应的 Z-Score，用于衡量当前仓位在历史周期中的极端水平。
                </p>
                <p className="pt-1.5 mt-1.5 border-t border-border-light/50 text-text-muted">
                  <span className="font-medium">交互提示：</span>上下两图鼠标同步联动；仓位指标切换后上下图自动联动；当对比品种量级差异过大时，系统自动启用右侧独立 Y 轴，避免小量级品种被挤压在 0 轴附近。
                </p>
              </div>
            </div>
          </>
        )}

        {!loading && !error && !hasData && (
          <div className="flex items-center justify-center py-20">
            <p className="text-[14px] text-text-muted">暂无历史数据</p>
          </div>
        )}
      </div>
    </div>
  );
}
