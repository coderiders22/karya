import Link from "next/link";
import { db } from "@/lib/db";
import { getProjectByKey } from "@/lib/project";
import { CreateChildButton } from "@/components/CreateChildButton";
import { StatusPill } from "@/components/IssueBits";
import { RoadmapAddEpic } from "@/components/RoadmapClient";

const DAY = 86400000;

export default async function RoadmapPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const project = await getProjectByKey(key);
  const epics = await db.issue.findMany({
    where: { projectId: project.id, type: "EPIC" },
    include: { status: true, children: { select: { status: { select: { category: true } } } } },
    orderBy: [{ startDate: { sort: "asc", nulls: "last" } }, { number: "asc" }],
  });

  const today = new Date();
  const spans = epics.map((e) => {
    const start = e.startDate ?? e.createdAt;
    const end = e.dueDate && e.dueDate > start ? e.dueDate : new Date(start.getTime() + 28 * DAY);
    return { e, start, end, estimated: !e.startDate || !e.dueDate };
  });
  const min = new Date(Math.min(today.getTime() - 14 * DAY, ...spans.map((s) => s.start.getTime())));
  const max = new Date(Math.max(today.getTime() + 60 * DAY, ...spans.map((s) => s.end.getTime() + 7 * DAY)));
  const rangeStart = new Date(min.getFullYear(), min.getMonth(), 1);
  const rangeEnd = new Date(max.getFullYear(), max.getMonth() + 1, 1);
  const total = rangeEnd.getTime() - rangeStart.getTime();
  const pct = (d: Date) => ((d.getTime() - rangeStart.getTime()) / total) * 100;

  const months: Date[] = [];
  for (let d = new Date(rangeStart); d < rangeEnd; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(d);

  return (
    <main className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <p className="flex-1 text-sm text-muted">Epics on a timeline. Set an epic&apos;s start and due dates on its page. Bars with a dashed outline use estimated dates.</p>
        <RoadmapAddEpic projectId={project.id} />
      </div>
      {epics.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted">No epics yet. Epics group related work and appear here on a timeline.</div>
      ) : (
        <div className="card overflow-x-auto">
          <div className="min-w-[760px] sm:min-w-[900px]">
            <div className="grid grid-cols-[200px_1fr] border-b border-slate-200 sm:grid-cols-[280px_1fr] dark:border-slate-800">
              <div className="label px-4 py-2">Epic</div>
              <div className="relative h-9">
                {months.map((m) => (
                  <div key={m.toISOString()} className="absolute top-0 h-full border-l border-slate-200 px-2 py-2 text-xs text-muted dark:border-slate-800" style={{ left: `${pct(m)}%` }}>
                    {m.toLocaleDateString(undefined, { month: "short", year: m.getMonth() === 0 ? "numeric" : undefined })}
                  </div>
                ))}
              </div>
            </div>
            {spans.map(({ e, start, end, estimated }) => {
              const done = e.children.filter((c) => c.status.category === "DONE").length;
              const progress = e.children.length ? done / e.children.length : e.status.category === "DONE" ? 1 : 0;
              return (
                <div key={e.id} className="group grid grid-cols-[200px_1fr] border-b sm:grid-cols-[280px_1fr] border-slate-100 last:border-0 dark:border-slate-800/60">
                  <div className="flex min-w-0 items-center gap-2 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/issues/${e.key}`} className="block truncate text-sm font-medium hover:underline">{e.title}</Link>
                      <div className="flex items-center gap-2 whitespace-nowrap text-xs text-muted">
                        <span className="font-mono">{e.key}</span>
                        <StatusPill name={e.status.name} category={e.status.category} />
                        <span>{done}/{e.children.length}</span>
                      </div>
                    </div>
                    <span className="hidden shrink-0 group-hover:block touch:block"><CreateChildButton projectId={project.id} parentId={e.id} isEpic compact /></span>
                  </div>
                  <div className="relative">
                    {months.map((m) => <div key={m.toISOString()} className="absolute inset-y-0 border-l border-slate-100 dark:border-slate-800/60" style={{ left: `${pct(m)}%` }} />)}
                    <Link href={`/issues/${e.key}`}
                      title={`${start.toLocaleDateString()} – ${end.toLocaleDateString()} · ${Math.round(progress * 100)}% done`}
                      className={`absolute top-1/2 h-7 -translate-y-1/2 overflow-hidden rounded-md ${estimated ? "border-2 border-dashed" : ""}`}
                      style={{ left: `${pct(start)}%`, width: `${Math.max(pct(end) - pct(start), 1)}%`, borderColor: project.color, background: `${project.color}33` }}>
                      <span className="block h-full" style={{ width: `${progress * 100}%`, background: project.color }} />
                      <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-slate-900 dark:text-white">{Math.round(progress * 100)}%</span>
                    </Link>
                  </div>
                </div>
              );
            })}
            <div className="pointer-events-none relative -mt-px grid grid-cols-[200px_1fr] sm:grid-cols-[280px_1fr]">
              <div />
              <div className="relative">
                <div className="absolute bottom-0 w-0.5 bg-red-500" style={{ left: `${pct(today)}%`, height: `${spans.length * 64 + 36}px` }}>
                  <span className="absolute -left-5 bottom-full mb-0.5 rounded bg-red-500 px-1 text-[10px] font-semibold text-white">Today</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
