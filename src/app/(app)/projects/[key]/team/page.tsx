import Link from "next/link";
import { notFound } from "next/navigation";
import { appUrl } from "@/lib/appUrl";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageProject } from "@/lib/permissions";
import { contributions } from "@/lib/contribution";
import { getProjectByKey } from "@/lib/project";
import { FileText } from "lucide-react";
import { Avatar } from "@/components/IssueBits";
import { LeaveProject, RemoveTeammate, TeamLink } from "@/components/StudentProjects";

export const metadata = { title: "Team" };

/** Who's on the project and who is doing what. It also settles "who actually did the work" before a viva. */
export default async function TeamPage({ params }: { params: Promise<{ key: string }> }) {
  const me = await requireUser();
  if (me.mode !== "STUDENT") notFound();
  const project = await getProjectByKey((await params).key);
  const canManage = canManageProject(me, project);
  const [rows, members, unassignedIssues] = await Promise.all([
    contributions(project),
    db.projectMember.findMany({ where: { projectId: project.id }, select: { user: { select: { id: true, workspaceId: true } } } }),
    db.issue.findMany({ where: { projectId: project.id, type: { not: "EPIC" }, assigneeId: null, status: { category: { not: "DONE" } } }, select: { id: true } }),
  ]);
  const workspaceOf = Object.fromEntries(members.map((m) => [m.user.id, m.user.workspaceId]));
  const github = !!project.githubRepo;
  const openUnassigned = unassignedIssues.length;

  return (
    <main className="max-w-3xl space-y-6 p-4 sm:p-6">
      {project.joinCode && <TeamLink projectId={project.id} projectName={project.name} link={`${appUrl()}/join/${project.joinCode}`} canReset={canManage} />}
      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="section-title">Who's doing what</h2>
          <Link href={`/report/${project.key}`} className="btn !h-7 text-xs"><FileText size={13} />Contribution report</Link>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[26rem] text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-muted dark:border-slate-800">
                <th scope="col" className="px-3 py-2 text-left font-medium">Person</th>
                <th scope="col" className="w-14 px-2 py-2 text-right font-medium">To do</th>
                <th scope="col" className="w-14 px-2 py-2 text-right font-medium">Doing</th>
                <th scope="col" className="w-14 px-2 py-2 text-right font-medium">Done</th>
                {github && <th scope="col" className="w-16 px-2 py-2 text-right font-medium" title="Commits by people who connected GitHub in Ruvano">Commits</th>}
                {canManage && <th scope="col" className="w-20"><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((p) => (
                <tr key={p.id}>
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={p.name} size={6} />
                      <span className="min-w-0 truncate font-medium">{p.name}</span>
                      {p.id === project.leadId && <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Lead</span>}
                      {p.overdue > 0 && <span className="chip whitespace-nowrap bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">{p.overdue} overdue</span>}
                    </span>
                  </th>
                  <td className="px-2 py-2 text-right tabular-nums">{p.todo}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{p.doing}</td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums">{p.done}</td>
                  {github && <td className="px-2 py-2 text-right tabular-nums text-muted">{p.github ? p.commits : "–"}</td>}
                  {canManage && (
                    <td className="px-2 py-1 text-right">
                      {p.id !== project.leadId && workspaceOf[p.id] !== project.workspaceId && <RemoveTeammate projectId={project.id} userId={p.id} name={p.name} />}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {openUnassigned > 0 && (
          <p className="mt-2 text-[13px] text-muted">
            <span className="font-medium text-slate-900 dark:text-white">{openUnassigned} {openUnassigned === 1 ? "task has" : "tasks have"} nobody on {openUnassigned === 1 ? "it" : "them"}.</span>{" "}
            <Link href={`/projects/${project.key}/board`} className="text-brand hover:underline">Assign them on the board</Link>
          </p>
        )}
        {rows.length === 1 && <p className="mt-2 text-[13px] text-muted">Just you so far. Share the link above and teammates appear here as they join.</p>}
      </section>
      {project.workspaceId !== me.workspaceId && project.leadId !== me.id && (
        <div className="border-t border-slate-200 pt-4 dark:border-slate-800"><LeaveProject projectId={project.id} name={project.name} /></div>
      )}
    </main>
  );
}
