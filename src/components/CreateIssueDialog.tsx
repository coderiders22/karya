"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { IssueType, Priority } from "@prisma/client";
import { CalendarDays, Check, CornerDownLeft, X } from "lucide-react";
import { toast } from "sonner";
import { createIssue } from "@/app/actions/issues";
import { getCreateContext } from "@/app/actions/labels";
import { smartParse } from "@/lib/smartParse";
import { AssigneePicker, LabelPicker, PriorityPicker, TypePicker } from "./Pickers";
import { forgetProjectLabels, useTitleSuggest } from "./TitleSuggest";
import { useAccess } from "./Access";

export type ShellProject = { id: string; key: string; name: string };
export type ShellUser = { id: string; name: string };
export type CreateDetail = { projectId?: string; parentId?: string; parentKey?: string; sprintId?: string; type?: string; statusId?: string };

/** Open from anywhere with: openCreateIssue({ projectId }) */
export function openCreateIssue(detail: CreateDetail = {}) {
  window.dispatchEvent(new CustomEvent<CreateDetail>("trackr:create", { detail }));
}

type Fields = { type: IssueType; priority: Priority; assigneeId: string; storyPoints: string; parentKey: string; dueDate: string };
const EMPTY: Fields = { type: "TASK", priority: "MEDIUM", assigneeId: "", storyPoints: "", parentKey: "", dueDate: "" };

