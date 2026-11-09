"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Check, Github } from "lucide-react";

const FRAME = "w-full max-w-[420px] rounded-lg border border-white/10 bg-[#1d1d1b] shadow-[0_20px_50px_-20px_rgb(0_0_0/0.6)]";

/** Steps through a loop, or rests on the last step for people who prefer less motion. */
function useLoop(steps: number, ms: number) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setStep(steps - 1); return; }
    const timer = setInterval(() => setStep((s) => (s + 1) % steps), ms);
    return () => clearInterval(timer);
  }, [steps, ms]);
  return step;
}

const MOVES = [
  { column: -1, event: "Watching your repository" },
  { column: 0, event: "Issue #14 opened on GitHub" },
  { column: 1, event: "Pull request opened" },
  { column: 2, event: "Pull request merged" },
];
const COLUMNS = ["To do", "In review", "Done"];

/** The tagline, shown: a GitHub issue becomes a card, and pull requests carry it across the board. */
export function MoveDemo() {
  const { column, event } = MOVES[useLoop(MOVES.length, 2400)];
  return (
    <div className={FRAME}>
      <div className="flex items-center gap-1.5 border-b border-white/[0.07] px-3 py-2 text-[11px] text-slate-500">
        <span className="font-mono">WEB</span><span>/</span><span>Board</span>
        <span className="ml-auto inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-emerald-500" />Live</span>
      </div>
      <div className="grid grid-cols-3 gap-2 p-3">
        {COLUMNS.map((name, i) => (
          <div key={name} className="min-h-[104px] rounded-md bg-white/[0.04] p-2">
            <div className="mb-2 text-[11px] text-slate-400">{name}</div>
            {column === i && (
              <div className="animate-pop rounded border border-white/10 bg-[#292926] p-2">
                <div className="font-mono text-[10px] text-slate-500">WEB-14</div>
                <div className="mt-0.5 text-[12px] leading-snug text-slate-100">Login fails on mobile</div>
                <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-slate-500"><Github size={10} />#14</div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div key={event} className="flex animate-enter items-center gap-2 border-t border-white/[0.07] px-3 py-2.5 text-[12px] text-slate-300">
        <Github size={13} className="shrink-0 text-brand-300" />{event}
      </div>
    </div>
  );
}

const STEPS = ["Register the team", "Lock the idea", "Build a working demo", "Make the pitch deck", "Submit before the deadline"];
const TEAM = [["AR", "#7c3aed"], ["RV", "#0369a1"], ["NI", "#c2410c"]];

/** A student project: its deadline, its steps already laid out, and its team. */
export function StudentDemo() {
  const done = useLoop(STEPS.length + 1, 1500);
  return (
    <div className={FRAME}>
      <div className="flex items-center gap-2 border-b border-white/[0.07] px-3 py-2.5">
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-slate-100">Hackathon project</span>
        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-amber-300">2d 5h left</span>
      </div>
      <ul className="space-y-2 px-3 py-3">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-2.5 text-[12.5px]">
            <span className={clsx("grid size-4 shrink-0 place-items-center rounded-full border transition-colors duration-300", i < done ? "border-brand-400 bg-brand-400 text-slate-950" : "border-white/20")}>
              {i < done && <Check size={10} strokeWidth={3} />}
            </span>
            <span className={clsx("transition-colors duration-300", i < done ? "text-slate-500" : "text-slate-200")}>{step}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 border-t border-white/[0.07] px-3 py-2.5 text-[12px] text-slate-400">
        <span className="flex -space-x-1">
          {TEAM.map(([initials, color]) => (
            <span key={initials} className="grid size-5 place-items-center rounded-full text-[8px] font-semibold text-white ring-2 ring-[#1d1d1b]" style={{ background: color }}>{initials}</span>
          ))}
        </span>
        Joined with one link
      </div>
    </div>
  );
}
