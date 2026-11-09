import Link from "next/link";
import { ArrowRight, CheckCircle2, Users } from "lucide-react";
import type { CurrentUser } from "@/lib/auth";
import { loadCards } from "@/lib/cards";
import { db } from "@/lib/db";
import { visibleProjects } from "@/lib/permissions";
import { MAIN_TEMPLATES, TEMPLATES, templateById } from "@/lib/templates";
import { PriorityIcon, StatusPill } from "@/components/IssueBits";
import { Countdown, DueChip, TodayDate } from "@/components/LocalTime";
import { PageHeader } from "@/components/PageHeader";
import { ProjectBadge } from "@/components/Sidebar";
import { ActivityFeed, GithubStatus } from "./parts";

/** A student's day: what the team is racing towards, what's on their plate, and what teammates did. */
export async function StudentToday({ me }: { me: CurrentUser }) {
  const [projects, tasks, activity] = await Promise.all([
    db.project.findMany({
      where: visibleProjects(me),
      orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { name: "asc" }],
      select: {
        id: true, key: true, name: true, color: true, dueAt: true, template: true, leadId: true, workspaceId: true,
        githubRepo: true, githubLastEventAt: true, githubLastEventType: true,
        _count: { select: { members: true } },
        issues: { where: { type: { not: "EPIC" } }, select: { status: { select: { category: true } } } },
      },
    }),
    loadCards({ assigneeId: me.id, status: { category: { not: "DONE" } }, type: { not: "EPIC" }, project: visibleProjects(me) }),
    db.activity.findMany({
      where: { actorId: { not: me.id }, issue: { project: visibleProjects(me) } },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { actor: { select: { name: true } }, issue: { select: { key: true, title: true } } },
    }),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (due: string | null) => !!due && due.slice(0, 10) < today;
  const sorted = [...tasks].sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const overdue = tasks.filter((t) => isOverdue(t.dueDate)).length;
  const deadlines = projects.filter((p) => p.dueAt);
  const keyOf = (projectId: string) => projects.find((p) => p.id === projectId)?.key;

  return (
    <main>
      <PageHeader title="Today" description={<TodayDate />} actions={projects.length > 0 ? (
        <div className="flex items-center gap-5 text-[13px]">
          <span><span className="font-semibold tabular-nums">{tasks.length}</span> <span className="text-muted">to do</span></span>
          {overdue > 0 && <span><span className="font-semibold tabular-nums text-rose-700 dark:text-rose-400">{overdue}</span> <span className="text-muted">overdue</span></span>}
        </div>
      ) : undefined} />
      {projects.length === 0 ? <FirstProject /> : (
        <div className="grid max-w-[1680px] gap-8 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
          <div data-peek-scope className="min-w-0 space-y-7">
            {deadlines.length > 0 && (
              <section>
                <h2 className="section-title mb-2">Deadlines</h2>
                <ul className="card divide-y divide-slate-100 dark:divide-slate-800">
                  {deadlines.map((p) => {
                    const done = p.issues.filter((i) => i.status.category === "DONE").length;
                    return (
                      <li key={p.id}>
                        <Link href={`/projects/${p.key}/board`} className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <ProjectBadge p={p} size={20} />
                          <span className="min-w-0 flex-1 basis-40 truncate font-medium">{p.name}<span className="ml-2 text-xs font-normal text-muted">{templateById(p.template)?.label}</span></span>
                          <span className="text-xs tabular-nums text-muted">{done}/{p.issues.length} done</span>
                          <Countdown iso={p.dueAt!.toISOString()} label={templateById(p.template)?.deadlineLabel} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            <section>
              <h2 className="section-title mb-2">Your tasks</h2>
              {sorted.length === 0 ? (
                <p className="inline-flex items-center gap-1.5 text-[13px] text-muted"><CheckCircle2 size={14} className="text-brand" />Nothing assigned to you. Pick something up from a board, or press <span className="kbd">C</span> to add a task.</p>
              ) : (
                <ul className="card divide-y divide-slate-100 dark:divide-slate-800">
                  {sorted.map((i) => (
                    <li key={i.id}>
                      <Link href={`/issues/${i.key}`} className="flex h-11 items-center gap-3 px-3 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <PriorityIcon priority={i.priority} />
                        <span className="hidden w-14 shrink-0 font-mono text-xs text-muted sm:inline">{keyOf(i.projectId)}</span>
                        <span className="min-w-0 flex-1 truncate">{i.title}</span>
                        {i.dueDate && <DueChip iso={i.dueDate} />}
                        <span className="hidden sm:inline-flex"><StatusPill name={i.status.name} category={i.status.category} /></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
          <aside className="space-y-7">
            <section>
              <h2 className="section-title mb-2">Your projects</h2>
              <ul className="card divide-y divide-slate-100 dark:divide-slate-800">
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link href={`/projects/${p.key}/board`} className="flex items-center gap-3 px-3 py-2.5 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <ProjectBadge p={p} size={22} />
                      <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                      <span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted" aria-label={`${p._count.members} on the team`}><Users size={12} />{p._count.members}</span>
                    </Link>
                  </li>
                ))}
                <li><Link href="/projects" className="block px-3 py-2.5 text-[13px] text-brand hover:bg-slate-50 dark:hover:bg-slate-800/40">Start another project</Link></li>
              </ul>
            </section>
            <GithubStatus projects={projects} me={me} />
            <ActivityFeed items={activity} />
          </aside>
        </div>
      )}
    </main>
  );
}

function FirstProject() {
  const main = TEMPLATES.filter((t) => MAIN_TEMPLATES.includes(t.id));
  return (
    <div className="max-w-3xl p-4 sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight">What are you working on?</h2>
      <p className="mt-1 text-[13px] text-muted">Pick one and you get a board with the usual steps already laid out. Then share a link to bring your team in.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {main.map((t) => (
          <Link key={t.id} href={`/projects?template=${t.id}`} className="card card-interactive block p-4">
            <span className="block font-semibold">{t.label}</span>
            <span className="mt-1 block text-[13px] text-muted">{t.hint}</span>
          </Link>
        ))}
      </div>
      <Link href="/projects" className="mt-3 inline-flex items-center gap-1 text-[13px] text-brand hover:underline">Research paper, club event, group assignment, placement prep and more<ArrowRight size={13} /></Link>
      <p className="mt-6 border-t border-slate-200 pt-4 text-[13px] text-muted dark:border-slate-800">Did a teammate already start it? Open the team link they shared and you'll join their board.</p>
    </div>
  );
}
