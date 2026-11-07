"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Ban, ChevronLeft, ChevronRight, Hourglass, Play, Shuffle, Square, Timer } from "lucide-react";
import type { CardIssue } from "@/lib/types";
import { Avatar, EmptyState, IssueKey, TypeIcon } from "./IssueBits";
import { daysSince } from "./IssueCard";

export type PersonUpdate = { id: string; name: string; done: CardIssue[]; doing: CardIssue[]; blocked: CardIssue[]; next: CardIssue[]; comments: number };

const TURN_SECONDS = 120;

export function StandupView({ people, sinceLabel, staleDays, unassigned, sprintName }: {
  people: PersonUpdate[]; sinceLabel: string; staleDays: number; unassigned: CardIssue[]; sprintName?: string;
}) {
  const [order, setOrder] = useState(people.map((p) => p.id));
  const [running, setRunning] = useState(false);
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(TURN_SECONDS);
  const byId = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);
  const list = order.map((id) => byId[id]).filter(Boolean);

  const totals = {
    done: people.reduce((n, p) => n + p.done.length, 0),
    stuck: people.reduce((n, p) => n + p.doing.filter((i) => daysSince(i.statusChangedAt) >= staleDays).length, 0),
    blocked: people.reduce((n, p) => n + p.blocked.length, 0),
  };

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [running, idx]);

  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "Escape") setRunning(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const go = (d: number) => {
    const n = idx + d;
    if (n >= list.length) { setRunning(false); setIdx(0); return; }
    setIdx(Math.max(0, n));
    setLeft(TURN_SECONDS);
  };

  if (people.length === 0) {
    return <div className="p-4 sm:p-6"><div className="card"><EmptyState icon={Timer} title="Nothing to talk about yet">Once people have issues assigned, their updates appear here automatically.</EmptyState></div></div>;
  }

  return (
    <main className="p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div>
          <h2 className="text-sm font-semibold">Daily standup{sprintName && <span className="font-normal text-muted"> · {sprintName}</span>}</h2>
          <p className="text-xs text-muted">Written from the tracker since {sinceLabel}, so nobody has to remember what they did.</p>
        </div>
        <Stat n={totals.done} label="finished" />
        <Stat n={totals.stuck} label="stuck" tone={totals.stuck ? "amber" : undefined} />
        <Stat n={totals.blocked} label="blocked" tone={totals.blocked ? "rose" : undefined} />
        <div className="flex-1" />
        <button className="btn" onClick={() => setOrder([...order].sort(() => Math.random() - 0.5))}><Shuffle size={14} />Shuffle order</button>
        <button className="btn-primary" onClick={() => { setRunning(true); setIdx(0); setLeft(TURN_SECONDS); }}><Play size={14} />Run standup</button>
      </div>

      {running && list[idx] ? (
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-center gap-3">
            <button className="btn-icon" onClick={() => go(-1)} disabled={idx === 0} aria-label="Previous person"><ChevronLeft size={18} /></button>
            <div className="flex flex-1 items-center gap-1">
              {list.map((p, i) => <span key={p.id} className={clsx("h-1 flex-1 rounded-full", i < idx ? "bg-brand" : i === idx ? "bg-slate-900 dark:bg-white" : "bg-slate-200 dark:bg-slate-800")} />)}
            </div>
            <span className={clsx("w-14 text-right font-mono text-sm tabular-nums", left < 0 ? "text-rose-600" : left < 20 ? "text-amber-600" : "text-muted")}>
              {left < 0 ? "-" : ""}{Math.floor(Math.abs(left) / 60)}:{String(Math.abs(left) % 60).padStart(2, "0")}
            </span>
            <button className="btn-icon" onClick={() => go(1)} aria-label="Next person"><ChevronRight size={18} /></button>
            <button className="btn" onClick={() => setRunning(false)}><Square size={12} />End</button>
          </div>
          <div data-peek-scope><PersonCard p={list[idx]} staleDays={staleDays} large /></div>
          <p className="mt-3 text-center text-xs text-muted">
            <span className="kbd">→</span> or <span className="kbd">space</span> next person · <span className="kbd">←</span> back · <span className="kbd">esc</span> end
          </p>
        </div>
      ) : (
        <div data-peek-scope className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3 3xl:grid-cols-4">
          {list.map((p) => <PersonCard key={p.id} p={p} staleDays={staleDays} />)}
          {unassigned.length > 0 && (
            <section className="card p-4">
              <h3 className="mb-2 text-sm font-semibold">Nobody owns these yet</h3>
              <p className="mb-3 text-xs text-muted">In the sprint but unassigned. Worth picking up today.</p>
              <IssueList items={unassigned} />
            </section>
          )}
        </div>
      )}
    </main>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone?: "amber" | "rose" }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={clsx("text-xl font-semibold tabular-nums", tone === "amber" && "text-amber-600", tone === "rose" && "text-rose-600")}>{n}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

function PersonCard({ p, staleDays, large }: { p: PersonUpdate; staleDays: number; large?: boolean }) {
  return (
    <section className={clsx("card min-w-0", large ? "p-4 sm:p-6" : "p-4")}>
      <div className="mb-3 flex items-center gap-2.5">
        <Avatar name={p.name} size={8} />
        <div className="flex-1">
          <div className={clsx("font-semibold", large && "text-lg")}>{p.name}</div>
          <div className="text-xs text-muted">{p.done.length} done · {p.doing.length} in progress{p.comments ? ` · ${p.comments} comment${p.comments === 1 ? "" : "s"}` : ""}</div>
        </div>
      </div>
      <Group title="Finished" items={p.done} empty="Nothing closed since the last standup." />
      <Group title="Working on" items={p.doing} staleDays={staleDays} empty="Nothing in progress." />
      {p.blocked.length > 0 && <Group title="Blocked" items={p.blocked} tone="rose" />}
      <Group title="Up next" items={p.next} empty="Nothing queued in the sprint." />
    </section>
  );
}

function Group({ title, items, empty, staleDays, tone }: { title: string; items: CardIssue[]; empty?: string; staleDays?: number; tone?: "rose" }) {
  return (
    <div className="mt-3 first-of-type:mt-0">
      <div className={clsx("mb-1 flex items-center gap-1.5 text-[11px] font-medium", tone === "rose" ? "text-rose-600" : "text-slate-500")}>
        {tone === "rose" && <Ban size={11} />}{title}
      </div>
      {items.length === 0 ? <p className="text-xs text-slate-400">{empty}</p> : <IssueList items={items} staleDays={staleDays} />}
    </div>
  );
}

function IssueList({ items, staleDays }: { items: CardIssue[]; staleDays?: number }) {
  return (
    <ul className="space-y-0.5">
      {items.map((i) => {
        const age = daysSince(i.statusChangedAt);
        const stale = staleDays != null && age >= staleDays;
        return (
          <li key={i.id}>
            <Link href={`/issues/${i.key}`} className="-mx-1.5 flex items-center gap-2 rounded px-1.5 py-1 text-[13px] hover:bg-slate-100 dark:hover:bg-slate-800">
              <TypeIcon type={i.type} />
              <IssueKey k={i.key} className="w-14 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{i.title}</span>
              {staleDays != null && (
                <span className={clsx("inline-flex items-center gap-1 text-[11px]", stale ? "font-medium text-amber-600" : "text-slate-400")} title={`${age} days in ${i.status.name}`}>
                  <Hourglass size={10} />{age}d
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
