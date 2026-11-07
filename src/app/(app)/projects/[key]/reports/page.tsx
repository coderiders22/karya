import { db } from "@/lib/db";
import { getProjectByKey } from "@/lib/project";
import { BarList, ColumnChart, LineChart } from "@/components/Charts";
import { forecastSprint } from "@/lib/forecast";
import { SprintForecast } from "@/components/SprintForecast";

const DAY = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

export default async function ReportsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const project = await getProjectByKey(key);
  const now = new Date();
  const since = startOfDay(new Date(now.getTime() - 29 * DAY));

  const [sprint, closed, recent, open, users] = await Promise.all([
    db.sprint.findFirst({
      where: { projectId: project.id, state: { in: ["ACTIVE", "CLOSED"] } },
      orderBy: [{ startDate: "desc" }],
      include: { issues: { select: { storyPoints: true, resolvedAt: true } } },
    }).then(async (s) => (await db.sprint.findFirst({ where: { projectId: project.id, state: "ACTIVE" }, include: { issues: { select: { storyPoints: true, resolvedAt: true } } } })) ?? s),
    db.sprint.findMany({
      where: { projectId: project.id, state: "CLOSED" },
      orderBy: { endDate: "desc" },
      take: 8,
      include: { issues: { where: { status: { category: "DONE" } }, select: { storyPoints: true } } },
    }),
    db.issue.findMany({
      where: { projectId: project.id, OR: [{ createdAt: { gte: since } }, { resolvedAt: { gte: since } }] },
      select: { createdAt: true, resolvedAt: true },
    }),
    db.issue.findMany({
      where: { projectId: project.id, status: { category: { not: "DONE" } } },
      select: { assigneeId: true, dueDate: true, storyPoints: true, status: { select: { category: true } } },
    }),
    db.user.findMany({ select: { id: true, name: true } }),
  ]);
  const [flow, current] = await Promise.all([
    db.issue.findMany({
      where: { projectId: project.id, resolvedAt: { gte: since } },
      select: { createdAt: true, startedAt: true, resolvedAt: true },
    }),
    db.issue.findMany({
      where: { projectId: project.id, status: { category: "IN_PROGRESS" } },
      select: { statusChangedAt: true, status: { select: { name: true, position: true } } },
    }),
  ]);
  const median = (xs: number[]) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const days = (a: Date, b: Date) => (b.getTime() - a.getTime()) / DAY;
  // Ignore impossible (negative) spans from imported or hand-edited dates.
  const cycle = median(flow.filter((i) => i.startedAt && i.resolvedAt).map((i) => days(i.startedAt!, i.resolvedAt!)).filter((d) => d >= 0));
  const lead = median(flow.filter((i) => i.resolvedAt).map((i) => days(i.createdAt, i.resolvedAt!)).filter((d) => d >= 0));
  const byStatus = new Map<string, { pos: number; total: number; n: number }>();
  for (const i of current) {
    const cur = byStatus.get(i.status.name) ?? { pos: i.status.position, total: 0, n: 0 };
    byStatus.set(i.status.name, { pos: cur.pos, total: cur.total + days(i.statusChangedAt, now), n: cur.n + 1 });
  }
  const waits = [...byStatus.entries()].sort((a, b) => a[1].pos - b[1].pos)
    .map(([label, v]) => ({ label, value: Math.round((v.total / v.n) * 10) / 10, hint: `average wait across ${v.n} issue${v.n === 1 ? "" : "s"} right now` }));
  const bottleneck = [...waits].sort((a, b) => b.value - a.value)[0];
  const fmtDays = (d: number | null) => (d == null ? "–" : d < 1 / 24 ? "<1h" : d < 1 ? `${Math.round(d * 24)}h` : `${d.toFixed(1)}d`);

  // Burndown
  let burndown: { labels: string[]; actual: (number | null)[]; ideal: number[]; unit: string } | null = null;
  if (sprint?.startDate && sprint.endDate) {
    const usePoints = sprint.issues.some((i) => i.storyPoints);
    const weight = (i: { storyPoints: number | null }) => (usePoints ? i.storyPoints ?? 0 : 1);
    const total = sprint.issues.reduce((n, i) => n + weight(i), 0);
    const start = startOfDay(sprint.startDate), end = startOfDay(sprint.endDate);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY));
    const labels: string[] = [], actual: (number | null)[] = [], ideal: number[] = [];
    for (let d = 0; d <= days; d++) {
      const day = new Date(start.getTime() + d * DAY), dayEnd = new Date(day.getTime() + DAY);
      labels.push(fmt(day));
      ideal.push(Math.round((total * (1 - d / days)) * 10) / 10);
      actual.push(day > now ? null : sprint.issues.filter((i) => !i.resolvedAt || i.resolvedAt >= dayEnd).reduce((n, i) => n + weight(i), 0));
    }
    burndown = { labels, actual, ideal, unit: usePoints ? " pts" : " issues" };
  }

  // Created vs resolved (cumulative over 30 days)
  const cvLabels: string[] = [], created: number[] = [], resolved: number[] = [];
  let c = 0, r = 0;
  for (let d = 0; d < 30; d++) {
    const day = new Date(since.getTime() + d * DAY), next = new Date(day.getTime() + DAY);
    c += recent.filter((i) => i.createdAt >= day && i.createdAt < next).length;
    r += recent.filter((i) => i.resolvedAt && i.resolvedAt >= day && i.resolvedAt < next).length;
    cvLabels.push(fmt(day)); created.push(c); resolved.push(r);
  }

  const velocity = [...closed].reverse().map((s) => ({
    label: s.name, value: s.issues.reduce((n, i) => n + (i.storyPoints ?? 0), 0), hint: `points completed · ${s.issues.length} issues`,
  }));
  const avgVelocity = velocity.length ? Math.round(velocity.reduce((n, v) => n + v.value, 0) / velocity.length) : null;

  const nameOf = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const load = new Map<string, { n: number; pts: number }>();
  for (const i of open) {
    const k = i.assigneeId ? nameOf[i.assigneeId] : "Unassigned";
    const cur = load.get(k) ?? { n: 0, pts: 0 };
    load.set(k, { n: cur.n + 1, pts: cur.pts + (i.storyPoints ?? 0) });
  }
  const workload = [...load.entries()].sort((a, b) => b[1].n - a[1].n).map(([label, v]) => ({ label, value: v.n, hint: `${v.pts} story points open` }));

  const inProgress = open.filter((i) => i.status.category === "IN_PROGRESS").length;
  const forecast = sprint?.state === "ACTIVE" ? forecastSprint(sprint, sprint.issues) : null;
  const overdue = open.filter((i) => i.dueDate && i.dueDate < now).length;

  return (
    <main className="space-y-6 p-4 sm:p-6">
      {forecast && sprint && (
        <section className="card p-4">
          <div className="mb-2 text-sm font-semibold">Will {sprint.name} land?</div>
          <SprintForecast f={forecast} />
        </section>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Open issues" value={open.length} sub={`${inProgress} in progress`} />
        <Tile label="Cycle time" value={fmtDays(cycle)} sub="median, start → done, 30 days" />
        <Tile label="Lead time" value={fmtDays(lead)} sub="median, created → done, 30 days" />
        <Tile label="Overdue" value={overdue} warn={overdue > 0} sub={`${r} resolved in 30 days`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2 3xl:grid-cols-3">
        <Card title={sprint ? `Burndown · ${sprint.name}` : "Sprint burndown"} sub={burndown ? `Remaining work in${burndown.unit} per day` : undefined}>
          {burndown ? (
            <LineChart labels={burndown.labels} unit={burndown.unit}
              series={[{ name: "Remaining", color: "var(--series-1)", values: burndown.actual }, { name: "Ideal", color: "var(--chart-guide)", values: burndown.ideal, dashed: true }]} />
          ) : <Empty>Start a sprint to see its burndown.</Empty>}
        </Card>
        <Card title="Velocity" sub={avgVelocity != null ? `Story points completed per sprint · average ${avgVelocity}` : "Story points completed per sprint"}>
          <ColumnChart data={velocity} unit=" pts" />
        </Card>
        <Card title="Created vs resolved" sub="Cumulative issues over the last 30 days">
          <LineChart labels={cvLabels}
            series={[{ name: "Created", color: "var(--series-2)", values: created }, { name: "Resolved", color: "var(--series-1)", values: resolved }]} />
        </Card>
        <Card title="Workload" sub="Open issues per person">
          <BarList data={workload} />
        </Card>
        <Card title="Where work waits" sub={bottleneck ? `Bottleneck right now: ${bottleneck.label}, about ${bottleneck.value} days per issue` : "Average days the current in-progress issues have sat in each column"}>
          <BarList data={waits} unit="d" />
        </Card>
      </div>
    </main>
  );
}

function Tile({ label, value, warn, sub }: { label: string; value: number | string; warn?: boolean; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-muted">{label}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
      <div className="mt-2 flex items-center gap-2 text-2xl font-semibold tabular-nums tracking-tight">
        {value}
        {warn && <span className="chip bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">Needs attention</span>}
      </div>
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {sub && <p className="mb-3 text-xs text-muted">{sub}</p>}
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-sm text-muted">{children}</p>;
}
