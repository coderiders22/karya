import clsx from "clsx";
import {
  Bug, Check, CornerDownRight, Layers, Bookmark,
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

/**
 * Priority icons in the "signal bars" style: more filled bars, higher priority.
 * Highest is a solid red square with "!", so it stands out on a busy board.
 */
const PRIO_COLOR = {
  HIGHEST: "text-rose-600 dark:text-rose-500",
  HIGH: "text-orange-500",
  MEDIUM: "text-amber-500",
  LOW: "text-sky-500",
  LOWEST: "text-slate-400 dark:text-slate-500",
} as const;
const FILLED = { HIGHEST: 3, HIGH: 3, MEDIUM: 2, LOW: 1, LOWEST: 0 } as const;

export function PriorityGlyph({ priority, size = 16, className }: { priority: Priority; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden className={clsx("shrink-0", PRIO_COLOR[priority], className)}>
      {priority === "HIGHEST" ? (
        <>
          <rect x="1.5" y="1.5" width="13" height="13" rx="3.5" fill="currentColor" />
          <rect x="7.1" y="4.2" width="1.8" height="5" rx="0.9" fill="#fff" />
          <circle cx="8" cy="11.35" r="1.05" fill="#fff" />
        </>
      ) : (
        [[2, 9, 5], [6.5, 6, 8], [11, 3, 11]].map(([x, y, h], i) => (
          <rect key={i} x={x} y={y} width="3" height={h} rx="1" fill="currentColor" opacity={i < FILLED[priority] ? 1 : 0.22} />
        ))
      )}
    </svg>
  );
}

export function PriorityIcon({ priority, withLabel }: { priority: Priority; withLabel?: boolean }) {
  return (
    <span title={`${priorityMeta(priority).label} priority`} className="inline-flex items-center gap-1">
      <PriorityGlyph priority={priority} size={15} />
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

// Label chips read the team's chosen colors, so they live in a client component.
export { LabelChip, LabelDot } from "./LabelColors";

/** Tinted pill colors for a priority, so it reads at a glance. */
export const PRIORITY_TINT = {
  HIGHEST: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300",
  HIGH: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-300",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  LOW: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300",
  LOWEST: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
} as const;
