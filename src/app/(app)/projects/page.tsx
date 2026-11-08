import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canEdit, visibleProjects } from "@/lib/permissions";
import { CreateProjectForm } from "@/components/CreateProjectForm";
import { Avatar } from "@/components/IssueBits";
import { ProjectBadge } from "@/components/Sidebar";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/IssueBits";
import { FolderKanban, Users } from "lucide-react";
import { Countdown } from "@/components/LocalTime";
import { StartProject } from "@/components/StudentProjects";
import { templateById } from "@/lib/templates";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const me = await requireUser();
  const projects = await db.project.findMany({
    where: visibleProjects(me),
    orderBy: { name: "asc" },
    include: { lead: { select: { name: true } }, _count: { select: { issues: true, members: true } } },
  });
  const open = await db.issue.groupBy({
    by: ["projectId"],
    where: { project: visibleProjects(me), status: { category: { not: "DONE" } } },
    _count: true,
  });
  const openBy = Object.fromEntries(open.map((o) => [o.projectId, o._count]));
  return (
    <main>
      <PageHeader title="Projects" description={`${projects.length} project${projects.length === 1 ? "" : "s"}`} />
      <div className="grid max-w-[1680px] gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_300px]">
      <section>
        {projects.length === 0 ? (
          <div className="card"><EmptyState icon={FolderKanban} title="No projects yet">{me.mode === "STUDENT" ? "Start one from the form here. Teammates join it with a link." : "Create one on the right. Each project gets its own board, backlog and key prefix."}</EmptyState></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3 3xl:grid-cols-4">
            {projects.map((p) => {
              const total = p._count.issues, openN = openBy[p.id] ?? 0;
              const pct = total ? Math.round(((total - openN) / total) * 100) : 0;
              return (
                <Link key={p.id} href={`/projects/${p.key}/board`} className="card card-interactive group flex flex-col p-4">
                  <div className="flex items-start gap-3">
                    <ProjectBadge p={p} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold group-hover:text-brand">{p.name}</div>
                      <div className="font-mono text-[11px] text-muted">{p.key}{templateById(p.template) && <span className="font-sans"> · {templateById(p.template)!.label}</span>}</div>
                    </div>
                    <Avatar name={p.lead?.name} />
                  </div>
                  {p.template ? (
                    <div className="mt-3 flex min-h-[1.5rem] flex-wrap items-center gap-2 text-[13px] text-muted">
                      {p.dueAt ? <Countdown iso={p.dueAt.toISOString()} label={templateById(p.template)?.deadlineLabel} /> : <span>No deadline set</span>}
                      <span className="inline-flex items-center gap-1 text-xs"><Users size={12} />{p._count.members}</span>
                    </div>
                  ) : <p className="mt-3 line-clamp-2 min-h-[2.6em] text-[13px] text-muted">{p.description || "No description yet."}</p>}
                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-muted"><b className="font-semibold text-slate-800 dark:text-slate-200">{openN}</b> open of {total}</span>
                      <span className="font-medium tabular-nums">{pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full transition-[width] duration-700 ease-out-quint" style={{ width: `${pct}%`, background: p.color }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      <aside>
        {me.mode === "STUDENT" ? <StartProject initial={(await searchParams).template} /> : canEdit(me.role) && <CreateProjectForm />}
      </aside>
      </div>
    </main>
  );
}
