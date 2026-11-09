import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getProjectByKey } from "@/lib/project";
import { loadCards } from "@/lib/cards";
import { commitmentCheck } from "@/lib/forecast";
import type { CardIssue } from "@/lib/types";
import { Avatar, IssueKey, PriorityIcon, StatusPill, TypeIcon } from "@/components/IssueBits";
import { CreateSprintButton, MoveToSprint } from "@/components/BacklogClient";
import { SprintHeaderActions } from "@/components/SprintControls";
import { LiveRefresh } from "@/components/BoardSync";
import { canEdit, canManageProject, projectPeople } from "@/lib/permissions";
import { QuickAdd } from "@/components/QuickAdd";

export default async function BacklogPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const me = await requireUser();
  const project = await getProjectByKey(key);
  const canManage = canManageProject(me, project);
  const [sprints, issues, users, closed] = await Promise.all([
    db.sprint.findMany({ where: { projectId: project.id, state: { not: "CLOSED" } }, orderBy: { createdAt: "asc" } }),
    loadCards({ projectId: project.id, type: { notIn: ["EPIC", "SUBTASK"] }, OR: [{ sprintId: null }, { sprint: { state: { not: "CLOSED" } } }] }),
    db.user.findMany({ where: projectPeople(project), select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.sprint.findMany({
      where: { projectId: project.id, state: "CLOSED" },
      orderBy: { endDate: "desc" },
      take: 3,
      include: { issues: { where: { status: { category: "DONE" } }, select: { storyPoints: true } } },
    }),
  ]);
  sprints.sort((a, b) => Number(b.state === "ACTIVE") - Number(a.state === "ACTIVE"));
  const hasActive = sprints.some((s) => s.state === "ACTIVE");
  const sprintOptions = sprints.map((s) => ({ id: s.id, name: s.name }));
  const backlog = issues.filter((i) => !i.sprintId);
  const velocity = closed.map((s) => s.issues.reduce((n, i) => n + (i.storyPoints ?? 0), 0));

  return (
    <main data-peek-scope className="max-w-5xl space-y-4 p-4 sm:p-6">
      <LiveRefresh projectKey={project.key} />
      {sprints.map((s) => {
        const list = issues.filter((i) => i.sprintId === s.id);
        const points = list.reduce((n, i) => n + (i.storyPoints ?? 0), 0);
        const check = s.state === "FUTURE" ? commitmentCheck(points, velocity) : null;
        return (
          <section key={s.id} className="card overflow-hidden">
            <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-slate-50/60 px-3 py-2.5 sm:px-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {s.name}
                  {s.state === "ACTIVE" && <span className="chip bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">Active</span>}
                </div>
                <div className="text-xs text-muted">
                  {list.length} issues · {points} pts
                  {s.startDate && s.endDate && <> · {s.startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {s.endDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</>}
                  {s.goal && <> · {s.goal}</>}
                </div>
              </div>
              {check && (
                <span className={`inline-flex items-center gap-1 text-xs ${check.over ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted"}`}
                  title={`Average completed in the last ${velocity.length} sprints: ${check.avg} pts`}>
                  {check.over && <TriangleAlert size={13} />}
                  {check.pct}% of usual velocity
                </span>
              )}
              {canManage && <SprintHeaderActions
                sprint={{ id: s.id, name: s.name, goal: s.goal, state: s.state, endDate: s.endDate?.toISOString() ?? null }}
                canStart={!hasActive}
                issueCount={list.length}
              />}
            </header>
            <IssueRows issues={list} sprints={sprintOptions} />
            {canEdit(me.role) && <div className="p-1.5"><QuickAdd projectId={project.id} users={users} meId={me.id} sprintId={s.id} /></div>}
          </section>
        );
      })}

      <section className="card overflow-hidden">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/60 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex-1">
            <div className="text-sm font-semibold">Backlog</div>
            <div className="text-xs text-muted">{backlog.length} issues · {backlog.reduce((n, i) => n + (i.storyPoints ?? 0), 0)} pts</div>
          </div>
          {canManage && <CreateSprintButton projectId={project.id} />}
        </header>
        <IssueRows issues={backlog} sprints={sprintOptions} />
        {canEdit(me.role) && <div className="p-1.5"><QuickAdd projectId={project.id} users={users} meId={me.id} /></div>}
      </section>
    </main>
  );
}

function IssueRows({ issues, sprints }: { issues: CardIssue[]; sprints: { id: string; name: string }[] }) {
  if (issues.length === 0) return <p className="px-4 py-5 text-center text-[13px] text-muted">No issues yet.</p>;
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {issues.map((i) => (
        <li key={i.id} className="flex h-11 items-center gap-2.5 px-3 text-[13px] sm:h-10 sm:gap-3 sm:px-4 hover:bg-slate-50 dark:hover:bg-slate-800/40">
          <TypeIcon type={i.type} />
          <Link href={`/issues/${i.key}`} className="hidden w-16 shrink-0 hover:underline sm:block"><IssueKey k={i.key} /></Link>
          <Link href={`/issues/${i.key}`} className="min-w-0 flex-1 truncate hover:underline">{i.title}</Link>
          {i.blocked && <span className="chip bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">Blocked</span>}
          {i.parent && <span className="tag hidden max-w-40 truncate !border-violet-200 !text-violet-700 lg:inline dark:!border-violet-900 dark:!text-violet-300">{i.parent.title}</span>}
          <span className="hidden md:inline-flex"><StatusPill name={i.status.name} category={i.status.category} /></span>
          <span className="hidden sm:block"><MoveToSprint issueId={i.id} current={i.sprintId} sprints={sprints} /></span>
          <span className="hidden w-6 text-center sm:inline-block text-xs tabular-nums text-muted">{i.storyPoints ?? "–"}</span>
          <PriorityIcon priority={i.priority} />
          <Avatar name={i.assignee?.name} size={5} />
        </li>
      ))}
    </ul>
  );
}
