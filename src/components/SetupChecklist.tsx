"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Check, ChevronDown, X } from "lucide-react";

export type SetupStep = { id: string; title: string; detail: string; href: string; cta: string; done: boolean };

/** Shown to admins until every step is done (or they dismiss it). Steps are derived from real data. */
export function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const [hidden, setHidden] = useState(true);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try { setHidden(localStorage.getItem("karya:setup-dismissed") === "1"); setOpen(localStorage.getItem("karya:setup-collapsed") !== "1"); } catch { setHidden(false); }
  }, []);
  const done = steps.filter((s) => s.done).length;
  if (hidden || done === steps.length) return null;
  const next = steps.find((s) => !s.done);

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <ProgressRing value={done / steps.length} />
        <button className="min-w-0 flex-1 text-left" onClick={() => { setOpen(!open); try { localStorage.setItem("karya:setup-collapsed", open ? "1" : "0"); } catch {} }}>
          <div className="text-sm font-semibold">Set up your workspace</div>
          <div className="truncate text-xs text-muted">{done} of {steps.length} done{next && !open ? ` · Next: ${next.title}` : ""}</div>
        </button>
        <button className="btn-icon" onClick={() => setOpen(!open)} aria-label={open ? "Collapse" : "Expand"}>
          <ChevronDown size={16} className={clsx("transition-transform", !open && "-rotate-90")} />
        </button>
        <button className="btn-icon" data-tip="Hide for good" aria-label="Dismiss setup checklist"
          onClick={() => { setHidden(true); try { localStorage.setItem("karya:setup-dismissed", "1"); } catch {} }}>
          <X size={15} />
        </button>
      </div>
      {open && (
        <ol className="border-t border-slate-100 dark:border-slate-800">
          {steps.map((s) => (
            <li key={s.id} className={clsx("flex items-center gap-3 px-4 py-2.5", s === next && "bg-brand-soft")}>
              <span className={clsx("grid size-5 shrink-0 place-items-center rounded-full border",
                s.done ? "border-brand bg-brand text-brand-fg" : "border-slate-300 dark:border-slate-600")}>
                {s.done && <Check size={12} strokeWidth={3} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className={clsx("text-[13px] font-medium", s.done && "text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600")}>{s.title}</div>
                {!s.done && <div className="text-xs text-muted">{s.detail}</div>}
              </div>
              {!s.done && <Link href={s.href} className={s === next ? "btn-primary !h-7 text-xs" : "btn !h-7 text-xs"}>{s.cta}</Link>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 14, c = 2 * Math.PI * r;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="shrink-0 -rotate-90" aria-hidden>
      <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" className="stroke-slate-200 dark:stroke-slate-800" />
      <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" strokeLinecap="round" stroke="var(--color-brand)"
        strokeDasharray={c} strokeDashoffset={c * (1 - value)} className="transition-[stroke-dashoffset] duration-700 ease-out-quint" />
    </svg>
  );
}
