import Link from "next/link";
import clsx from "clsx";
import { Ban, CalendarClock, Hourglass } from "lucide-react";
import type { CardIssue } from "@/lib/types";
import { Avatar, IssueKey, PriorityIcon, TypeIcon, LabelChip } from "./IssueBits";

const DAY = 86400000;

export function daysSince(iso: string, now = Date.now()) {
  return Math.floor((now - new Date(iso).getTime()) / DAY);
}

export function IssueCard({ issue, dragging, staleDays = 3 }: { issue: CardIssue; dragging?: boolean; staleDays?: number }) {
  const age = daysSince(issue.statusChangedAt);
  const stale = issue.status.category === "IN_PROGRESS" && age >= staleDays;
  const overdue = issue.dueDate && new Date(issue.dueDate).getTime() < Date.now() - DAY && issue.status.category !== "DONE";
  return (
    <div
      className={clsx(
        "rounded-lg border bg-white p-3 text-[13px] transition-[transform,box-shadow,border-color] duration-200 ease-out-quint dark:bg-slate-900",
        dragging ? "rotate-[1.5deg] scale-[1.02] border-brand/50 shadow-xl" : "border-slate-200 shadow-xs hover:-translate-y-px hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:hover:border-slate-700",
        stale && "border-l-2 border-l-amber-500",
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <TypeIcon type={issue.type} />
        <IssueKey k={issue.key} />
        {issue.blocked && (
          <span className="chip bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" title="Blocked by an open issue">
            <Ban size={11} /> Blocked
          </span>
        )}
        <div className="flex-1" />
        <PriorityIcon priority={issue.priority} />
      </div>
      <Link href={`/issues/${issue.key}`} className="block font-medium leading-snug text-slate-900 hover:underline dark:text-slate-100" onPointerDown={(e) => e.stopPropagation()}>
        {issue.title}
      </Link>
      {(issue.parent || issue.labels.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {issue.parent && <span className="tag max-w-full truncate !border-violet-200 !text-violet-700 dark:!border-violet-900 dark:!text-violet-300">{issue.parent.title}</span>}
          {issue.labels.map((l) => <LabelChip key={l} name={l} />)}
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-2 text-[11.5px] text-slate-500 dark:text-slate-400">
        {issue.status.category !== "DONE" && (
          <span className={clsx("inline-flex items-center gap-1", stale && "font-medium text-amber-600 dark:text-amber-400")}
            title={`${age === 0 ? "Moved here today" : `In "${issue.status.name}" for ${age} day${age === 1 ? "" : "s"}`}${stale ? " · looks stuck" : ""}`}>
            <Hourglass size={11} />{age === 0 ? "today" : `${age}d`}
          </span>
        )}
        {issue.dueDate && (
          <span className={clsx("inline-flex items-center gap-1", overdue && "font-medium text-rose-600 dark:text-rose-400")}>
            <CalendarClock size={11} />{new Date(issue.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        )}
        <div className="flex-1" />
        {issue.storyPoints != null && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-slate-100 px-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{issue.storyPoints}</span>
        )}
        <Avatar name={issue.assignee?.name} size={5} />
      </div>
    </div>
  );
}