export function CreateIssueDialog({ projects, users, meId }: { projects: ShellProject[]; users: ShellUser[]; meId: string }) {
  const { canEdit } = useAccess();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<CreateDetail>({});
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [touched, setTouched] = useState<Set<keyof Fields>>(new Set());
  const [labels, setLabels] = useState<string[]>([]);
  const [inSprint, setInSprint] = useState(false);
  const [ctx, setCtx] = useState<Record<string, { labels: string[]; activeSprint: string | null; people: ShellUser[] }>>({});
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const [another, setAnother] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const fromBoard = useRef(false);
  const ts = useTitleSuggest({ input: titleRef, value: title, setValue: setTitle });

  // While a suggestion menu is open, the half-typed "#fro" is ignored, so it can't show up as a label of its own.
  const project = ctx[projectId];
  // Only the people on the chosen project, so nobody assigns work to someone who can't see it.
  const people = project?.people ?? users;
  const parsed = useMemo(() => smartParse(ts.textForParse, people, meId), [ts.textForParse, people, meId]);

  // Load the project's labels and running sprint (once per project).
  useEffect(() => {
    if (!open || !projectId || ctx[projectId]) return;
    getCreateContext(projectId).then((c) => {
      setCtx((m) => ({ ...m, [projectId]: c }));
      // Created from that project's board: it should land on the board, i.e. in the running sprint.
      if (c.activeSprint && fromBoard.current) setInSprint(true);
    }).catch(() => {});
  }, [open, projectId, ctx]);

  // Values typed inline win over defaults, but not over a field the person changed by hand.
  const pick = <K extends keyof Fields>(k: K, fromTitle: Fields[K] | undefined) => (touched.has(k) || fromTitle == null ? fields[k] : fromTitle);
  const auto = (k: keyof Fields, fromTitle: unknown) => !touched.has(k) && fromTitle != null;
  const effective: Fields = {
    type: pick("type", parsed.type),
    priority: pick("priority", parsed.priority),
    assigneeId: pick("assigneeId", parsed.assigneeId),
    storyPoints: pick("storyPoints", parsed.storyPoints?.toString()),
    parentKey: pick("parentKey", parsed.parentKey),
    dueDate: pick("dueDate", parsed.dueDate),
  };
  const allLabels = [...new Set([...labels, ...parsed.labels])];
  const sprintOn = inSprint || parsed.sprint === "active";
  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => {
    setFields((f) => ({ ...f, [k]: v }));
    setTouched((t) => new Set(t).add(k));
  };

  useEffect(() => {
    const onCreate = (e: Event) => {
      const d = (e as CustomEvent<CreateDetail>).detail ?? {};
      const here = projects.find((p) => location.pathname.startsWith(`/projects/${p.key}`));
      const pid = d.projectId ?? here?.id ?? projects[0]?.id ?? "";
      fromBoard.current = !!here && here.id === pid && /\/board$/.test(location.pathname) && !d.sprintId;
      setDetail(d);
      setProjectId(pid);
      setTitle("");
      setDescription("");
      setFields({ ...EMPTY, type: (d.type as IssueType) ?? (d.parentId ? "SUBTASK" : "TASK"), parentKey: d.parentKey ?? "" });
      setTouched(new Set(d.type ? ["type"] : []));
      setLabels([]);
      setInSprint(false);
      setCtx((m) => { const { [pid]: _, ...rest } = m; return rest; }); // fresh labels each time
      ts.close();
      setError(undefined);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (canEdit && e.key === "c" && !e.metaKey && !e.ctrlKey && !e.altKey && !t.closest("input,textarea,select,[contenteditable]")) {
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
        <p className="text-sm">Start a project first. Tasks always belong to a project.</p>
        <div className="mt-4 flex justify-end"><button className="btn" onClick={() => setOpen(false)}>OK</button></div>
      </Modal>
    );
  }

  // ---- Title suggestions: @ people, # labels, ! priority, / type ----
  const sg = ts.bind({
    users: people, meId, labels: project?.labels ?? [],
    current: { assigneeId: effective.assigneeId, priority: effective.priority, type: effective.type, labels: allLabels },
    onPick: (p) => {
      if (p.sym === "@") set("assigneeId", p.value);
      else if (p.sym === "#") setLabels((l) => (l.includes(p.value) ? l : [...l, p.value]));
      else if (p.sym === "!") set("priority", p.value);
      else set("type", p.value);
    },
  });

  // A # label typed in the title is removed by taking its text out of the title.
  const removeTypedLabel = (l: string) => {
    setTitle((t) => t.replace(new RegExp(`(^|\\s)#${l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`, "i"), "").replace(/\s{2,}/g, " "));
    setLabels((x) => x.filter((y) => y !== l));
  };

  function submit() {
    const finalTitle = ts.open ? smartParse(title, people, meId).title : parsed.title;
    if (!finalTitle.trim()) return setError("Give the issue a title");
    const form = new FormData();
    form.set("projectId", projectId);
    form.set("title", finalTitle);
    form.set("description", description);
    for (const [k, v] of Object.entries(effective)) if (v) form.set(k, String(v));
    if (allLabels.length) form.set("labels", allLabels.join(","));
    if (sprintOn && !detail.sprintId) form.set("activeSprint", "1");
    if (detail.parentId) form.set("parentId", detail.parentId);
    if (detail.sprintId) form.set("sprintId", detail.sprintId);
    if (detail.statusId) form.set("statusId", detail.statusId);
    start(async () => {
      const res = await createIssue(form);
      if (res.error) return setError(res.error);
      if (allLabels.length) forgetProjectLabels(projectId);
      toast.success(`Created ${res.key}`, { action: { label: "Open", onClick: () => router.push(`/issues/${res.key}`) } });
      router.refresh();
      if (another) {
        setTitle(""); setDescription(""); setError(undefined); setLabels([]);
        titleRef.current?.focus();
      } else setOpen(false);
    });
  }

  const sym = (s: string) => <kbd className="mx-px rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{s}</kbd>;

  return (
    <Modal onClose={() => setOpen(false)} wide>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="mb-3 flex items-center gap-2">
          <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setLabels([]); setInSprint(false); }} className="select !h-7 !w-auto !py-0 text-xs" aria-label="Project">
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span className="text-xs text-muted">/ New issue</span>
          <div className="flex-1" />
          <button type="button" className="btn-icon !size-7" onClick={() => setOpen(false)} aria-label="Close"><X size={15} /></button>
        </div>

        <div className="relative">
          <input
            ref={titleRef}
            value={title}
            onChange={ts.onChange}
            onKeyDown={(e) => { sg.handleKey(e); }}
            onKeyUp={ts.onKeyUp}
            onBlur={() => setTimeout(ts.close, 120)}
            autoFocus
            maxLength={300}
            className="w-full bg-transparent text-lg font-medium outline-none placeholder:text-slate-400"
            placeholder="Issue title"
            aria-label="Title"
            aria-autocomplete="list"
            aria-expanded={sg.expanded}
            autoComplete="off"
          />
          {sg.menu}
        </div>
        <p className="mt-1 min-h-5 text-xs text-muted">
          Type {sym("@")} to assign, {sym("#")} to label, {sym("!")} for priority, {sym("/")} for type. <span className="hidden sm:inline">Also works: {sym("3pts")} {sym("due:fri")}</span>
        </p>

        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
          className="mt-3 w-full resize-y bg-transparent text-[13.5px] outline-none placeholder:text-slate-400"
          placeholder="Add a description… (Markdown supported)" />

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
          <TypePicker value={effective.type} onChange={(v) => set("type", v)} auto={auto("type", parsed.type)} />
          <PriorityPicker value={effective.priority} onChange={(v) => set("priority", v)} auto={auto("priority", parsed.priority)} />
          <AssigneePicker value={effective.assigneeId} onChange={(v) => set("assigneeId", v)} users={people} meId={meId} auto={auto("assigneeId", parsed.assigneeId)} />
          <Pill label="Estimate" auto={auto("storyPoints", parsed.storyPoints)}>
            <input type="number" min={0} value={effective.storyPoints} onChange={(e) => set("storyPoints", e.target.value)} className="pill-select w-10" placeholder="–" aria-label="Estimate in points" />
            <span className="text-muted">pts</span>
          </Pill>
          <Pill label={<CalendarDays size={12} />} auto={auto("dueDate", parsed.dueDate)}>
            <input type="date" value={effective.dueDate} onChange={(e) => set("dueDate", e.target.value)} className="pill-select" aria-label="Due date" />
          </Pill>
          {!detail.parentId && (
            <Pill label="Parent" auto={auto("parentKey", parsed.parentKey)}>
              <input value={effective.parentKey} onChange={(e) => set("parentKey", e.target.value)} className="pill-select w-20 font-mono uppercase" placeholder="key" aria-label="Parent issue key" />
            </Pill>
          )}
          {project?.activeSprint && !detail.sprintId && (
            <button type="button" onClick={() => setInSprint(!sprintOn)} aria-pressed={sprintOn}
              title={sprintOn ? `In ${project.activeSprint}: shows on the board` : "Goes to the backlog. Click to add it to the running sprint."}
              className={clsx("inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors",
                sprintOn ? "border-brand/40 bg-brand/10 text-brand" : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400")}>
              <span className={clsx("grid size-3.5 place-items-center rounded-[4px] border", sprintOn ? "border-brand bg-brand text-white" : "border-slate-300 dark:border-slate-600")}>
                {sprintOn && <Check size={10} strokeWidth={3.5} />}
              </span>
              {project.activeSprint}
            </button>
          )}
        </div>
        <div className="mt-2">
          <LabelPicker value={labels} onChange={setLabels} all={project?.labels ?? []} auto={parsed.labels} onRemoveAuto={removeTypedLabel} />
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

function Pill({ label, children, auto }: { label: React.ReactNode; children: React.ReactNode; auto?: boolean }) {
  return (
    <label className={clsx("flex h-7 items-center gap-1.5 rounded-md border border-slate-200 pl-2 pr-1 text-xs text-muted transition-colors focus-within:border-brand hover:border-slate-300 dark:border-slate-700", auto && "ring-2 ring-brand/30")}>
      {label}
      <span className="flex items-center gap-1 text-slate-900 dark:text-slate-100">{children}</span>
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
