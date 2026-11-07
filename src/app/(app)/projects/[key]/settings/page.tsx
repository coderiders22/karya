import { appUrl } from "@/lib/appUrl";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getProjectByKey } from "@/lib/project";
import { JIRA_DATE_FORMAT } from "@/lib/jiraCsv";
import { StatusEditor } from "@/components/StatusEditor";
import { ProjectDetailsForm } from "@/components/ProjectDetailsForm";

export default async function SettingsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const me = await requireUser();
  const project = await getProjectByKey(key);
  const [counts, users, total] = await Promise.all([
    db.issue.groupBy({ by: ["statusId"], where: { projectId: project.id }, _count: true }),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.issue.count({ where: { projectId: project.id } }),
  ]);
  const countBy = Object.fromEntries(counts.map((c) => [c.statusId, c._count]));

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

      <section className="card p-5">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="section-title">GitHub</h2>
          <span className={`chip ${process.env.GITHUB_WEBHOOK_SECRET ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
            {process.env.GITHUB_WEBHOOK_SECRET ? "Ready" : "Not configured"}
          </span>
        </div>
        <p className="mb-3 text-sm text-muted">
          Mention an issue key (for example <code className="font-mono">{project.key}-12</code>) in a branch name, commit message or pull request title.
          Karya links it to the issue{project.gitAutomation ? ", moves it to review when the PR opens, and to done when it merges" : ""}.
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-[13px] text-slate-700 dark:text-slate-300">
          {!process.env.GITHUB_WEBHOOK_SECRET && <li>On the server, set <code className="font-mono">GITHUB_WEBHOOK_SECRET</code> to a random string and restart Karya.</li>}
          <li>In your GitHub repository, open <b>Settings → Webhooks → Add webhook</b>.</li>
          <li>Payload URL: <code className="select-all break-all rounded bg-slate-100 px-1 font-mono text-[12px] dark:bg-slate-800">{appUrl()}/api/integrations/github</code>, content type <code className="font-mono">application/json</code>, and the same secret.</li>
          <li>Choose <b>Pushes</b>, <b>Pull requests</b> and <b>Branch or tag creation</b>.</li>
        </ol>
      </section>

      <section className="card p-5">
        <h2 className="section-title mb-1">Board columns</h2>
        <p className="mb-4 text-sm text-muted">Each column is a status. Its category decides what counts as done. Set a WIP limit to have the board flag a column that is taking on too much.</p>
        <StatusEditor projectId={project.id} statuses={project.statuses.map((s) => ({ id: s.id, name: s.name, category: s.category, count: countBy[s.id] ?? 0, wipLimit: s.wipLimit }))} />
      </section>

      <section className="card p-5">
        <h2 className="section-title mb-4">Project</h2>
        <ProjectDetailsForm
          project={{ id: project.id, name: project.name, description: project.description, leadId: project.leadId, color: project.color, staleDays: project.staleDays, gitAutomation: project.gitAutomation }}
          users={users}
          isAdmin={me.role === "ADMIN"}
        />
      </section>
    </main>
  );
}
