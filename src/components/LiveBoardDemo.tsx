"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { GitMerge, GitPullRequest, Hourglass } from "lucide-react";

type Card = { k: string; t: string; col: 0 | 1 | 2; who: string; hue: string };

const START: Card[] = [
  { k: "WEB-31", t: "Pricing page with plan comparison", col: 0, who: "AR", hue: "#2563eb" },
  { k: "API-8", t: "Rate-limit the public API", col: 0, who: "SK", hue: "#9333ea" },
  { k: "WEB-28", t: "Footer links overlap on mobile", col: 1, who: "PM", hue: "#c2410c" },
  { k: "API-5", t: "Move sessions to Redis", col: 1, who: "AR", hue: "#2563eb" },
  { k: "WEB-24", t: "Newsletter double opt-in", col: 2, who: "SK", hue: "#9333ea" },
];

const COLS = [
  { name: "To do", dot: "bg-slate-400" },
  { name: "In review", dot: "bg-sky-500" },
  { name: "Done", dot: "bg-brand-400" },
];

/**
 * Landing-page illustration: every few seconds a pull request "opens" or "merges"
 * and the matching card moves on its own, which is the product's core idea.
 */
export function LiveBoardDemo() {
  const [cards, setCards] = useState(START);
  const [event, setEvent] = useState<{ text: string; merged: boolean; id: number } | null>(null);

  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      setCards((prev) => {
        const movable = prev.filter((c) => c.col < 2);
        if (movable.length === 0) return START;
        const c = movable[n++ % movable.length];
        const merged = c.col === 1;
        setEvent({ text: `${c.k} · PR #${140 + n} ${merged ? "merged → Done" : "opened → In review"}`, merged, id: Date.now() });
        return prev.map((x) => (x.k === c.k ? { ...x, col: (x.col + 1) as 1 | 2 } : x));
      });
    }, 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.7)]">
        <div className="mb-3 flex items-center gap-3 px-1 text-[12px] text-slate-300">
          <span className="font-semibold text-white">Sprint 14</span>
          <span className="inline-flex items-center gap-1 text-brand-300"><span className="size-1.5 animate-pulse rounded-full bg-brand-400" />On track</span>
          <span className="ml-auto text-slate-500">6 days left</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {COLS.map((col, ci) => (
            <div key={col.name} className="min-h-[248px] rounded-lg bg-white/[0.03] p-1.5">
              <div className="flex items-center gap-1.5 px-1.5 py-1 text-[11.5px] font-medium text-slate-300">
                <span className={`size-1.5 rounded-full ${col.dot}`} />{col.name}
                <span className="text-slate-500">{cards.filter((c) => c.col === ci).length}</span>
              </div>
              <div className="space-y-1.5">
                {cards.filter((c) => c.col === ci).map((c) => (
                  <div key={`${c.k}-${c.col}`}
                    className={clsx("animate-pop rounded-md border bg-[#222220] p-2 text-[11.5px] text-slate-200",
                      ci === 2 ? "border-brand-500/40" : "border-white/[0.08]")}>
                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
                      {c.k}
                      <span className="grid size-4 place-items-center rounded-full text-[8px] font-semibold text-white" style={{ background: c.hue }}>{c.who}</span>
                    </div>
                    <div className={clsx("mt-1 font-medium leading-snug", ci === 2 && "text-slate-400 line-through decoration-slate-600")}>{c.t}</div>
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-500">
                      {ci === 0 && <><Hourglass size={9} />2d</>}
                      {ci === 1 && <span className="inline-flex items-center gap-1 text-sky-400"><GitPullRequest size={9} />PR open</span>}
                      {ci === 2 && <span className="inline-flex items-center gap-1 text-brand-300"><GitMerge size={9} />merged</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {event && (
        <div key={event.id} className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 animate-pop items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-[#222220] px-3 py-1.5 text-[11.5px] text-slate-200 shadow-lg">
          {event.merged ? <GitMerge size={12} className="text-brand-300" /> : <GitPullRequest size={12} className="text-sky-400" />}
          {event.text}
        </div>
      )}
    </div>
  );
}
