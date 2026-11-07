import Link from "next/link";
import { Ban, CalendarClock, CheckCircle2, Hourglass } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { loadCards } from "@/lib/cards";
import type { CardIssue } from "@/lib/types";
import { Avatar, EmptyState, IssueKey, PriorityIcon, StatusPill, TypeIcon } from "@/components/IssueBits";
import { PageHeader } from "@/components/PageHeader";
import { ProjectBadge } from "@/components/Sidebar";
import { SetupChecklist, type SetupStep } from "@/components/SetupChecklist";

export const metadata = { title: "Your work" };

const DAY = 86400000;
const VERB: Record<string, string> = {
  title: "renamed", description: "edited", type: "changed the type of", statusId: "moved",
  priority: "reprioritised", assigneeId: "reassigned", storyPoints: "re-estimated", dueDate: "rescheduled",
  startDate: "rescheduled", labels: "relabelled", parentId: "moved", sprintId: "re-planned", created: "created",
  attachment: "attached files to", link: "linked",
};

export default async function YourWork() {
  const me = await requireUser();
  const weekAgo = new Date(Date.now() - 7 * DAY);
  const [mine, projects, activity, doneThisWeek] = await Promise.all([
    loadCards({ assigneeId: me.id, status: { category: { not: "DONE" } }, type: { not: "EPIC" } }),
    db.project.findMany({
      orderBy: { name: "asc" },
      select: { id: true, key: true, name: true, color: true, staleDays: true, _count: { select: { issues: { where: { status: { category: { not: "DONE" } } } } } } },
    }),
    db.activity.findMany({
      where: { actorId: { not: me.id } },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { actor: { select: { name: true } }, issue: { select: { key: true, title: true, type: true } } },
    }),
    db.issue.count({ where: { assigneeId: me.id, resolvedAt: { gte: weekAgo } } }),
  ]);

  let setup: SetupStep[] | null = null;
  if (me.role === "ADMIN") {
    const [people, invites, issues, sprints, git] = await Promise.all([
      db.user.count(), db.invite.count(), db.issue.count(),
      db.sprint.count({ where: { state: { in: ["ACTIVE", "CLOSED"] } } }), db.devActivity.count(),
    ]);
    const first = projects[0]?.key;
    setup = [
      { id: "project", title: "Create a project", detail: "Each team or product gets its own board, backlog and issue keys.", href: "/projects", cta: "Create", done: projects.length > 0 },
      { id: "invite", title: "Invite your team", detail: "Send an invite link. Accounts are invite-only.", href: "/settings/members", cta: "Invite", done: people > 1 || invites > 0 },
      { id: "issues", title: "Add your first five issues", detail: "Press C anywhere, or import a Jira CSV.", href: first ? `/projects/${first}/backlog` : "/projects", cta: "Add issues", done: issues >= 5 },
      { id: "sprint", title: "Start a sprint", detail: "Unlocks the forecast, burndown and standup.", href: first ? `/projects/${first}/backlog` : "/projects", cta: "Plan", done: sprints > 0 },
      { id: "github", title: "Connect GitHub", detail: "Pull requests then move issues on their own.", href: first ? `/projects/${first}/settings` : "/projects", cta: "Connect", done: git > 0 },
    ];
  }

  const staleDaysFor = Object.fromEntries(projects.map((p) => [p.id, p.staleDays]));
  const now = Date.now();
  const age = (i: CardIssue) => Math.floor((now - new Date(i.statusChangedAt).getTime()) / DAY);
  const isOverdue = (i: CardIssue) => i.dueDate != null && new Date(i.dueDate).getTime() < now - DAY;
  const isStuck = (i: CardIssue) => i.status.category === "IN_PROGRESS" && age(i) >= (staleDaysFor[i.projectId] ?? 3);
  const attention = mine.filter((i) => i.blocked || isOverdue(i) || isStuck(i));
  const attentionIds = new Set(attention.map((i) => i.id));
  const doing = mine.filter((i) => i.status.category === "IN_PROGRESS" && !attentionIds.has(i.id));
  const next = mine.filter((i) => i.status.category === "TODO" && !attentionIds.has(i.id));

  return (
    <main>
      <PageHeader
        title="Your work"
        description={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        actions={
          <div className="flex items-center gap-5 text-[13px]">
            <Metric n={mine.length} label="open" />
            <Metric n={doneThisWeek} label="done this week" />
          </div>
        }
      />
      <div className="grid max-w-[1680px] gap-8 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div data-peek-scope className="min-w-0 space-y-7">
          {setup && <SetupChecklist steps={setup} />}
          {mine.length === 0 ? (
            <div className="card"><EmptyState icon={CheckCircle2} title="Nothing assigned to you">Press <span className="kbd">C</span> to create an issue, or pick something up from a board.</EmptyState></div>
          ) : (
            <>
              {attention.length > 0 && (
                <Group title="Needs attention" hint="Blocked, overdue, or sitting still for too long">
                  {attention.map((i) => (
                    <Row key={i.id} i={i}>
                      {i.blocked && <Flag tone="rose" icon={Ban}>Blocked</Flag>}
                      {isOverdue(i) && <Flag tone="rose" icon={CalendarClock}>Overdue</Flag>}
                      {isStuck(i) && <Flag tone="amber" icon={Hourglass}>{age(i)}d in {i.status.name}</Flag>}
                    </Row>
                  ))}
                </Group>
              )}
              <Group title="In progress" empty="Nothing in progress.">
                {doing.map((i) => <Row key={i.id} i={i} />)}
              </Group>
              <Group title="Up next" empty="Your queue is empty.">
                {next.map((i) => <Row key={i.id} i={i} />)}
              </Group>
            </>
          )}
        </div>

        <aside className="space-y-7">
          <section>
            <h2 className="section-title mb-2">Projects</h2>
            <div className="card divide-y divide-slate-100 dark:divide-slate-800">
              {projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.key}/board`} className="flex items-center gap-3 px-3 py-2.5 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <ProjectBadge p={p} size={22} />
                  <span className="flex-1 truncate font-medium">{p.name}</span>
                  <span className="text-xs tabular-nums text-muted">{p._count.issues} open</span>
                </Link>
              ))}
              {projects.length === 0 && <p className="p-3 text-xs text-muted"><Link href="/projects" className="underline">Create a project</Link> to get started.</p>}
            </div>
          </section>
          <section>
            <h2 className="section-title mb-2">From your team</h2>
            {activity.length === 0 ? (
              <p className="text-xs text-muted">Teammates&apos; updates will appear here.</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="flex gap-2.5 text-[13px]">
                    <Avatar name={a.actor.name} size={5} />
                    <div className="min-w-0 leading-snug">
                      <span className="font-medium">{a.actor.name.split(" ")[0]}</span>{" "}
                      <span className="text-muted">{VERB[a.field] ?? "updated"}</span>{" "}
                      <Link href={`/issues/${a.issue.key}`} className="hover:underline">{a.issue.title}</Link>
                      {a.field === "statusId" && a.to && <span className="text-muted"> → {a.to}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

function Metric({ n, label }: { n: number; label: string }) {
  return <span><span className="font-semibold tabular-nums">{n}</span> <span className="text-muted">{label}</span></span>;
}

function Group({ title, hint, empty, children }: { title: string; hint?: string; empty?: string; children: React.ReactNode[] }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="section-title">{title}</h2>
        <span className="text-xs text-muted">{children.length}{hint && ` · ${hint}`}</span>
      </div>
      {children.length === 0 ? <p className="text-[13px] text-slate-400">{empty}</p> : <ul className="card divide-y divide-slate-100 dark:divide-slate-800">{children}</ul>}
    </section>
  );
}

function Row({ i, children }: { i: CardIssue; children?: React.ReactNode }) {
  return (
    <li>
      <Link href={`/issues/${i.key}`} className="flex h-11 items-center gap-3 px-3 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800/40">
        <PriorityIcon priority={i.priority} />
        <TypeIcon type={i.type} />
        <IssueKey k={i.key} className="hidden w-16 shrink-0 sm:inline" />
        <span className="min-w-0 flex-1 truncate">{i.title}</span>
        <span className="hidden items-center gap-1.5 md:flex">{children}</span>
        <span className="hidden sm:inline-flex"><StatusPill name={i.status.name} category={i.status.category} /></span>
      </Link>
    </li>
  );
}

function Flag({ tone, icon: I, children }: { tone: "rose" | "amber"; icon: React.ComponentType<{ size?: number }>; children: React.ReactNode }) {
  return (
    <span className={`chip ${tone === "rose" ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" : "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"}`}>
      <I size={11} />{children}
    </span>
  );
}
