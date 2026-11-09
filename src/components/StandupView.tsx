"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Ban, Check, ChevronLeft, ChevronRight, ClipboardCopy, Hourglass, Link2, Play, Shuffle, Square, Timer } from "lucide-react";
import { toast } from "sonner";
import { saveStandupNote, setStatusLink } from "@/app/actions/reality";
import { aiStandupSummary } from "@/app/actions/ai";
import type { CardIssue } from "@/lib/types";
import { Avatar, EmptyState, IssueKey, TypeIcon } from "./IssueBits";
import { daysSince } from "./IssueCard";

export type PersonUpdate = { id: string; name: string; done: CardIssue[]; doing: CardIssue[]; blocked: CardIssue[]; next: CardIssue[]; comments: number; note: { text: string; blocker: boolean } };

type Ctx = { projectId: string; day: string; canEdit: boolean };

const TURN_SECONDS = 120;

export function StandupView({ people, sinceLabel, staleDays, unassigned, sprintName, project, day, canEdit, canManage, statusLink, ai = false }: {
  people: PersonUpdate[]; sinceLabel: string; staleDays: number; unassigned: CardIssue[]; sprintName?: string;
  project: { id: string; name: string }; day: string; canEdit: boolean; canManage: boolean; statusLink: string | null; ai?: boolean;
}) {
  const ctx: Ctx = { projectId: project.id, day, canEdit };
  // Notes typed during this standup, so the summary includes them before the page reloads.
  const [notes, setNotes] = useState<Record<string, PersonUpdate["note"]>>(() => Object.fromEntries(people.map((p) => [p.id, p.note])));
  const noteChanged = (id: string, note: PersonUpdate["note"]) => setNotes((n) => ({ ...n, [id]: note }));
  const [order, setOrder] = useState(people.map((p) => p.id));
  const [running, setRunning] = useState(false);
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(TURN_SECONDS);
  const byId = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);
  const list = order.map((id) => byId[id]).filter(Boolean);

  const totals = {
    done: people.reduce((n, p) => n + p.done.length, 0),
    stuck: people.reduce((n, p) => n + p.doing.filter((i) => daysSince(i.statusChangedAt) >= staleDays).length, 0),
    blocked: people.reduce((n, p) => n + p.blocked.length + (notes[p.id]?.blocker ? 1 : 0), 0),
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
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
        <button className="btn" onClick={() => setOrder([...order].sort(() => Math.random() - 0.5))}><Shuffle size={14} />Shuffle order</button>
        <button className="btn" onClick={async () => {
          await navigator.clipboard.writeText(summaryText(project.name, sprintName, list, notes));
          toast.success("Standup summary copied", { description: "Paste it in Slack, Teams, WhatsApp or email." });
        }}><ClipboardCopy size={14} />Copy summary</button>
        {ai && <AiSummary projectId={project.id} />}
        {canManage && <ShareStatus projectId={project.id} link={statusLink} />}
        <button className="btn-primary" onClick={() => { setRunning(true); setIdx(0); setLeft(TURN_SECONDS); }}><Play size={14} />Run standup</button>
        </div>
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
          <div data-peek-scope><PersonCard p={list[idx]} staleDays={staleDays} large ctx={ctx} note={notes[list[idx].id]} onNote={noteChanged} /></div>
          <p className="mt-3 text-center text-xs text-muted">
            <span className="kbd">→</span> or <span className="kbd">space</span> next person · <span className="kbd">←</span> back · <span className="kbd">esc</span> end
          </p>
        </div>
      ) : (
        <div data-peek-scope className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3 3xl:grid-cols-4">
          {list.map((p) => <PersonCard key={p.id} p={p} staleDays={staleDays} ctx={ctx} note={notes[p.id]} onNote={noteChanged} />)}
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

function PersonCard({ p, staleDays, large, ctx, note, onNote }: { p: PersonUpdate; staleDays: number; large?: boolean; ctx: Ctx; note: PersonUpdate["note"]; onNote: (id: string, n: PersonUpdate["note"]) => void }) {
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
      <NoteBox key={p.id} personId={p.id} name={p.name} ctx={ctx} note={note} onNote={onNote} />
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

/** What the person said that the tracker doesn't know. Saves when you leave the box. */
function NoteBox({ personId, name, ctx, note, onNote }: { personId: string; name: string; ctx: Ctx; note: PersonUpdate["note"]; onNote: (id: string, n: PersonUpdate["note"]) => void }) {
  const [text, setText] = useState(note.text);
  const [blocker, setBlocker] = useState(note.blocker);
  const [saving, start] = useTransition();
  const saved = useRef(note);
  const save = (next: PersonUpdate["note"]) => {
    onNote(personId, next);
    if (next.text === saved.current.text && next.blocker === saved.current.blocker) return;
    saved.current = next;
    start(async () => { await saveStandupNote(ctx.projectId, personId, ctx.day, next.text, next.blocker); });
  };
  if (!ctx.canEdit) {
    if (!note.text && !note.blocker) return null;
    return (
      <div className="mt-3 border-t border-slate-100 pt-2 text-[13px] dark:border-slate-800">
        {note.blocker && <p className="mb-1 inline-flex items-center gap-1 text-[11px] font-medium text-rose-600"><Ban size={11} />Needs help</p>}
        {note.text && <p className="whitespace-pre-wrap">{note.text}</p>}
      </div>
    );
  }
  return (
    <div className="mt-3 border-t border-slate-100 pt-2 dark:border-slate-800">
      <div className="mb-1 flex items-center justify-between">
        <label htmlFor={`note-${personId}`} className="text-[11px] font-medium text-slate-500">Notes</label>
        <span className="text-[11px] text-slate-400" aria-live="polite">{saving ? "Saving…" : ""}</span>
      </div>
      <textarea id={`note-${personId}`} value={text} rows={2} placeholder={`Anything ${name.split(" ")[0]} said that isn't on the board`}
        onChange={(e) => setText(e.target.value)} onBlur={() => save({ text, blocker })}
        onKeyDown={(e) => e.stopPropagation()}
        className="input !h-auto min-h-[3.25rem] w-full resize-y py-1.5 text-[13px]" />
      <label className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-slate-300">
        <input type="checkbox" checked={blocker} onChange={(e) => { setBlocker(e.target.checked); save({ text, blocker: e.target.checked }); }} />
        Needs help to move forward
      </label>
    </div>
  );
}

/** Plain text that reads well when pasted into chat or email. */
function summaryText(projectName: string, sprintName: string | undefined, people: PersonUpdate[], notes: Record<string, PersonUpdate["note"]>) {
  const date = new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const line = (i: CardIssue) => `${i.key} ${i.title}`;
  const out = [`Standup, ${projectName}${sprintName ? ` (${sprintName})` : ""}, ${date}`];
  const help: string[] = [];
  for (const p of people) {
    const n = notes[p.id] ?? p.note;
    const parts = [
      p.done.length && `  Done: ${p.done.map(line).join("; ")}`,
      p.doing.length && `  Working on: ${p.doing.map(line).join("; ")}`,
      p.blocked.length && `  Blocked: ${p.blocked.map(line).join("; ")}`,
      n.text.trim() && `  Notes: ${n.text.trim().replace(/\n+/g, " ")}`,
    ].filter(Boolean) as string[];
    if (n.blocker) help.push(p.name);
    if (parts.length) out.push("", p.name, ...parts);
  }
  if (help.length) out.push("", `Needs help: ${help.join(", ")}`);
  return out.join("\n");
}

/** Turns the read-only status page on or off, and copies its link. */
function ShareStatus({ projectId, link }: { projectId: string; link: string | null }) {
  const [url, setUrl] = useState(link);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button className="btn" aria-expanded={open} onClick={() => setOpen(!open)}><Link2 size={14} />Share status</button>
      {open && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/30 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
        <div role="dialog" aria-modal="true" aria-label="Share status" className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 text-[13px] shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <p className="font-medium">Status page for people outside the team</p>
          <p className="mt-0.5 text-xs text-muted">Read-only and no login: what shipped this week, what's in progress, what's stuck. Anyone with the link can open it.</p>
          {url ? (
            <>
              <div className="mt-2 flex gap-1.5">
                <input readOnly value={url} className="input !h-8 min-w-0 flex-1 font-mono text-[11.5px]" onFocus={(e) => e.target.select()} />
                <button className="btn !h-8" onClick={async () => { await navigator.clipboard.writeText(url); toast.success("Status link copied"); }}><Check size={13} />Copy</button>
              </div>
              <div className="mt-2 flex gap-3 text-xs">
                <a href={url} target="_blank" rel="noreferrer" className="text-brand hover:underline">Open it</a>
                <button className="text-muted hover:text-slate-900 dark:hover:text-white" disabled={pending} onClick={() => start(async () => setUrl(await setStatusLink(projectId, true)))}>New link</button>
                <button className="text-rose-600 hover:underline" disabled={pending} onClick={() => start(async () => { await setStatusLink(projectId, false); setUrl(null); })}>Turn off</button>
              </div>
            </>
          ) : (
            <button className="btn-primary mt-3 !h-8" disabled={pending} onClick={() => start(async () => setUrl(await setStatusLink(projectId, true)))}>Create link</button>
          )}
          <div className="mt-3 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800"><button className="btn !h-8" onClick={() => setOpen(false)}>Close</button></div>
        </div>
        </div>
      )}
    </>
  );
}


/** A short summary written by AI from the board and today's notes, to check and paste into chat. */
function AiSummary({ projectId }: { projectId: string }) {
  const [text, setText] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button className="btn" disabled={pending} onClick={() => start(async () => {
        const r = await aiStandupSummary(projectId);
        if ("error" in r) toast.error(r.error); else setText(r.text);
      })}>{pending ? "Writing…" : "AI summary"}</button>
      {text && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/30 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setText(null); }}>
          <div role="dialog" aria-modal="true" aria-label="AI summary" className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-4 text-[13px] shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <p className="font-medium">Standup summary</p>
            <p className="mt-0.5 text-xs text-muted">Written by AI from the board and today&apos;s notes. Check it before you send it.</p>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} className="input mt-3 !h-auto w-full resize-y py-2 text-[13px] leading-relaxed" />
            <div className="mt-3 flex justify-end gap-2">
              <button className="btn !h-8" onClick={() => setText(null)}>Close</button>
              <button className="btn-primary !h-8" onClick={async () => { await navigator.clipboard.writeText(text); toast.success("Summary copied"); }}>Copy</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
