"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, KeyboardSensor, closestCorners, pointerWithin, useDroppable, useSensor, useSensors,
  type CollisionDetection, type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { CardIssue, StatusLite, UserLite } from "@/lib/types";
import { moveIssueOnBoard, updateIssueField } from "@/app/actions/issues";
import { toast } from "sonner";
import { CardMenu, type CardAction } from "./CardMenu";
import { IssueCard, daysSince } from "./IssueCard";
import { Avatar } from "./IssueBits";
import { ISSUE_TYPES } from "@/lib/constants";
import { QuickAdd } from "./QuickAdd";
import { Search } from "lucide-react";

type Columns = Record<string, CardIssue[]>;

function group(issues: CardIssue[], statuses: StatusLite[]): Columns {
  const cols: Columns = Object.fromEntries(statuses.map((s) => [s.id, []]));
  for (const i of issues) cols[i.statusId]?.push(i);
  return cols;
}

export function Board({ issues, statuses, users, meId, projectId, sprintId, staleDays }: { issues: CardIssue[]; statuses: StatusLite[]; users: UserLite[]; meId: string; projectId: string; sprintId?: string; staleDays: number }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [cols, setCols] = useState<Columns>(() => group(issues, statuses));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [onlyStuck, setOnlyStuck] = useState(false);
  const [menu, setMenu] = useState<{ issue: CardIssue; x: number; y: number } | null>(null);
  const statusName = (id: string) => statuses.find((s) => s.id === id)?.name ?? "";

  /** Status changes always offer Undo: a mis-drop is the most common board mistake. */
  const changeStatus = (issue: CardIssue, toId: string, fromId: string) => {
    toast.success(`${issue.key} moved to ${statusName(toId)}`, {
      action: { label: "Undo", onClick: () => start(async () => { await updateIssueField(issue.id, "statusId", fromId); toast(`${issue.key} is back in ${statusName(fromId)}`); router.refresh(); }) },
    });
  };

  const onMenuAction = (issue: CardIssue, a: CardAction) => {
    if (a.kind === "peek") {
      const link = document.querySelector<HTMLAnchorElement>(`a[href="/issues/${issue.key}"]`);
      link?.click();
      return;
    }
    if (a.kind === "copy-link") { navigator.clipboard.writeText(`${location.origin}/issues/${issue.key}`); toast.success("Link copied"); return; }
    if (a.kind === "copy-branch") {
      const slug = issue.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
      navigator.clipboard.writeText(`git checkout -b ${issue.key.toLowerCase()}-${slug}`);
      toast.success("Branch command copied");
      return;
    }
    start(async () => {
      if (a.kind === "assign") {
        await updateIssueField(issue.id, "assigneeId", a.userId ?? "");
        toast.success(a.userId ? `${issue.key} assigned to you` : `Unassigned ${issue.key}`);
      }
      if (a.kind === "priority") await updateIssueField(issue.id, "priority", a.value);
      if (a.kind === "status") {
        await updateIssueField(issue.id, "statusId", a.statusId);
        changeStatus(issue, a.statusId, issue.statusId);
      }
      router.refresh();
    });
  };

  useEffect(() => setCols(group(issues, statuses)), [issues, statuses]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Long-press to drag on touch screens, so swiping still scrolls the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visible = (i: CardIssue) =>
    (!q || `${i.key} ${i.title} ${i.labels.join(" ")}`.toLowerCase().includes(q.toLowerCase())) &&
    (people.length === 0 || people.includes(i.assignee?.id ?? "none")) &&
    (types.length === 0 || types.includes(i.type)) &&
    (!onlyStuck || i.blocked || (i.status.category === "IN_PROGRESS" && daysSince(i.statusChangedAt) >= staleDays));

  const findCol = (id: string) => (id in cols ? id : Object.keys(cols).find((c) => cols[c].some((i) => i.id === id)));
  const activeIssue = useMemo(() => Object.values(cols).flat().find((i) => i.id === activeId), [cols, activeId]);

  const dragFrom = useRef<string | null>(null);
  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    setMenu(null);
    dragFrom.current = findCol(String(e.active.id)) ?? null;
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const from = findCol(String(active.id));
    const to = findCol(String(over.id));
    if (!from || !to || from === to) return;
    setCols((prev) => {
      const item = prev[from].find((i) => i.id === active.id)!;
      const overIdx = prev[to].findIndex((i) => i.id === over.id);
      const idx = overIdx >= 0 ? overIdx : prev[to].length;
      const status = statuses.find((s) => s.id === to)!;
      return {
        ...prev,
        [from]: prev[from].filter((i) => i.id !== active.id),
        [to]: [...prev[to].slice(0, idx), { ...item, statusId: to, status, statusChangedAt: new Date().toISOString() }, ...prev[to].slice(idx)],
      };
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;
    const col = findCol(String(active.id));
    if (!col) return;
    let list = cols[col];
    const oldIdx = list.findIndex((i) => i.id === active.id);
    const newIdx = list.findIndex((i) => i.id === over.id);
    if (newIdx >= 0 && oldIdx !== newIdx) list = arrayMove(list, oldIdx, newIdx);
    setCols((prev) => ({ ...prev, [col]: list }));
    const moved = list.find((i) => i.id === active.id);
    const from = dragFrom.current;
    start(async () => {
      await moveIssueOnBoard(String(active.id), col, list.map((i) => i.id));
      if (moved && from && from !== col) changeStatus(moved, col, from);
      router.refresh();
    });
  }

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3" data-tour="board-filters">
        <label className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter cards" className="input !w-52 pl-8" />
        </label>
        <div className="flex -space-x-1">
          {[{ id: meId, name: "Me" }, ...users.filter((u) => u.id !== meId), { id: "none", name: "" }].map((u) => (
            <button
              key={u.id}
              title={u.id === "none" ? "Unassigned" : u.name}
              onClick={() => toggle(people, setPeople, u.id)}
              className={clsx("rounded-full ring-2 transition-transform hover:-translate-y-0.5", people.includes(u.id) ? "z-10 ring-brand" : "ring-white dark:ring-slate-900")}
            >
              <Avatar name={u.id === meId ? users.find((x) => x.id === meId)?.name : u.name || null} />
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {ISSUE_TYPES.filter((t) => t.value !== "EPIC").map((t) => (
            <button key={t.value} onClick={() => toggle(types, setTypes, t.value)}
              className={clsx("btn !h-7 !px-2 text-xs", types.includes(t.value) && "!border-slate-900 !bg-slate-900 !text-white dark:!border-white dark:!bg-white dark:!text-slate-900")}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => setOnlyStuck(!onlyStuck)}
          className={clsx("btn !h-7 !px-2 text-xs", onlyStuck && "!border-amber-500 !bg-amber-50 !text-amber-800 dark:!bg-amber-950/50 dark:!text-amber-300")}
          title={`Blocked, or in progress for ${staleDays}+ days`}>
          Stuck only
        </button>
        {(q || people.length > 0 || types.length > 0 || onlyStuck) && (
          <button className="btn-ghost text-xs" onClick={() => { setQ(""); setPeople([]); setTypes([]); setOnlyStuck(false); }}>Clear</button>
        )}
      </div>
      <div data-peek-scope>
      <DndContext id={`board-${projectId}`} sensors={sensors} collisionDetection={dropWherePointerIs} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:snap-none sm:px-0" data-tour="board-columns">
          {statuses.map((s, i) => (
            <Column key={s.id} status={s} issues={cols[s.id] ?? []} visible={visible} staleDays={staleDays}
              onMenu={(issue, x, y) => setMenu({ issue, x, y })}
              footer={i === 0 ? <QuickAdd projectId={projectId} users={users} meId={meId} sprintId={sprintId} statusId={s.id} /> : null} />
          ))}
        </div>
        <DragOverlay>{activeIssue ? <IssueCard issue={activeIssue} dragging staleDays={staleDays} /> : null}</DragOverlay>
      </DndContext>
      {menu && <CardMenu issue={menu.issue} x={menu.x} y={menu.y} statuses={statuses} meId={meId}
        onAction={(a) => onMenuAction(menu.issue, a)} onClose={() => setMenu(null)} />}
      </div>
    </div>
  );
}

/**
 * A card lands where the pointer is. Comparing the dragged card's outline with each column
 * (closestCorners alone) sometimes picked the neighbouring column on boards that are wider than the
 * screen; it's still used for the keyboard and when the pointer is between columns.
 */
const dropWherePointerIs: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : closestCorners(args);
};

const DOT = { TODO: "bg-slate-400", IN_PROGRESS: "bg-sky-500", DONE: "bg-emerald-500" } as const;

function Column({ status, issues, visible, staleDays, footer, onMenu }: { status: StatusLite; issues: CardIssue[]; visible: (i: CardIssue) => boolean; staleDays: number; footer?: React.ReactNode; onMenu: (i: CardIssue, x: number, y: number) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });
  const shown = issues.filter(visible);
  const over = status.wipLimit != null && issues.length > status.wipLimit;
  return (
    <div className={clsx("flex w-[85vw] max-w-[300px] shrink-0 snap-start flex-col rounded-lg p-1.5 sm:w-[280px] 2xl:w-[300px]", over ? "bg-rose-50 ring-1 ring-rose-200 dark:bg-rose-950/20 dark:ring-rose-900" : "bg-slate-100/80 dark:bg-slate-900/60")}>
      <div className="flex h-8 items-center gap-2 px-2 text-[13px]">
        <span className={clsx("size-2 rounded-full", DOT[status.category])} />
        <span className="font-medium">{status.name}</span>
        <span className={clsx("text-xs tabular-nums", over ? "font-semibold text-rose-600" : "text-slate-500")}
          title={status.wipLimit != null ? `Work-in-progress limit: ${status.wipLimit}` : undefined}>
          {issues.length}{status.wipLimit != null && <span className="text-slate-400"> / {status.wipLimit}</span>}
        </span>
        {over && <span className="ml-auto text-[11px] font-medium text-rose-600">Over limit</span>}
      </div>
      <SortableContext items={shown.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={clsx("flex min-h-24 flex-1 flex-col gap-1.5 rounded-md p-0.5 transition-colors", isOver && "bg-brand/5")}>
          {shown.map((i) => <SortableCard key={i.id} issue={i} staleDays={staleDays} onMenu={onMenu} />)}
        </div>
      </SortableContext>
      {footer && <div className="mt-1" data-tour="quick-add">{footer}</div>}
    </div>
  );
}

function SortableCard({ issue, staleDays, onMenu }: { issue: CardIssue; staleDays: number; onMenu: (i: CardIssue, x: number, y: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-tour="card"
      className={clsx("cursor-grab active:cursor-grabbing", isDragging && "opacity-30")}
      {...attributes}
      {...listeners}
      onContextMenu={(e) => { e.preventDefault(); onMenu(issue, e.clientX, e.clientY); }}
      onKeyDown={(e) => {
        // Shift+F10 / context-menu key opens the menu for keyboard users.
        if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          onMenu(issue, r.left + 12, r.top + 24);
        } else listeners?.onKeyDown?.(e);
      }}
    >
      <IssueCard issue={issue} staleDays={staleDays} />
    </div>
  );
}
