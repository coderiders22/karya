import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getProjectByKey } from "@/lib/project";
import { loadCards } from "@/lib/cards";
import { forecastSprint } from "@/lib/forecast";
import { Board } from "@/components/Board";
import { CompleteSprintButton } from "@/components/SprintControls";
import { canEdit, canManageProject, projectPeople } from "@/lib/permissions";
import { GithubPrompt } from "@/components/BoardSync";
import { SprintForecast } from "@/components/SprintForecast";
import { RealityCheck } from "@/components/RealityCheck";
import { realityCheck } from "@/lib/reality";

export default async function BoardPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const me = await requireUser();
  const project = await getProjectByKey(key);
  const active = await db.sprint.findFirst({ where: { projectId: project.id, state: "ACTIVE" } });
  const [issues, users, futureSprints, sprintIssues, reality] = await Promise.all([
    loadCards({
      projectId: project.id,
      type: { not: "EPIC" },
      ...(active ? { sprintId: active.id } : { OR: [{ sprintId: null }, { sprint: { state: { not: "CLOSED" } } }] }),
    }),
    db.user.findMany({ where: projectPeople(project), select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.sprint.findMany({ where: { projectId: project.id, state: "FUTURE" }, select: { id: true, name: true } }),
    active ? db.issue.findMany({ where: { sprintId: active.id }, select: { storyPoints: true, resolvedAt: true } }) : [],
    realityCheck(project),
  ]);
  const doneIds = new Set(project.statuses.filter((s) => s.category === "DONE").map((s) => s.id));
  const openCount = issues.filter((i) => !doneIds.has(i.statusId)).length;
  const forecast = active ? forecastSprint(active, sprintIssues) : null;

  return (
    <main>
      {(active || me.mode !== "STUDENT") && <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 px-4 py-3 sm:px-6 dark:border-slate-800">
        {active ? (
          <>
            <div className="min-w-0">
              <div className="text-sm font-semibold">{active.name}</div>
              {active.goal && <div className="truncate text-xs text-muted">{active.goal}</div>}
            </div>
            {forecast && <div data-tour="forecast" className="order-last basis-full sm:order-none sm:ml-4 sm:basis-auto sm:min-w-0 sm:flex-1"><SprintForecast f={forecast} /></div>}
            {canManageProject(me, project) && <CompleteSprintButton sprintId={active.id} name={active.name} openCount={openCount} futureSprints={futureSprints} />}
          </>
        ) : (
          <p className="text-[13px] text-muted">
            Continuous flow: showing all open work. Plan a sprint in the{" "}
            <Link className="font-medium text-slate-900 underline underline-offset-2 dark:text-white" href={`/projects/${project.key}/backlog`}>backlog</Link> to get a forecast.
          </p>
        )}
      </div>}
      <div className="p-4 pt-3 sm:p-6 sm:pt-4">
        {!project.githubRepo && canManageProject(me, project) && <GithubPrompt projectKey={project.key} />}
        <RealityCheck items={reality} github={!!project.githubRepo} canEdit={canEdit(me.role)} />
        <Board issues={issues} statuses={project.statuses} users={users} meId={me.id} projectId={project.id} projectKey={project.key}
          canFetchGithub={!!project.githubRepo && project.githubIssueSync && canEdit(me.role)} sprintId={active?.id} staleDays={project.staleDays} />
      </div>
    </main>
  );
}
