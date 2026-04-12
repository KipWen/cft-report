'use client';

const BULL_STATES = new Set(['多头建仓', '空头回补', '多头挤压']);
const BEAR_STATES = new Set(['空头建仓', '多头平仓', '空头施压']);

export function FlowTag({ state }: { state: string }) {
  if (!state) return <td className="px-2 py-1.5" />;

  let bg = 'bg-bg-secondary';
  let text = 'text-text-tertiary';
  if (BULL_STATES.has(state)) {
    bg = 'bg-green-bg';
    text = 'text-green-text';
  } else if (BEAR_STATES.has(state)) {
    bg = 'bg-red-bg';
    text = 'text-red-text';
  }

  return (
    <td className="px-2 py-1.5 text-center">
      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap ${bg} ${text}`}>
        {state}
      </span>
    </td>
  );
}

export function CrowdingTag({ netZ, longZ, shortZ }: { netZ: number | null; longZ: number | null; shortZ: number | null }) {
  const nz = netZ ?? 0;
  const lz = longZ ?? 0;
  const sz = shortZ ?? 0;

  let label = '';
  let className = '';

  if (nz >= 2.0 || lz >= 2.0) {
    const extreme = nz >= 2.75 || lz >= 2.75;
    label = extreme ? '极端多头' : '拥挤多头';
    className = extreme
      ? 'bg-red-text/10 text-red-text border border-red-text/20'
      : 'bg-accent-lighter text-accent-primary border border-accent-primary/20';
  } else if (nz <= -2.0 || sz >= 2.0) {
    const extreme = nz <= -2.75 || sz >= 2.75;
    label = extreme ? '极端空头' : '拥挤空头';
    className = extreme
      ? 'bg-red-text/10 text-red-text border border-red-text/20'
      : 'bg-accent-lighter text-accent-primary border border-accent-primary/20';
  }

  if (!label) return <td className="px-2 py-1.5" />;

  return (
    <td className="px-2 py-1.5 text-center">
      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap ${className}`}>
        {label}
      </span>
    </td>
  );
}
