import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { SORTS, buildIssueWhere, toQueryString, type IssueSearch } from "@/lib/issueQuery";
import { FilterBar } from "@/components/FilterBar";
import { IssueNavigator } from "@/components/IssueNavigator";
import { DeleteFilterButton } from "@/components/DeleteFilterButton";
import { PageHeader } from "@/components/PageHeader";

export default async function FiltersPage({ searchParams }: { searchParams: Promise<IssueSearch> }) {
  const sp = await searchParams;
  const me = await requireUser();
  const [users, projects, statuses, labelRows, issues, saved] = await Promise.all([
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.project.findMany({ select: { id: true, key: true, name: true }, orderBy: { name: "asc" } }),
    db.status.findMany({ select: { name: true }, distinct: ["name"], orderBy: { name: "asc" } }),
    db.$queryRaw<{ l: string }[]>`SELECT DISTINCT unnest(labels) AS l FROM "Issue" ORDER BY l`,
    db.issue.findMany({
      where: buildIssueWhere(sp, me.id),
      include: { status: true, assignee: { select: { name: true } }, project: { select: { key: true, name: true } } },
      orderBy: SORTS[sp.sort ?? "updated"] ?? SORTS.updated,
      take: 500,
    }),
    db.savedFilter.findMany({
      where: { OR: [{ ownerId: me.id }, { shared: true }] },
      include: { owner: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  const keyById = Object.fromEntries(projects.map((p) => [p.id, p.key]));
  return (
    <main>
      <PageHeader title="All issues" description="Every project in one list. Select rows to edit many at once, or save the current filters as a view." />
      <div className="space-y-4 p-4 sm:p-6">
      {saved.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {saved.map((f) => (
            <span key={f.id} className="flex h-7 items-center gap-2 rounded-full border border-slate-200 px-3 text-[13px] dark:border-slate-800">
              <Link className="hover:underline" href={f.projectId && keyById[f.projectId] ? `/projects/${keyById[f.projectId]}/issues?${f.query}` : `/filters?${f.query}`}>
                {f.name}
              </Link>
              <span className="text-xs text-muted">{f.shared ? "shared" : "private"}{f.ownerId !== me.id && ` · ${f.owner.name}`}</span>
              {(f.ownerId === me.id || me.role === "ADMIN") && <DeleteFilterButton id={f.id} />}
            </span>
          ))}
        </div>
      )}
      <FilterBar
        sp={sp}
        users={users.map((u) => [u.id, u.name])}
        projects={projects.map((p) => [p.key, p.name])}
        labels={labelRows.map((r) => r.l)}
      />
      <IssueNavigator
        rows={issues.map((i) => ({ ...i, dueDate: i.dueDate?.toISOString() ?? null, updatedAt: i.updatedAt.toISOString() }))}
        users={users.map((u) => ({ value: u.id, label: u.name }))}
        statusNames={statuses.map((s) => s.name)}
        sprints={[]}
        projectId={null}
        query={toQueryString(sp)}
        isAdmin={me.role === "ADMIN"}
        showProject
      />
      </div>
    </main>
  );
}
