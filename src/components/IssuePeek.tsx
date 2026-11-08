"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Ban, ChevronDown, ChevronUp, GitPullRequest, Hourglass, Link2, Maximize2, MessageSquare, Paperclip, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { getIssuePeek, type IssuePeekData } from "@/app/actions/peek";
import { addComment, deleteIssue, updateIssueField } from "@/app/actions/issues";
import { Avatar, IssueKey, TypeIcon } from "./IssueBits";
import { CommentComposer } from "./IssueExtras";
import { AssigneePicker, LabelPicker, PriorityPicker, StatusPicker } from "./Pickers";
import { forgetProjectLabels, useProjectLabels } from "./TitleSuggest";
import { Markdown } from "./Markdown";
import { timeAgo } from "./NotificationBell";
import { LoaderBlock } from "./LogoLoader";
import { confirmDialog, isDialogOpen } from "./Dialog";

const ISSUE_HREF = /^\/issues\/([A-Za-z][A-Za-z0-9]*-\d+)$/;

/**
 * Side panel for looking at an issue without leaving the board or list you're on.
 * Any plain click on an /issues/KEY link inside a [data-peek-scope] container opens it;
 * cmd/ctrl/shift-click and middle-click still open the full page. J/K step through the
 * issues of that same list, which makes triage a keyboard-only job.
 */
