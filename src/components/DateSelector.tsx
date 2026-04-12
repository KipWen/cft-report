'use client';

import { useRouter } from 'next/navigation';

export function DateSelector({ dates, current }: { dates: string[]; current: string }) {
  const router = useRouter();

  if (dates.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 justify-end mb-1">
      <label className="text-[10px] uppercase tracking-wider font-semibold text-text-muted">
        报告日期
      </label>
      <select
        value={current}
        onChange={(e) => router.push(`/?date=${e.target.value}`)}
        className="text-xs bg-bg-white border border-border-medium rounded px-2 py-0.5 text-text-secondary focus:outline-none focus:border-accent-primary"
      >
        {dates.map(d => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
    </div>
  );
}
