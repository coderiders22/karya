import clsx from "clsx";
import { CheckCircle2, Gauge, TriangleAlert } from "lucide-react";
import type { Forecast } from "@/lib/forecast";

const TONE = {
  "on-track": { label: "On track", cls: "text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-500", Icon: CheckCircle2 },
  done: { label: "Complete", cls: "text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-500", Icon: CheckCircle2 },
  "at-risk": { label: "At risk", cls: "text-amber-700 dark:text-amber-400", bar: "bg-amber-500", Icon: TriangleAlert },
  "off-track": { label: "Off track", cls: "text-rose-700 dark:text-rose-400", bar: "bg-rose-500", Icon: TriangleAlert },
  "not-started": { label: "Just started", cls: "text-slate-600 dark:text-slate-300", bar: "bg-slate-400", Icon: Gauge },
} as const;

/** Compact "will we make it?" readout: time elapsed vs work done, plus a plain-language projection. */
export function SprintForecast({ f }: { f: Forecast }) {
  const t = TONE[f.status];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
      <span className={clsx("inline-flex items-center gap-1.5 font-medium", t.cls)}><t.Icon size={15} />{t.label}</span>
      <div className="flex flex-wrap items-center gap-2" title="Share of sprint time used vs share of work done">
        <div className="relative h-1.5 w-28 overflow-hidden sm:w-40 rounded-full bg-slate-200 dark:bg-slate-800">
          <div className={clsx("absolute inset-y-0 left-0 rounded-full", t.bar)} style={{ width: `${f.workPct}%` }} />
          <div className="absolute inset-y-[-3px] w-0.5 bg-slate-900 dark:bg-white" style={{ left: `${f.timePct}%` }} />
        </div>
        <span className="text-xs text-muted tabular-nums">{f.workPct}% done · {f.timePct}% of time</span>
      </div>
      <span className="text-xs text-muted">{f.done}/{f.total} {f.unit} · {f.daysLeft} day{f.daysLeft === 1 ? "" : "s"} left</span>
      <span className="hidden text-xs text-slate-600 md:inline dark:text-slate-300">{f.message}</span>
    </div>
  );
}
