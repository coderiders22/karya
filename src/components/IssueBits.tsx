import clsx from "clsx";
import {
  Bug, Check, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, CornerDownRight, Equal, Layers, Bookmark,
} from "lucide-react";
import type { IssueType, Priority, StatusCategory } from "@prisma/client";
import { priorityMeta, typeMeta } from "@/lib/constants";

const TYPE_ICON = { EPIC: Layers, STORY: Bookmark, TASK: Check, BUG: Bug, SUBTASK: CornerDownRight } as const;
const TYPE_BG = { EPIC: "bg-violet-600", STORY: "bg-emerald-600", TASK: "bg-sky-600", BUG: "bg-rose-600", SUBTASK: "bg-slate-500" } as const;

export function TypeIcon({ type, className }: { type: IssueType; className?: string }) {
  const Icon = TYPE_ICON[type];
  return (
    <span title={typeMeta(type).label} className={clsx("inline-grid size-4 shrink-0 place-items-center rounded-[4px] text-white", TYPE_BG[type], className)}>
      <Icon size={10} strokeWidth={3} />
    </span>
  );
}

const PRIO_ICON = { HIGHEST: ChevronsUp, HIGH: ChevronUp, MEDIUM: Equal, LOW: ChevronDown, LOWEST: ChevronsDown } as const;
const PRIO_COLOR = { HIGHEST: "text-rose-600", HIGH: "text-orange-500", MEDIUM: "text-amber-500", LOW: "text-sky-500", LOWEST: "text-sky-700 dark:text-sky-400" } as const;

export function PriorityIcon({ priority, withLabel }: { priority: Priority; withLabel?: boolean }) {
  const Icon = PRIO_ICON[priority];
  return (
    <span title={`${priorityMeta(priority).label} priority`} className="inline-flex items-center gap-1">
      <Icon size={15} strokeWidth={2.4} className={PRIO_COLOR[priority]} />
      {withLabel && <span>{priorityMeta(priority).label}</span>}
    </span>
  );
}

const DOT = { TODO: "bg-slate-400", IN_PROGRESS: "bg-sky-500", DONE: "bg-emerald-500" } as const;
const PILL = {
  TODO: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  IN_PROGRESS: "bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
  DONE: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
} as const;

export function StatusPill({ name, category }: { name: string; category: StatusCategory }) {
  return (
    <span className={clsx("chip whitespace-nowrap", PILL[category])}>
      <span className={clsx("size-1.5 rounded-full", DOT[category])} />
      {name}
    </span>
  );
}

const AVATAR = ["#0e7c66", "#2563eb", "#9333ea", "#c2410c", "#be185d", "#4d7c0f", "#0369a1", "#a16207"];

export function Avatar({ name, size = 6 }: { name?: string | null; size?: 5 | 6 | 8 }) {
  const dims = size === 5 ? "size-5 text-[9px]" : size === 6 ? "size-6 text-[10px]" : "size-8 text-xs";
  if (!name) {
    return <span title="Unassigned" className={clsx("inline-block shrink-0 rounded-full border border-dashed border-slate-400 dark:border-slate-600", dims)} />;
  }
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <span title={name} style={{ background: AVATAR[h % AVATAR.length] }}
      className={clsx("inline-grid shrink-0 select-none place-items-center rounded-full font-semibold text-white", dims)}>
      {initials}
    </span>
  );
}

export function IssueKey({ k, className }: { k: string; className?: string }) {
  return <span className={clsx("font-mono text-[11.5px] text-slate-500 dark:text-slate-400", className)}>{k}</span>;
}

export function EmptyState({ icon: Icon, title, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-3 grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-400 dark:border-slate-800">
        <Icon size={18} />
      </span>
      <div className="text-sm font-medium">{title}</div>
      {children && <div className="mt-1 max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}

/**
 * Each label always gets the same color, everywhere (board, lists, issue page, pickers), picked from
 * its name. Violet is left out on purpose: it marks epics.
 */
const LABEL_TINTS = [
  "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300",
  "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300",
  "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300",
  "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-300",
  "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-300",
  "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800 dark:border-fuchsia-900 dark:bg-fuchsia-950/50 dark:text-fuchsia-300",
  "border-lime-200 bg-lime-50 text-lime-800 dark:border-lime-900 dark:bg-lime-950/50 dark:text-lime-300",
  "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-300",
] as const;
const LABEL_DOTS = ["bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-indigo-500", "bg-teal-500", "bg-orange-500", "bg-fuchsia-500", "bg-lime-500", "bg-cyan-500"] as const;

function labelIndex(name: string) {
  let h = 0;
  for (const c of name.toLowerCase()) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  return h % LABEL_TINTS.length;
}
export const labelDot = (name: string) => LABEL_DOTS[labelIndex(name)];

export function LabelChip({ name, onRemove, className }: { name: string; onRemove?: () => void; className?: string }) {
  return (
    <span className={clsx("inline-flex max-w-full items-center gap-1 rounded border px-1.5 text-[11.5px] font-medium leading-5", LABEL_TINTS[labelIndex(name)], className)}>
      <span className="truncate">{name}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove label ${name}`} className="-mr-0.5 grid size-3.5 place-items-center rounded opacity-60 hover:opacity-100">
          <svg viewBox="0 0 12 12" width="9" height="9" aria-hidden><path d="M3 3l6 6M9 3L3 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      )}
    </span>
  );
}

/** Tinted pill colors for a priority, so it reads at a glance. */
export const PRIORITY_TINT = {
  HIGHEST: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300",
  HIGH: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-300",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  LOW: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300",
  LOWEST: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
} as const;