export function IssuePeek({ meId }: { meId: string }) {
  const router = useRouter();
  const [key, setKey] = useState<string | null>(null);
  const [data, setData] = useState<IssuePeekData | null>(null);
  const [loading, setLoading] = useState(false);
  const [, start] = useTransition();
  const order = useRef<string[]>([]);
  const panel = useRef<HTMLDivElement>(null);

  const load = useCallback(async (k: string) => {
    setLoading(true);
    const d = await getIssuePeek(k);
    setData(d);
    setLoading(false);
  }, []);

  // Intercept clicks on issue links inside peek-enabled areas.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      const scope = a?.closest("[data-peek-scope]");
      const m = a?.getAttribute("href")?.match(ISSUE_HREF);
      if (!a || !scope || !m) return;
      // Capture phase + stopPropagation so Next's <Link> doesn't also navigate.
      e.preventDefault();
      e.stopPropagation();
      const keys = [...scope.querySelectorAll("a[href^='/issues/']")]
        .map((x) => x.getAttribute("href")!.match(ISSUE_HREF)?.[1]?.toUpperCase())
        .filter((x): x is string => !!x);
      order.current = [...new Set(keys)];
      setKey(m[1].toUpperCase());
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => { if (key) load(key); else setData(null); }, [key, load]);

  const step = useCallback((d: 1 | -1) => {
    if (!key) return;
    const i = order.current.indexOf(key);
    const next = order.current[i + d];
    if (next) setKey(next);
  }, [key]);

  useEffect(() => {
    if (!key) return;
    const onKey = (e: KeyboardEvent) => {
      if (isDialogOpen()) return; // the dialog on top handles its own keys (Esc closes it, not the panel)
      // An open picker or @ list owns the keys too: arrows, Enter and Esc are for it, not for the panel.
      if (document.querySelector('[aria-haspopup="listbox"][aria-expanded="true"], [aria-autocomplete="list"][aria-expanded="true"]')) return;
      const typing = (e.target as HTMLElement).closest("input,textarea,select");
      if (e.key === "Escape") { e.stopPropagation(); setKey(null); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); step(1); }
      if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); step(-1); }
      if (e.key === "o" || e.key === "Enter") { e.preventDefault(); router.push(`/issues/${key}`); setKey(null); }
      if (e.key === "m" && data?.canEdit) { e.preventDefault(); save("assigneeId", "__me__"); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  const save = (field: Parameters<typeof updateIssueField>[1], value: string) => {
    if (!data) return;
    // Show the change straight away; the reload below confirms it.
    setData((d) => {
      if (!d) return d;
      if (field === "statusId") return { ...d, status: d.statuses.find((x) => x.id === value) ?? d.status };
      if (field === "assigneeId") return { ...d, assigneeId: value === "__me__" ? meId : value || null };
      if (field === "priority") return { ...d, priority: value as typeof d.priority };
      if (field === "dueDate") return { ...d, dueDate: value };
      if (field === "labels") return { ...d, labels: value ? value.split(",") : [] };
      return d;
    });
    start(async () => {
      await updateIssueField(data.id, field, value === "__me__" ? meId : value);
      if (value === "__me__") toast.success(`${data.key} assigned to you`);
      await load(data.key);
      router.refresh();
    });
  };

  if (!key) return null;
  const idx = order.current.indexOf(key);
  const age = data ? Math.floor((Date.now() - new Date(data.statusChangedAt).getTime()) / 86400000) : 0;
  const stuck = data && data.status.category === "IN_PROGRESS" && age >= data.staleDays;

  return (
    <>
      <div className="fixed inset-0 z-40 animate-fade bg-slate-950/20" onClick={() => setKey(null)} />
      <aside
        ref={panel}
        role="dialog"
        aria-label={`Issue ${key}`}
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-slate-200 bg-white shadow-xl animate-[peek-in_240ms_var(--ease-out-quint)_both] sm:w-[560px] dark:border-slate-800 dark:bg-slate-900"
      >
        <header className="flex h-12 shrink-0 items-center gap-1 border-b border-slate-200 px-3 dark:border-slate-800">
          <button className="btn-icon" onClick={() => step(-1)} disabled={idx <= 0} data-tip="Previous  K" aria-label="Previous issue"><ChevronUp size={16} /></button>
          <button className="btn-icon" onClick={() => step(1)} disabled={idx < 0 || idx >= order.current.length - 1} data-tip="Next  J" aria-label="Next issue"><ChevronDown size={16} /></button>
          <span className="ml-1 text-xs tabular-nums text-muted">{idx >= 0 ? `${idx + 1} of ${order.current.length}` : ""}</span>
          <div className="flex-1" />
          <button className="btn-icon" data-tip="Copy link" aria-label="Copy link"
            onClick={() => { navigator.clipboard.writeText(`${location.origin}/issues/${key}`); toast.success(`Link to ${key} copied`); }}>
            <Link2 size={15} />
          </button>
          {data?.canDelete && <button className="btn-icon hover:!text-red-600" data-tip="Delete issue" aria-label="Delete issue"
            onClick={async () => {
              if (!data || !(await confirmDialog({ title: `Delete ${data.key}?`, message: "Its comments, attachments and history are deleted too. This can't be undone.", danger: true, confirmLabel: "Delete issue" }))) return;
              const { id, key: deleted } = data;
              start(async () => {
                await deleteIssue(id);
                order.current = order.current.filter((k) => k !== deleted);
                setKey(null);
                toast.success(`${deleted} deleted`);
                router.refresh();
              });
            }}>
            <Trash2 size={15} />
          </button>}
          <Link href={`/issues/${key}`} onClick={() => setKey(null)} className="btn-icon" data-tip="Open full page  O" aria-label="Open full page"><Maximize2 size={15} /></Link>
          <button className="btn-icon" onClick={() => setKey(null)} data-tip="Close  Esc" aria-label="Close"><X size={16} /></button>
        </header>

        {!data ? (
          loading
            ? <LoaderBlock label={`Loading ${key}`} hint={`Opening ${key}`} size={36} className="flex-1" />
            : <p className="p-6 text-sm text-muted">This issue no longer exists.</p>
        ) : (
          <fieldset disabled={!data.canEdit} className={clsx("min-w-0 flex-1 overflow-y-auto transition-opacity", loading && "opacity-60")}>
            <div className="px-6 pb-4 pt-5">
              <div className="flex items-center gap-2 text-xs text-muted">
                <TypeIcon type={data.type} /><IssueKey k={data.key} />
                {data.parent && <><span>in</span><Link href={`/issues/${data.parent.key}`} className="truncate hover:underline">{data.parent.title}</Link></>}
              </div>
              <h2 className="mt-1.5 text-lg font-semibold leading-snug tracking-tight">{data.title}</h2>

              {(data.blockers.length > 0 || stuck) && (
                <div className="mt-3 space-y-1.5">
                  {data.blockers.map((b) => (
                    <Link key={b.key} href={`/issues/${b.key}`} className="flex items-center gap-2 rounded-md bg-rose-50 px-2.5 py-1.5 text-[12.5px] text-rose-800 hover:underline dark:bg-rose-950/40 dark:text-rose-300">
                      <Ban size={13} />Blocked by {b.key}: {b.title}
                    </Link>
                  ))}
                  {stuck && (
                    <div className="flex items-center gap-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-[12.5px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      <Hourglass size={13} />{age} days in {data.status.name}. Worth asking if it&apos;s still moving.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-x-3 gap-y-1 border-y border-slate-100 bg-slate-50/60 px-5 py-3 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900/60">
              <Field label="Status">
                <StatusPicker variant="field" value={data.status.id} statuses={data.statuses} onChange={(v) => save("statusId", v)} />
              </Field>
              <Field label="Assignee" hint="M">
                <AssigneePicker variant="field" value={data.assigneeId ?? ""} users={data.users} meId={meId} onChange={(v) => save("assigneeId", v)} />
              </Field>
              <Field label="Priority">
                <PriorityPicker variant="field" value={data.priority} onChange={(v) => save("priority", v)} />
              </Field>
              <Field label="Due">
                <input type="date" value={data.dueDate} onChange={(e) => save("dueDate", e.target.value)} className="prop-field cursor-text" aria-label="Due date" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Labels">
                  <PeekLabels projectId={data.project.id} value={data.labels} onChange={(v) => save("labels", v.join(","))} />
                </Field>
              </div>
            </div>

            <div className="px-6 py-5">
              {data.description ? <Markdown>{data.description}</Markdown> : <p className="text-[13px] text-slate-400">No description.</p>}

              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                {data.subtasks.total > 0 && <span>{data.subtasks.done}/{data.subtasks.total} sub-issues done</span>}
                {data.attachmentCount > 0 && <span className="inline-flex items-center gap-1"><Paperclip size={12} />{data.attachmentCount}</span>}
                {data.storyPoints != null && <span>{data.storyPoints} pts</span>}
                <span>Reported by {data.reporter}</span>
              </div>

              {data.prs.length > 0 && (
                <div className="mt-5 space-y-1">
                  {data.prs.map((p) => (
                    <a key={p.externalId} href={p.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[13px] hover:underline">
                      <GitPullRequest size={14} className={p.state === "merged" ? "text-violet-500" : "text-emerald-500"} />
                      <span className="truncate">{p.title}</span><span className="shrink-0 text-xs text-muted">{p.state}</span>
                    </a>
                  ))}
                </div>
              )}

              <div className="mt-7">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare size={14} className="text-slate-400" />Comments
                  {data.commentCount > 3 && <Link href={`/issues/${data.key}`} className="ml-auto text-xs font-normal text-brand hover:underline">All {data.commentCount}</Link>}
                </div>
                <ul className="space-y-3">
                  {data.comments.map((c) => (
                    <li key={c.id} className="flex gap-2.5">
                      <Avatar name={c.author} size={6} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs"><span className="font-medium">{c.author}</span> <span className="text-muted">{timeAgo(c.at)}</span></div>
                        <Markdown>{c.body}</Markdown>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-3">
                  <CommentComposer
                    key={data.id} users={data.users} rows={2} placeholder="Reply… Type @ to mention someone."
                    onSubmit={async (body) => { await addComment(data.id, body); await load(data.key); toast.success("Comment added"); }}
                  />
                </div>
              </div>
            </div>
          </fieldset>
        )}
        <footer className="hidden shrink-0 items-center gap-3 border-t border-slate-200 px-4 py-2 text-[11px] text-muted sm:flex dark:border-slate-800">
          <span><span className="kbd">J</span> <span className="kbd">K</span> next / previous</span>
          <span><span className="kbd">M</span> assign to me</span>
          <span><span className="kbd">O</span> open</span>
          <span className="ml-auto"><span className="kbd">Esc</span> close</span>
        </footer>
      </aside>
    </>
  );
}

// A div, not a <label>: a label would re-click the picker's button when an option inside it is chosen.
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] items-center gap-1">
      <span className="flex items-center gap-1 pl-1 text-xs text-muted">{label}{hint && <span className="kbd !h-4 !min-w-4 !text-[10px]">{hint}</span>}</span>
      {children}
    </div>
  );
}

function PeekLabels({ projectId, value, onChange }: { projectId: string; value: string[]; onChange: (v: string[]) => void }) {
  const all = useProjectLabels(projectId);
  return (
    <LabelPicker variant="field" value={value} all={all}
      onChange={(v) => { if (v.some((l) => !all.includes(l))) forgetProjectLabels(projectId); onChange(v); }} />
  );
}
