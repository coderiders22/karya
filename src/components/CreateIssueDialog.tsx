"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CalendarDays, CornerDownLeft, X } from "lucide-react";
import { toast } from "sonner";
import { createIssue } from "@/app/actions/issues";
import { ISSUE_TYPES, PRIORITIES } from "@/lib/constants";
import { smartParse } from "@/lib/smartParse";

export type ShellProject = { id: string; key: string; name: string };
export type ShellUser = { id: string; name: string };
export type CreateDetail = { projectId?: string; parentId?: string; parentKey?: string; sprintId?: string; type?: string; statusId?: string };

/** Open from anywhere with: openCreateIssue({ projectId }) */
export function openCreateIssue(detail: CreateDetail = {}) {
  window.dispatchEvent(new CustomEvent<CreateDetail>("trackr:create", { detail }));
}

type Fields = { type: string; priority: string; assigneeId: string; labels: string; storyPoints: string; parentKey: string; dueDate: string; activeSprint: boolean };
const EMPTY: Fields = { type: "TASK", priority: "MEDIUM", assigneeId: "", labels: "", storyPoints: "", parentKey: "", dueDate: "", activeSprint: false };

export function CreateIssueDialog({ projects, users, meId }: { projects: ShellProject[]; users: ShellUser[]; meId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<CreateDetail>({});
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [touched, setTouched] = useState<Set<keyof Fields>>(new Set());
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const [another, setAnother] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => smartParse(title, users, meId), [title, users, meId]);

  // Values typed inline win over defaults, but not over a field the user changed by hand.
  const effective: Fields = {
    type: touched.has("type") ? fields.type : parsed.type ?? fields.type,
    priority: touched.has("priority") ? fields.priority : parsed.priority ?? fields.priority,
    assigneeId: touched.has("assigneeId") ? fields.assigneeId : parsed.assigneeId ?? fields.assigneeId,
    labels: touched.has("labels") ? fields.labels : [fields.labels, ...parsed.labels].filter(Boolean).join(", "),
    storyPoints: touched.has("storyPoints") ? fields.storyPoints : parsed.storyPoints?.toString() ?? fields.storyPoints,
    parentKey: touched.has("parentKey") ? fields.parentKey : parsed.parentKey ?? fields.parentKey,
    dueDate: touched.has("dueDate") ? fields.dueDate : parsed.dueDate ?? fields.dueDate,
    activeSprint: fields.activeSprint || parsed.sprint === "active",
  };
  const set = (k: keyof Fields, v: string | boolean) => {
    setFields((f) => ({ ...f, [k]: v }));
    setTouched((t) => new Set(t).add(k));
  };

  useEffect(() => {
    const onCreate = (e: Event) => {
      const d = (e as CustomEvent<CreateDetail>).detail ?? {};
      const fromUrl = projects.find((p) => location.pathname.startsWith(`/projects/${p.key}`))?.id;
      setDetail(d);
      setProjectId(d.projectId ?? fromUrl ?? projects[0]?.id ?? "");
      setTitle("");
      setDescription("");
      setFields({ ...EMPTY, type: d.type ?? (d.parentId ? "SUBTASK" : "TASK"), parentKey: d.parentKey ?? "" });
      setTouched(new Set(d.type ? ["type"] : []));
      setError(undefined);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "c" && !e.metaKey && !e.ctrlKey && !e.altKey && !t.closest("input,textarea,select,[contenteditable]")) {
        e.preventDefault();
        onCreate(new CustomEvent("x", { detail: {} }));
      }
    };
    window.addEventListener("trackr:create", onCreate);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("trackr:create", onCreate);
      window.removeEventListener("keydown", onKey);
    };
  }, [projects]);

  if (!open) return null;
  if (projects.length === 0) {
    return (
      <Modal onClose={() => setOpen(false)}>
        <p className="text-sm">Create a project first. Issues always belong to a project.</p>
        <div className="mt-4 flex justify-end"><button className="btn" onClick={() => setOpen(false)}>OK</button></div>
      </Modal>
    );
  }

  function submit() {
    if (!parsed.title.trim()) return setError("Give the issue a title");
    const form = new FormData();
    form.set("projectId", projectId);
    form.set("title", parsed.title);
    form.set("description", description);
    for (const [k, v] of Object.entries(effective)) if (v && k !== "activeSprint") form.set(k, String(v));
    if (effective.activeSprint) form.set("activeSprint", "1");
    if (detail.parentId) form.set("parentId", detail.parentId);
    if (detail.sprintId) form.set("sprintId", detail.sprintId);
    if (detail.statusId) form.set("statusId", detail.statusId);
    start(async () => {
      const res = await createIssue(form);
      if (res.error) return setError(res.error);
      toast.success(`Created ${res.key}`, { action: { label: "Open", onClick: () => router.push(`/issues/${res.key}`) } });
      router.refresh();
      if (another) {
        setTitle(""); setDescription(""); setError(undefined);
        titleRef.current?.focus();
      } else setOpen(false);
    });
  }

  const chips = [
    parsed.type && ISSUE_TYPES.find((t) => t.value === parsed.type)?.label,
    parsed.assigneeName && `@${parsed.assigneeName}`,
    parsed.priority && `${PRIORITIES.find((p) => p.value === parsed.priority)?.label} priority`,
    ...parsed.labels.map((l) => `#${l}`),
    parsed.storyPoints != null && `${parsed.storyPoints} pts`,
    parsed.dueDate && `due ${new Date(parsed.dueDate + "T00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`,
    parsed.parentKey && `in ${parsed.parentKey}`,
    parsed.sprint && "active sprint",
  ].filter(Boolean) as string[];

  return (
    <Modal onClose={() => setOpen(false)} wide>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="mb-3 flex items-center gap-2">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="select !h-7 !w-auto !py-0 text-xs" aria-label="Project">
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span className="text-xs text-muted">/ New issue</span>
          <div className="flex-1" />
          <button type="button" className="btn-icon !size-7" onClick={() => setOpen(false)} aria-label="Close"><X size={15} /></button>
        </div>

        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          maxLength={300}
          className="w-full bg-transparent text-lg font-medium outline-none placeholder:text-slate-400"
          placeholder="Issue title"
          aria-label="Title"
        />
        <div className="mt-1 flex min-h-6 flex-wrap items-center gap-1.5 text-xs">
          {chips.length > 0 ? (
            <>
              <span className="text-muted">Detected</span>
              {chips.map((c) => <span key={c} className="tag !border-brand/30 !text-brand">{c}</span>)}
            </>
          ) : (
            <span className="text-muted">
              Tip: type <code className="font-mono">@sam</code> <code className="font-mono">!high</code> <code className="font-mono">#ui</code>{" "}
              <code className="font-mono">3pts</code> <code className="font-mono">due:fri</code> <code className="font-mono">bug</code> in the title to fill fields.
            </span>
          )}
        </div>

        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
          className="mt-3 w-full resize-y bg-transparent text-[13.5px] outline-none placeholder:text-slate-400"
          placeholder="Add a description… (Markdown supported)" />

        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
          <Pill label="Type"><select value={effective.type} onChange={(e) => set("type", e.target.value)} className="pill-select">
            {ISSUE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Pill>
          <Pill label="Priority"><select value={effective.priority} onChange={(e) => set("priority", e.target.value)} className="pill-select">
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></Pill>
          <Pill label="Assignee"><select value={effective.assigneeId} onChange={(e) => set("assigneeId", e.target.value)} className="pill-select">
            <option value="">Unassigned</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.id === meId ? `${u.name} (me)` : u.name}</option>)}</select></Pill>
          <Pill label="Estimate"><input type="number" min={0} value={effective.storyPoints} onChange={(e) => set("storyPoints", e.target.value)} className="pill-select w-14" placeholder="–" /></Pill>
          <Pill label={<CalendarDays size={12} />}><input type="date" value={effective.dueDate} onChange={(e) => set("dueDate", e.target.value)} className="pill-select" /></Pill>
          <Pill label="Labels"><input value={effective.labels} onChange={(e) => set("labels", e.target.value)} className="pill-select w-28" placeholder="none" /></Pill>
          {!detail.parentId && (
            <Pill label="Parent"><input value={effective.parentKey} onChange={(e) => set("parentKey", e.target.value)} className="pill-select w-20 font-mono uppercase" placeholder="key" /></Pill>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={another} onChange={(e) => setAnother(e.target.checked)} /> Create more
          </label>
          <div className="flex gap-2">
            <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={pending}>{pending ? "Creating…" : <>Create issue <CornerDownLeft size={13} className="opacity-70" /></>}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function Pill({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="flex h-7 items-center gap-1.5 rounded-md border border-slate-200 pl-2 text-xs text-muted transition-colors focus-within:border-brand hover:border-slate-300 dark:border-slate-700">
      {label}
      <span className="text-slate-900 dark:text-slate-100">{children}</span>
    </label>
  );
}

export function Modal({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  // Portal so page-level transforms (page transition) can't shrink the overlay to the content area.
  return createPortal(
    <div className="fixed inset-0 z-50 flex animate-fade items-start justify-center overflow-y-auto bg-slate-950/45 p-4 pt-[12vh] backdrop-blur-[3px]" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" className={`card w-full animate-pop p-5 !shadow-xl ${wide ? "max-w-2xl" : "max-w-md"}`} onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
