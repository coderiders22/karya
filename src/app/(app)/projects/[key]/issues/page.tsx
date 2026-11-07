import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getProjectByKey } from "@/lib/project";
import { SORTS, buildIssueWhere, toQueryString, type IssueSearch } from "@/lib/issueQuery";
import { FilterBar } from "@/components/FilterBar";
import { IssueNavigator } from "@/components/IssueNavigator";

export default async function IssuesPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<IssueSearch> }) {
  const { key } = await params;
  const sp = await searchParams;
  const me = await requireUser();
  const project = await getProjectByKey(key);
  const [users, sprints, labelRows, issues] = await Promise.all([
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.sprint.findMany({ where: { projectId: project.id, state: { not: "CLOSED" } }, select: { id: true, name: true } }),
    db.$queryRaw<{ l: string }[]>`SELECT DISTINCT unnest(labels) AS l FROM "Issue" WHERE "projectId" = ${project.id} ORDER BY l`,
    db.issue.findMany({
      where: buildIssueWhere(sp, me.id, project.id),
      include: { status: true, assignee: { select: { name: true } }, project: { select: { key: true, name: true } } },
      orderBy: SORTS[sp.sort ?? "updated"] ?? SORTS.updated,
      take: 500,
    }),
  ]);
  return (
    <main className="space-y-4 p-4 sm:p-6">
      <FilterBar
        sp={sp}
        users={users.map((u) => [u.id, u.name])}
        statuses={project.statuses.map((s) => [s.id, s.name])}
        sprints={sprints.map((s) => [s.id, s.name])}
        labels={labelRows.map((r) => r.l)}
      />
      <IssueNavigator
        rows={issues.map((i) => ({ ...i, dueDate: i.dueDate?.toISOString() ?? null, updatedAt: i.updatedAt.toISOString() }))}
        users={users.map((u) => ({ value: u.id, label: u.name }))}
        statusNames={project.statuses.map((s) => s.name)}
        sprints={sprints.map((s) => ({ value: s.id, label: s.name }))}
        projectId={project.id}
        query={toQueryString(sp)}
        isAdmin={me.role === "ADMIN"}
        showProject={false}
      />
    </main>
  );
}
