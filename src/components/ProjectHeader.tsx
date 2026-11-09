"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";
import { openCreateIssue } from "./CreateIssueDialog";
import { ProjectBadge } from "./Sidebar";
import { useAccess } from "./Access";
import { Countdown } from "./LocalTime";

const SECTION: Record<string, string> = {
  board: "Board", team: "Team", github: "GitHub", backlog: "Backlog", standup: "Standup", roadmap: "Roadmap", issues: "Issues", reports: "Insights", settings: "Settings",
};

export function ProjectHeader({ project, actions }: { project: { key: string; name: string; color: string; dueAt?: string | null; deadlineLabel?: string }; actions?: React.ReactNode }) {
  const seg = usePathname().split("/")[3] ?? "board";
  const { canEdit } = useAccess();
  return (
    <header className="flex h-12 min-w-0 items-center gap-2 whitespace-nowrap border-b border-slate-200 px-4 text-[13px] sm:px-6 dark:border-slate-800">
      <ProjectBadge p={project} size={18} />
      <Link href={`/projects/${project.key}/board`} className="truncate text-slate-500 hover:text-slate-900 dark:hover:text-white">{project.name}</Link>
      <ChevronRight size={14} className="text-slate-400" />
      <span className="font-medium">{SECTION[seg] ?? seg}</span>
      <div className="flex-1" />
      {project.dueAt && <Countdown iso={project.dueAt} label={project.deadlineLabel} />}
      {actions}
      {canEdit && seg !== "settings" && seg !== "github" && (
        // Opens the full create form for this project. From the board, the new issue goes into the running sprint.
        <button onClick={() => openCreateIssue()} data-tip="New issue  C" aria-label="New issue"
          className="btn-primary !h-7 !px-2 text-xs sm:!px-2.5">
          <Plus size={14} strokeWidth={2.25} /><span className="hidden sm:inline">New issue</span>
        </button>
      )}
    </header>
  );
}
