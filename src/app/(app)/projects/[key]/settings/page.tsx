import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getProjectByKey } from "@/lib/project";
import { JIRA_DATE_FORMAT } from "@/lib/jiraCsv";
import { StatusEditor } from "@/components/StatusEditor";
import { ProjectDetailsForm } from "@/components/ProjectDetailsForm";
import { GithubConnect } from "@/components/GithubConnect";
import { githubOAuthConfigured, openToken } from "@/lib/githubOAuth";
import { templateById } from "@/lib/templates";
import { canManageProject, projectPeople } from "@/lib/permissions";

export default async function SettingsPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { key } = await params;
  const sp = await searchParams;
  const me = await requireUser();
  const project = await getProjectByKey(key);
  const [counts, users, total] = await Promise.all([
    db.issue.groupBy({ by: ["statusId"], where: { projectId: project.id }, _count: true }),
    db.user.findMany({ where: projectPeople(project), select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.issue.count({ where: { projectId: project.id } }),
  ]);
  const canManage = canManageProject(me, project);
  const countBy = Object.fromEntries(counts.map((c) => [c.statusId, c._count]));
  // Only counts as connected if the stored token still opens (AUTH_SECRET unchanged).
  const gh = await db.githubAccount.findUnique({ where: { userId: me.id } });
  const ghLogin = gh && openToken(gh.token) ? gh.login : null;

  return (
    <main className="max-w-3xl space-y-5 p-4 sm:p-6">
      <section className="card p-5">
        <h2 className="section-title mb-1">Export to Jira</h2>
        <p className="mb-4 text-sm text-muted">
          Download all {total} issues as a CSV file that Jira&apos;s importer reads, including epics, subtasks, sprints, labels, story points and comments.
        </p>
        <a href={`/api/projects/${project.key}/export`} className="btn-primary">Download Jira CSV</a>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium">How to import this file into Jira</summary>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted">
            <li>In Jira, create (or open) the project you want to move into.</li>
            <li>Go to <b>Settings ⚙ → System → External system import → CSV</b> (or in the project: <b>⋯ → Import issues</b>).</li>
            <li>Upload the file. Under advanced settings, set the <b>date format</b> to <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{JIRA_DATE_FORMAT}</code>.</li>
            <li>Pick the target project. On the field mapping screen, map:
              <ul className="mt-1 list-disc pl-5">
                <li><b>Issue Id</b> → Issue Id, <b>Parent Id</b> → Parent Id (keeps epics and subtasks linked)</li>
                <li><b>Summary, Issue Type, Status, Priority, Description, Assignee, Reporter, Labels, Comment, Sprint, Due Date, Created</b> → fields with the same name</li>
                <li><b>Story Points</b> → Story point estimate (or Story Points)</li>
                <li><b>Original Key</b> → a text field, or leave unmapped. Jira gives issues new keys.</li>
              </ul>
            </li>
            <li>Tick <b>Map field value</b> for Status and Issue Type if your Jira uses different names, then run the import.</li>
            <li>Assignees and reporters are matched by email. People who aren&apos;t in your Jira yet can be mapped or invited during import.</li>
          </ol>
        </details>
      </section>

      <GithubConnect
        projectId={project.id}
        projectKey={project.key}
        configured={githubOAuthConfigured()}
        repo={project.githubRepo}
        login={ghLogin}
        status={typeof sp.github === "string" ? sp.github : null}
        automation={project.gitAutomation}
        canManage={canManage}
        lastEventAt={project.githubLastEventAt?.toISOString() ?? null}
        lastEventType={project.githubLastEventType}
        hasHook={!!project.githubHookId}
      />

      <section className="card p-5">
        <h2 className="section-title mb-1">Board columns</h2>
        <p className="mb-4 text-sm text-muted">Each column is a status. Its category decides what counts as done. Set a WIP limit to have the board flag a column that is taking on too much.</p>
        <fieldset disabled={!canManage} className="contents">
          <StatusEditor projectId={project.id} statuses={project.statuses.map((s) => ({ id: s.id, name: s.name, category: s.category, count: countBy[s.id] ?? 0, wipLimit: s.wipLimit }))} />
        </fieldset>
      </section>

      <section className="card p-5">
        <h2 className="section-title mb-4">Project</h2>
        <fieldset disabled={!canManage} className="contents">
          <ProjectDetailsForm
            project={{ id: project.id, name: project.name, description: project.description, leadId: project.leadId, color: project.color, staleDays: project.staleDays, gitAutomation: project.gitAutomation, dueAt: project.dueAt?.toISOString() ?? null }}
            users={users}
            isAdmin={me.role === "ADMIN" && project.workspaceId === me.workspaceId}
            deadlineLabel={me.mode === "STUDENT" ? templateById(project.template)?.deadlineLabel ?? "Deadline" : undefined}
          />
        </fieldset>
      </section>
    </main>
  );
}
