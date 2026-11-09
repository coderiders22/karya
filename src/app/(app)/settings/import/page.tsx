import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ImportForm } from "@/components/ImportForm";
import { PageHeader } from "@/components/PageHeader";
import { notFound } from "next/navigation";

export default async function ImportPage() {
  const me = await requireUser();
  if (me.role !== "ADMIN") return <main className="p-4 sm:p-6 text-sm text-muted">Only admins can import or back up data.</main>;
  if (me.mode === "STUDENT") notFound();
  const projects = await db.project.findMany({ where: { workspaceId: me.workspaceId }, select: { id: true, key: true, name: true }, orderBy: { name: "asc" } });
  return (
    <main>
      <PageHeader title="Import & backup" description="Bring work in from Jira, or take a copy of everything out." />
      <div className="max-w-2xl space-y-6 p-4 sm:p-6">

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Import from Jira</h2>
          <p className="mt-1 text-sm text-muted">
            In Jira, open <b>Filters → View all issues</b>, filter to your project, then <b>Export → Export CSV (all fields)</b>. Upload that file here.
            Issue types, statuses, priorities, descriptions, labels, story points, sprints, comments, epics and subtasks are brought over.
            People are matched to Ruvano accounts by email or name, so invite your team first.
          </p>
        </div>
        <ImportForm projects={projects} maxBytes={process.env.VERCEL ? 4 * 1024 * 1024 : undefined} />
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold">Backup</h2>
        <p className="text-sm text-muted">
          Download everything in this workspace (projects, issues, comments, sprints, people without passwords) as one JSON file.
        </p>
        <a href="/api/backup" className="btn">Download JSON backup</a>
        <p className="text-sm text-muted">To move a single project to Jira, use <b>Project settings → Download Jira CSV</b>.</p>
      </section>
      </div>
    </main>
  );
}
