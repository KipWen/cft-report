'use client';

export function ZScoreBar({ value }: { value: number | null }) {
  if (value == null) return <td className="px-2 py-1.5 text-center text-text-muted text-[11px]">-</td>;

  const pct = Math.min(Math.abs(value) / 3.0 * 50, 50);
  const isPos = value > 0;
  const isNeg = value < 0;

  return (
    <td className="relative min-w-[48px] p-0 text-center overflow-hidden">
      {value !== 0 && (
        <div
          className={`absolute top-[1px] bottom-[1px] opacity-20 ${
            isPos ? 'left-1/2' : 'right-1/2'
          }`}
          style={{
            width: `${pct}%`,
            backgroundColor: isPos ? 'var(--green-text)' : 'var(--red-text)',
          }}
        />
      )}
      <span
        className={`relative z-10 text-[11px] font-medium px-1 py-1 block tabular-nums ${
          isPos ? 'text-green-text' : isNeg ? 'text-red-text' : 'text-text-muted'
        }`}
      >
        {value.toFixed(1)}
      </span>
    </td>
  );
}
