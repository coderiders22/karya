"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { IssueType, Priority, StatusCategory } from "@prisma/client";
import { bulkDelete, bulkUpdate, saveFilter } from "@/app/actions/bulk";
import { ISSUE_TYPES, PRIORITIES } from "@/lib/constants";
import { Bookmark, Inbox } from "lucide-react";
import { toast } from "sonner";
import { Avatar, EmptyState, IssueKey, PriorityIcon, StatusPill, TypeIcon, LabelChip } from "./IssueBits";
import { confirmDialog, promptDialog } from "./Dialog";

export type NavRow = {
  id: string; key: string; title: string; type: IssueType; priority: Priority; storyPoints: number | null;
  dueDate: string | null; updatedAt: string; labels: string[]; status: { name: string; category: StatusCategory };
  assignee: { name: string } | null; project: { key: string; name: string };
};

type Opt = { value: string; label: string };

export function IssueNavigator({
  rows, users, statusNames, sprints, projectId, query, isAdmin, showProject,
}: {
  rows: NavRow[]; users: Opt[]; statusNames: string[]; sprints: Opt[]; projectId: string | null; query: string; isAdmin: boolean; showProject: boolean;
}) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<string>();
  const [pending, start] = useTransition();
  const all = rows.length > 0 && sel.size === rows.length;
  const [cursor, setCursor] = useState(-1);

  // J/K to move, X to select, Enter to open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.defaultPrevented || document.querySelector("[aria-label^='Issue '][role=dialog]")) return;
      if (t.closest("input,textarea,select,[contenteditable=true]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "j") { e.preventDefault(); setCursor((c) => Math.min(rows.length - 1, c + 1)); }
      if (k === "k") { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
      if (k === "x" && rows[cursor]) {
        e.preventDefault();
        const id = rows[cursor].id;
        setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
      }
      if (k === "enter" && rows[cursor]) router.push(`/issues/${rows[cursor].key}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cursor, rows, router]);
  useEffect(() => { document.querySelector(`[data-row="${cursor}"]`)?.scrollIntoView({ block: "nearest" }); }, [cursor]);
  const ids = useMemo(() => [...sel], [sel]);
  const now = Date.now();

  const apply = (field: Parameters<typeof bulkUpdate>[1], value: string) =>
    start(async () => {
      const r = await bulkUpdate(ids, field, value);
      toast.success(`Updated ${r.changed} issue${r.changed === 1 ? "" : "s"}${r.skipped ? ` · skipped ${r.skipped} (not available in their project)` : ""}`);
      setSel(new Set());
      router.refresh();
    });

  const Bulk = ({ label, field, options }: { label: string; field: Parameters<typeof bulkUpdate>[1]; options: Opt[] }) => (
    <select value="" disabled={pending} onChange={(e) => e.target.value !== "" && apply(field, e.target.value === "__none" ? "" : e.target.value)} className="select w-auto !py-1 text-xs">
      <option value="">{label}</option>
      {options.map((o) => <option key={o.value} value={o.value || "__none"}>{o.label}</option>)}
    </select>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">{rows.length} issue{rows.length === 1 ? "" : "s"}{rows.length === 500 && " (first 500)"}</span>
        <div className="flex-1" />
        {msg && <span className="text-xs text-green-600">{msg}</span>}
        <SaveFilter query={query} projectId={projectId} />
      </div>

      {sel.size > 0 && (
        <div className="card sticky top-2 z-10 flex flex-wrap items-center gap-2 p-2 shadow-lg shadow-slate-900/5">
          <span className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white dark:bg-white dark:text-slate-900">{sel.size} selected</span>
          <Bulk label="Set status…" field="statusName" options={statusNames.map((s) => ({ value: s, label: s }))} />
          <Bulk label="Assign to…" field="assigneeId" options={[{ value: "", label: "Unassigned" }, ...users]} />
          <Bulk label="Priority…" field="priority" options={PRIORITIES.map((p) => ({ value: p.value, label: p.label }))} />
          <Bulk label="Type…" field="type" options={ISSUE_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
          {sprints.length > 0 && <Bulk label="Move to sprint…" field="sprintId" options={[{ value: "", label: "Backlog" }, ...sprints]} />}
          <button className="btn !py-1 text-xs" disabled={pending} onClick={async () => { const l = await promptDialog({ title: `Add a label to ${sel.size} issue${sel.size === 1 ? "" : "s"}`, label: "Label", placeholder: "e.g. frontend", confirmLabel: "Add label" }); if (l) apply("addLabel", l.replace(/\s+/g, "-")); }}>+ Label</button>
          {isAdmin && (
            <button className="btn-danger text-xs" disabled={pending}
              onClick={async () => (await confirmDialog({ title: `Delete ${sel.size} issue${sel.size === 1 ? "" : "s"}?`, message: "Their comments, attachments and history are deleted too. This can't be undone.", danger: true })) && start(async () => { const n = await bulkDelete(ids); toast.success(`Deleted ${n} issues`); setSel(new Set()); router.refresh(); })}>
              Delete
            </button>
          )}
          <div className="flex-1" />
          <button className="btn-ghost text-xs" onClick={() => setSel(new Set())}>Clear</button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card"><EmptyState icon={Inbox} title="No issues match">Try removing a filter or including done issues.</EmptyState></div>
      ) : (
        <div data-peek-scope className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left">
              <tr className="border-b border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900 [&>th]:px-3 [&>th]:py-2 [&>th]:text-xs [&>th]:font-medium [&>th]:text-slate-500">
                <th className="w-8"><input type="checkbox" checked={all} onChange={() => setSel(all ? new Set() : new Set(rows.map((r) => r.id)))} aria-label="Select all" /></th>
                <th className="w-8"></th><th>Key</th><th>Title</th>{showProject && <th>Project</th>}<th>Status</th><th>Priority</th><th>Est.</th><th>Assignee</th><th>Due</th><th>Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((i, idx) => (
                <tr key={i.id} data-row={idx} onMouseEnter={() => setCursor(idx)}
                  className={`[&>td]:px-3 [&>td]:py-2 ${sel.has(i.id) ? "bg-brand/5" : idx === cursor ? "bg-slate-50 dark:bg-slate-800/40" : ""} ${idx === cursor ? "shadow-[inset_2px_0_0_var(--color-brand)]" : ""}`}>
                  <td><input type="checkbox" checked={sel.has(i.id)} aria-label={`Select ${i.key}`}
                    onChange={() => setSel((s) => { const n = new Set(s); if (n.has(i.id)) n.delete(i.id); else n.add(i.id); return n; })} /></td>
                  <td><TypeIcon type={i.type} /></td>
                  <td className="whitespace-nowrap"><Link href={`/issues/${i.key}`} className="hover:underline"><IssueKey k={i.key} /></Link></td>
                  <td className="max-w-md">
                    <Link href={`/issues/${i.key}`} className="block truncate hover:underline">{i.title}</Link>
                    {i.labels.length > 0 && <div className="mt-0.5 flex gap-1">{i.labels.map((l) => <LabelChip key={l} name={l} />)}</div>}
                  </td>
                  {showProject && <td className="whitespace-nowrap text-muted">{i.project.name}</td>}
                  <td><StatusPill name={i.status.name} category={i.status.category} /></td>
                  <td><PriorityIcon priority={i.priority} /></td>
                  <td className="text-muted">{i.storyPoints ?? ""}</td>
                  <td className="whitespace-nowrap"><span className="flex items-center gap-2"><Avatar name={i.assignee?.name} size={5} />{i.assignee?.name ?? <span className="text-muted">Unassigned</span>}</span></td>
                  <td className={`whitespace-nowrap text-xs ${i.dueDate && new Date(i.dueDate).getTime() < now && i.status.category !== "DONE" ? "font-semibold text-red-600" : "text-muted"}`}>{i.dueDate?.slice(0, 10)}</td>
                  <td className="whitespace-nowrap text-xs text-muted">{new Date(i.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SaveFilter({ query, projectId }: { query: string; projectId: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  if (!open) return <button className="btn" onClick={() => setOpen(true)}><Bookmark size={14} />Save view</button>;
  return (
    <form className="flex items-center gap-2"
      action={(f) => start(async () => { await saveFilter(String(f.get("name")), query, projectId, f.get("shared") === "on"); setOpen(false); router.refresh(); })}>
      <input name="name" required autoFocus placeholder="Filter name" className="input !w-44 !py-1" />
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="shared" /> Share with team</label>
      <button className="btn-primary !py-1 text-xs" disabled={pending}>Save</button>
      <button type="button" className="btn-ghost text-xs" onClick={() => setOpen(false)}>Cancel</button>
    </form>
  );
}
