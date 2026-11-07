"use client";

import { useState } from "react";

const W = 640, H = 240, PAD = { l: 36, r: 64, t: 12, b: 28 };

function niceMax(v: number) {
  if (v <= 4) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / p) * p;
}

export type LineSeries = { name: string; color: string; values: (number | null)[]; dashed?: boolean };

/** Line chart with crosshair + tooltip. One y axis only. */
export function LineChart({ labels, series, unit = "" }: { labels: string[]; series: LineSeries[]; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values.filter((v): v is number => v != null))));
  const n = Math.max(labels.length - 1, 1);
  const x = (i: number) => PAD.l + (i / n) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const ticks = [0, max / 2, max];
  const every = Math.ceil(labels.length / 6);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          setHover(Math.max(0, Math.min(labels.length - 1, Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * n))));
        }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--chart-axis)">{Math.round(t)}</text>
          </g>
        ))}
        {labels.map((l, i) => i % every === 0 && (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--chart-axis)">{l}</text>
        ))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--chart-axis)" strokeDasharray="3 3" />}
        {series.map((s) => {
          const pts = s.values.map((v, i) => (v == null ? null : `${x(i)},${y(v)}`)).filter(Boolean);
          const lastIdx = s.values.reduce<number>((acc, v, i) => (v == null ? acc : i), -1);
          return (
            <g key={s.name}>
              <polyline points={pts.join(" ")} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? "5 4" : undefined} />
              {lastIdx >= 0 && (
                <text x={x(lastIdx) + 6} y={y(s.values[lastIdx]!) + 4} fontSize="11" fill="currentColor" className="fill-slate-600 dark:fill-slate-300">{s.name}</text>
              )}
              {hover != null && s.values[hover] != null && (
                <circle cx={x(hover)} cy={y(s.values[hover]!)} r={4.5} fill={s.color} stroke="var(--color-white, #fff)" strokeWidth={2} className="dark:stroke-slate-900" />
              )}
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute top-2 z-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-900"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: x(hover) > W / 2 ? "translateX(calc(-100% - 10px))" : "translateX(10px)" }}>
          <div className="mb-1 font-medium">{labels[hover]}</div>
          {series.map((s) => s.values[hover] != null && (
            <div key={s.name} className="flex items-center gap-2">
              <span className="inline-block h-0.5 w-3" style={{ background: s.color }} />
              <span className="text-muted">{s.name}</span>
              <span className="ml-auto font-medium tabular-nums">{s.values[hover]}{unit}</span>
            </div>
          ))}
        </div>
      )}
      {series.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5">
              <svg width="16" height="4"><line x1="0" x2="16" y1="2" y2="2" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "4 3" : undefined} /></svg>
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Horizontal bars (one series) with per-bar hover and value labels. */
export function BarList({ data, unit = "" }: { data: { label: string; value: number; hint?: string }[]; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <p className="py-6 text-center text-sm text-muted">No data yet.</p>;
  return (
    <ul className="space-y-1">
      {data.map((d, i) => (
        <li key={d.label} className="relative grid grid-cols-[120px_1fr_40px] items-center gap-3 rounded px-1 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40"
          onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <span className="truncate text-muted" title={d.label}>{d.label}</span>
          <span className="h-3">
            <span className="block h-full rounded-r-[4px]" style={{ width: `${(d.value / max) * 100}%`, minWidth: d.value ? 4 : 0, background: "var(--series-1)", opacity: hover == null || hover === i ? 1 : 0.55 }} />
          </span>
          <span className="text-right tabular-nums">{d.value}{unit}</span>
          {hover === i && d.hint && (
            <span className="pointer-events-none absolute left-32 top-full z-10 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-md dark:border-slate-700 dark:bg-slate-900">{d.hint}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Vertical bars (one series) with hover tooltip. */
export function ColumnChart({ data, unit = "" }: { data: { label: string; value: number; hint?: string }[]; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return <p className="py-10 text-center text-sm text-muted">Complete a sprint to see velocity.</p>;
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const bw = (W - PAD.l - 16) / data.length;
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        {[0, max / 2, max].map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - 16} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--chart-axis)">{Math.round(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const bx = PAD.l + i * bw + bw * 0.2, w = Math.min(bw * 0.6, 56), top = y(d.value), base = y(0);
          const h = Math.max(0, base - top), r = Math.min(4, h);
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={PAD.l + i * bw} y={PAD.t} width={bw} height={H - PAD.t - PAD.b} fill="transparent" />
              <path d={`M${bx},${base} V${top + r} Q${bx},${top} ${bx + r},${top} H${bx + w - r} Q${bx + w},${top} ${bx + w},${top + r} V${base} Z`}
                fill="var(--series-1)" opacity={hover == null || hover === i ? 1 : 0.55} />
              <text x={bx + w / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--chart-axis)">{d.label.length > 14 ? d.label.slice(0, 13) + "…" : d.label}</text>
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute top-2 z-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-900"
          style={{ left: `${((PAD.l + hover * bw + bw / 2) / W) * 100}%`, transform: "translateX(-50%)" }}>
          <div className="font-medium">{data[hover].label}</div>
          <div><span className="font-medium tabular-nums">{data[hover].value}{unit}</span> {data[hover].hint}</div>
        </div>
      )}
    </div>
  );
}
