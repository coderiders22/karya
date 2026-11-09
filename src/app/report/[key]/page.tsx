import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProjectByKey } from "@/lib/project";
import { contributions } from "@/lib/contribution";
import { templateById } from "@/lib/templates";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/components/PrintButton";

export const metadata = { title: "Contribution report" };

const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** A printable record of who did what on a student project, for a viva or a guide's review. */
export default async function ReportPage({ params }: { params: Promise<{ key: string }> }) {
  const me = await requireUser();
  if (me.mode !== "STUDENT") notFound();
  const project = await getProjectByKey((await params).key);
  const people = await contributions(project);
  const template = templateById(project.template);
  const github = !!project.githubRepo;
  const total = people.reduce((n, p) => n + p.done, 0);

  return (
    <div className="min-h-screen bg-white text-slate-900 print:text-[11px]">
      <div className="mx-auto max-w-3xl px-6 py-8 print:max-w-none print:p-0">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <Logo />
          <div className="flex items-center gap-2 print:hidden">
            <a href={`/projects/${project.key}/team`} className="btn">Back</a>
            <PrintButton />
          </div>
          <span className="hidden text-[11px] text-slate-500 print:inline">Plan. Track. Build. Deliver.</span>
        </div>

        <p className="mt-6 text-[12px] font-medium text-brand">Contribution report</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{project.name}</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          {[template?.label, project.dueAt && `${template?.deadlineLabel ?? "Deadline"} ${fmt(project.dueAt)}`, project.githubRepo, `Generated ${fmt(new Date())}`].filter(Boolean).join(" · ")}
        </p>

        <table className="mt-6 w-full text-[13px]">
          <thead>
            <tr className="border-b border-slate-300 text-left text-[12px] text-slate-500">
              <th className="py-2 pr-2 font-medium">Person</th>
              <th className="px-2 py-2 text-right font-medium">Done</th>
              <th className="px-2 py-2 text-right font-medium">Doing</th>
              <th className="px-2 py-2 text-right font-medium">To do</th>
              <th className="px-2 py-2 text-right font-medium">Overdue</th>
              <th className="px-2 py-2 text-right font-medium">Comments</th>
              {github && <th className="px-2 py-2 text-right font-medium">Commits</th>}
              {github && <th className="py-2 pl-2 text-right font-medium">PRs</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {people.map((p) => (
              <tr key={p.id}>
                <td className="py-2 pr-2 font-medium">{p.name}{p.lead && <span className="ml-1.5 text-[11px] font-normal text-slate-500">Lead</span>}</td>
                <td className="px-2 py-2 text-right font-semibold tabular-nums">{p.done}</td>
                <td className="px-2 py-2 text-right tabular-nums">{p.doing}</td>
                <td className="px-2 py-2 text-right tabular-nums">{p.todo}</td>
                <td className="px-2 py-2 text-right tabular-nums">{p.overdue || ""}</td>
                <td className="px-2 py-2 text-right tabular-nums">{p.comments}</td>
                {github && <td className="px-2 py-2 text-right tabular-nums">{p.github ? p.commits : "–"}</td>}
                {github && <td className="py-2 pl-2 text-right tabular-nums">{p.github ? p.pullRequests : "–"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {github && people.some((p) => !p.github) && (
          <p className="mt-2 text-[12px] text-slate-500">– means this person hasn&apos;t connected GitHub in Ruvano, so their commits can&apos;t be matched yet.</p>
        )}

        <h2 className="mt-8 text-[15px] font-semibold">Finished tasks</h2>
        <p className="text-[12px] text-slate-500">{total} in all, by the person they were assigned to.</p>
        {people.filter((p) => p.finished.length).map((p) => (
          <section key={p.id} className="mt-4 break-inside-avoid">
            <h3 className="text-[13px] font-semibold">{p.name}</h3>
            <ul className="mt-1 divide-y divide-slate-100 text-[13px]">
              {p.finished.map((t) => (
                <li key={t.key} className="flex gap-3 py-1.5">
                  <span className="w-16 shrink-0 font-mono text-[11.5px] text-slate-500">{t.key}</span>
                  <span className="min-w-0 flex-1">{t.title}</span>
                  {t.at && <span className="shrink-0 text-[12px] text-slate-500">{fmt(t.at)}</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="mt-10 border-t border-slate-200 pt-3 text-[11px] text-slate-500">From the project board in Ruvano. Tasks count for whoever they were assigned to when finished.</p>
      </div>
    </div>
  );
}
