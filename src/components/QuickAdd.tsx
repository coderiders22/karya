"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { IssueType, Priority } from "@prisma/client";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { createIssue } from "@/app/actions/issues";
import { smartParse } from "@/lib/smartParse";
import { ISSUE_TYPES, PRIORITIES } from "@/lib/constants";
import { Avatar, LabelChip, PRIORITY_TINT, PriorityIcon, TypeIcon } from "./IssueBits";
import { forgetProjectLabels, useProjectLabels, useTitleSuggest } from "./TitleSuggest";

type Picks = { assigneeId?: string; priority?: Priority; type?: IssueType; labels: string[] };
const NONE: Picks = { labels: [] };

/**
 * One-line issue creation on boards and the backlog.
 * While typing: @ teammates, # labels, ! priority, / type (same as the create dialog).
 * What's been chosen shows as colored chips under the box.
 */
export function QuickAdd({ projectId, users, meId, sprintId, statusId, placeholder = "Add an issue…" }: {
  projectId: string; users: { id: string; name: string }[]; meId: string; sprintId?: string; statusId?: string; placeholder?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [active, setActive] = useState(false);
  const [picks, setPicks] = useState<Picks>(NONE);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const labels = useProjectLabels(projectId, active);
  const ts = useTitleSuggest({ input, value, setValue });

  const parsed = smartParse(ts.textForParse, users, meId);
  const eff = {
    assigneeId: picks.assigneeId ?? parsed.assigneeId,
    priority: picks.priority ?? parsed.priority,
    type: picks.type ?? parsed.type,
    labels: [...new Set([...picks.labels, ...parsed.labels])],
  };
  const sg = ts.bind({
    users, meId, labels,
    current: { assigneeId: eff.assigneeId, priority: eff.priority ?? "MEDIUM", type: eff.type ?? "TASK", labels: eff.labels },
    onPick: (p) => setPicks((x) =>
      p.sym === "@" ? { ...x, assigneeId: p.value }
      : p.sym === "#" ? { ...x, labels: x.labels.includes(p.value) ? x.labels : [...x.labels, p.value] }
      : p.sym === "!" ? { ...x, priority: p.value }
      : { ...x, type: p.value }),
  });

  const reset = () => { setValue(""); setPicks(NONE); ts.close(); };
  // Keep typing straight into the next issue after adding one.
  useEffect(() => { if (active && !pending) input.current?.focus(); }, [active, pending]);

  const submit = () => {
    const p = ts.open ? smartParse(value, users, meId) : parsed;
    if (!p.title) return;
    const f = new FormData();
    f.set("projectId", projectId);
    f.set("title", p.title);
    if (eff.type) f.set("type", eff.type);
    if (eff.priority) f.set("priority", eff.priority);
    if (eff.assigneeId) f.set("assigneeId", eff.assigneeId);
    if (eff.labels.length) f.set("labels", eff.labels.join(","));
    if (p.storyPoints != null) f.set("storyPoints", String(p.storyPoints));
    if (p.dueDate) f.set("dueDate", p.dueDate);
    if (p.parentKey) f.set("parentKey", p.parentKey);
    if (sprintId) f.set("sprintId", sprintId);
    else if (p.sprint) f.set("activeSprint", "1");
    if (statusId) f.set("statusId", statusId);
    // Clear the box straight away so the next title can be typed while this one saves;
    // if saving fails, the text and picks come back.
    const before = { value, picks };
    const newLabels = eff.labels.some((l) => !labels.includes(l));
    reset();
    start(async () => {
      const r = await createIssue(f);
      if (r.error) {
        setValue(before.value); setPicks(before.picks);
        return void toast.error(r.error);
      }
      if (newLabels) forgetProjectLabels(projectId);
      toast.success(`Created ${r.key}`);
      router.refresh();
    });
  };

  if (!active) {
    return (
      <button onClick={() => setActive(true)} className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-[13px] text-slate-500 transition-colors hover:bg-slate-200/50 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200">
        <Plus size={14} />{placeholder}
      </button>
    );
  }

  const user = users.find((u) => u.id === eff.assigneeId);
  const ring = (fromText: boolean) => fromText && "ring-2 ring-brand/25";
  const chip = "inline-flex h-6 items-center gap-1 rounded border px-1.5 text-[11.5px] font-medium";
  const remove = (k: keyof Picks) => (
    <button type="button" aria-label="Remove" onMouseDown={(e) => e.preventDefault()}
      onClick={() => setPicks((x) => ({ ...x, [k]: k === "labels" ? [] : undefined }))} className="-mr-0.5 opacity-50 hover:opacity-100">
      <X size={11} strokeWidth={2.5} />
    </button>
  );
  const hasChips = !!(eff.type || eff.priority || user || eff.labels.length);
  const canAdd = !!(ts.open ? smartParse(value, users, meId) : parsed).title && !pending;
  const cancel = () => { reset(); setActive(false); };

  return (
    <div>
      <input
        ref={input}
        autoFocus
        value={value}
        aria-busy={pending}
        onChange={ts.onChange}
        onKeyUp={ts.onKeyUp}
        onBlur={() => { setTimeout(ts.close, 120); if (!value && !hasChips) setActive(false); }}
        onKeyDown={(e) => {
          if (sg.handleKey(e)) return;
          if (e.key === "Enter") { e.preventDefault(); submit(); }
          if (e.key === "Escape") cancel();
        }}
        aria-label="New issue title"
        aria-autocomplete="list"
        aria-expanded={sg.expanded}
        autoComplete="off"
        placeholder="Title, then @ assign  # label  ! priority"
        className="input"
      />
      {sg.menu}
      {hasChips ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {eff.type && (
            <span className={clsx(chip, "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", ring(!picks.type))}>
              <TypeIcon type={eff.type} className="!size-3.5" />{ISSUE_TYPES.find((t) => t.value === eff.type)?.label}{picks.type && remove("type")}
            </span>
          )}
          {eff.priority && (
            <span className={clsx(chip, PRIORITY_TINT[eff.priority], ring(!picks.priority))}>
              <PriorityIcon priority={eff.priority} />{PRIORITIES.find((p) => p.value === eff.priority)?.label}{picks.priority && remove("priority")}
            </span>
          )}
          {user && (
            <span className={clsx(chip, "border-slate-200 bg-white pl-0.5 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", ring(!picks.assigneeId))}>
              <Avatar name={user.name} size={5} />{user.id === meId ? "Me" : user.name.split(" ")[0]}{picks.assigneeId && remove("assigneeId")}
            </span>
          )}
          {eff.labels.map((l) => (
            <LabelChip key={l} name={l} className={clsx("!leading-[22px]", ring(!picks.labels.includes(l)))}
              onRemove={picks.labels.includes(l) ? () => setPicks((x) => ({ ...x, labels: x.labels.filter((y) => y !== l) })) : undefined} />
          ))}
        </div>
      ) : null}
      {/* Buttons for people who don't use Enter / Esc. mouseDown is cancelled so the box keeps focus. */}
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate px-1 text-[11px] text-muted"><span className="kbd !h-4 !text-[10px]">↵</span> to add</span>
        <button type="button" className="btn-ghost !h-7 !px-2 text-xs" onMouseDown={(e) => e.preventDefault()} onClick={cancel}>Cancel</button>
        <button type="button" className="btn-primary !h-7 !px-2.5 text-xs" disabled={!canAdd} onMouseDown={(e) => e.preventDefault()} onClick={submit}>
          {pending ? "Adding…" : "Add issue"}
        </button>
      </div>
    </div>
  );
}
