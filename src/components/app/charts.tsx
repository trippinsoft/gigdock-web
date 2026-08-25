"use client";

// Lightweight, self-contained SVG charts (no external libraries) tuned for the
// GigDock dashboards: a two-series line chart (Earned vs Received) and a donut
// (Outstanding by age). Theme-aware via currentColor / token classes.

import { money } from "@/lib/format";

type Pt = { label: string; earned: number; received: number };

/** Earned vs Received over time. Compact by default. */
export function EarnedReceivedChart({ data, height = 160 }: { data: Pt[]; height?: number }) {
  const W = 560;
  const H = height;
  const padL = 8;
  const padR = 8;
  const padT = 10;
  const padB = 20;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const max = Math.max(1, ...data.map((d) => Math.max(d.earned, d.received)));
  const n = data.length;
  const x = (i: number) => (n <= 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW);
  const y = (v: number) => padT + innerH - (v / max) * innerH;

  return (
    <div>
      <div className="flex items-center gap-4 mb-2 text-xs">
        <Legend color="#2563eb" label="Earned" />
        <Legend color="#16a34a" label="Received" />
      </div>
      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none" role="img" aria-label="Earned versus received over time">
          {/* baseline */}
          <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} className="stroke-zinc-200 dark:stroke-zinc-800" strokeWidth={1} />
          {data.length > 0 && (
            <>
              <polyline points={data.map((d, i) => `${x(i)},${y(d.earned)}`).join(" ")} fill="none" stroke="#2563eb" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              <polyline points={data.map((d, i) => `${x(i)},${y(d.received)}`).join(" ")} fill="none" stroke="#16a34a" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </>
          )}
        </svg>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center truncate">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} /> {label}
    </span>
  );
}

export type DonutSeg = { label: string; value: number; color: string };

/** Donut with a centered total and a legend. */
export function Donut({ segments, centerLabel, centerValue }: { segments: DonutSeg[]; centerLabel?: string; centerValue?: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width="130" height="130" viewBox="0 0 130 130" className="shrink-0">
        <g transform="translate(65,65) rotate(-90)">
          <circle r={R} fill="none" strokeWidth={16} className="stroke-zinc-100 dark:stroke-zinc-800" />
          {total > 0 &&
            segments.map((s, i) => {
              const len = (s.value / total) * C;
              const el = (
                <circle key={i} r={R} fill="none" strokeWidth={16} stroke={s.color} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />
              );
              offset += len;
              return el;
            })}
        </g>
        <text x="65" y="60" textAnchor="middle" className="fill-zinc-900 dark:fill-zinc-100" style={{ fontSize: 16, fontWeight: 700 }}>
          {centerValue ?? money(total)}
        </text>
        {centerLabel && (
          <text x="65" y="78" textAnchor="middle" className="fill-zinc-400 dark:fill-zinc-500" style={{ fontSize: 9 }}>
            {centerLabel}
          </text>
        )}
      </svg>
      <div className="min-w-0 flex-1 flex flex-col gap-1.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 min-w-0">
              <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="shrink-0 font-medium text-zinc-700 dark:text-zinc-200">
              {money(s.value)} {total > 0 && <span className="text-zinc-400 dark:text-zinc-500">({Math.round((s.value / total) * 100)}%)</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
