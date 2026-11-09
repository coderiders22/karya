import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { forecastSprint } from "@/lib/forecast";
import { realityCheck, REALITY_TITLES } from "@/lib/reality";
import { Logo } from "@/components/Logo";
import { SprintForecast } from "@/components/SprintForecast";

export const metadata: Metadata = { title: "Project status", robots: { index: false, follow: false } };

const DAY = 86400000;
const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/**
 * The read-only page a project shares with people outside the team: no login, no editing, and
 * no links into the app. Turning the link off or making a new one stops the old address working.
 */
export default async function StatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 16) notFound();
  const project = await db.project.findUnique({ where: { statusToken: token } });
  if (!project) notFound();

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const issue = { select: { key: true, title: true, assignee: { select: { name: true } }, linksIn: { where: { type: "BLOCKS" as const }, select: { from: { select: { status: { select: { category: true } } } } } } } };
  const [shipped, doing, active, reality, openCount] = await Promise.all([
    db.issue.findMany({ where: { projectId: project.id, type: { not: "EPIC" }, resolvedAt: { gte: weekAgo } }, orderBy: { resolvedAt: "desc" }, take: 40, ...issue }),
    db.issue.findMany({ where: { projectId: project.id, type: { not: "EPIC" }, status: { category: "IN_PROGRESS" } }, orderBy: { statusChangedAt: "asc" }, take: 40, ...issue }),
    db.sprint.findFirst({ where: { projectId: project.id, state: "ACTIVE" }, include: { issues: { select: { storyPoints: true, resolvedAt: true } } } }),
    realityCheck(project),
    db.issue.count({ where: { projectId: project.id, type: { not: "EPIC" }, status: { category: { not: "DONE" } } } }),
  ]);
  const forecast = active ? forecastSprint(active, active.issues) : null;
  const blocked = doing.filter((i) => i.linksIn.some((l) => l.from.status.category !== "DONE"));
  const attention = reality.filter((r) => r.kind !== "untracked");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="dark border-b border-white/[0.06] bg-ink text-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <span className="text-[12px] text-slate-400">Read-only status</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6">
        <div>
          <p className="text-[13px] font-medium text-brand">{fmt(weekAgo)} to {fmt(now)}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{project.name}</h1>
          {project.dueAt && <p className="mt-1 text-[13px] text-muted">Deadline {project.dueAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}, {Math.max(0, Math.ceil((project.dueAt.getTime() - now.getTime()) / DAY))} days left</p>}
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Shipped this week", shipped.length], ["In progress", doing.length], ["Blocked", blocked.length], ["Still open", openCount]].map(([label, n]) => (
            <div key={label} className="card p-3.5">
              <dd className="text-2xl font-semibold tabular-nums">{n}</dd>
              <dt className="text-[12px] text-muted">{label}</dt>
            </div>
          ))}
        </dl>

        {active && (
          <section className="card p-4">
            <h2 className="text-[14px] font-semibold">{active.name}{active.endDate && <span className="font-normal text-muted"> · ends {fmt(active.endDate)}</span>}</h2>
            {active.goal && <p className="mt-0.5 text-[13px] text-muted">{active.goal}</p>}
            {forecast && <div className="mt-3"><SprintForecast f={forecast} /></div>}
          </section>
        )}

        {attention.length > 0 && (
          <Section title="Needs attention" note="Where the board and the work don't match yet.">
            {attention.map((r) => <Row key={r.kind + r.id} k={r.label} title={r.title} meta={`${REALITY_TITLES[r.kind]}. ${r.detail}`} />)}
          </Section>
        )}
        <Section title="Shipped this week" empty="Nothing finished in the last 7 days.">
          {shipped.map((i) => <Row key={i.key} k={i.key} title={i.title} meta={i.assignee?.name} />)}
        </Section>
        <Section title="In progress" empty="Nothing in progress right now.">
          {doing.map((i) => <Row key={i.key} k={i.key} title={i.title} meta={[i.assignee?.name, blocked.includes(i) && "Blocked"].filter(Boolean).join(" · ")} />)}
        </Section>

        <p className="pt-2 text-center text-[12px] text-muted">Updated live from the team&apos;s board · {now.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC</p>
      </main>
    </div>
  );
}

function Section({ title, note, empty, children }: { title: string; note?: string; empty?: string; children: React.ReactNode[] }) {
  return (
    <section>
      <h2 className="text-[14px] font-semibold">{title}</h2>
      {note && <p className="text-[12px] text-muted">{note}</p>}
      {children.length === 0 ? <p className="mt-2 text-[13px] text-muted">{empty}</p> : <ul className="card mt-2 divide-y divide-slate-100 dark:divide-slate-800">{children}</ul>}
    </section>
  );
}

function Row({ k, title, meta }: { k: string; title: string; meta?: string | null }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3.5 py-2.5 text-[13px]">
      <span className="w-16 shrink-0 font-mono text-[11.5px] text-muted">{k}</span>
      <span className="min-w-0 flex-1 basis-48 font-medium">{title}</span>
      {meta && <span className="text-[12px] text-muted">{meta}</span>}
    </li>
  );
}
