import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Hourglass } from "lucide-react";
import { db } from "@/lib/db";
import { usesBlob } from "@/lib/storage";
import { requireUser } from "@/lib/auth";
import { ISSUE_TYPES, PRIORITIES } from "@/lib/constants";
import { describeLink } from "@/lib/links";
import { Avatar, IssueKey, PriorityIcon, StatusPill, TypeIcon } from "@/components/IssueBits";
import { Markdown } from "@/components/Markdown";
import {
  CommentBox, CopyLink, DeleteCommentButton, DeleteIssueButton, DescriptionEditor, EditableTitle, FieldInput, FieldSelect, IssueHotkeys,
} from "@/components/IssueEditor";
import { CreateChildButton } from "@/components/CreateChildButton";
import { Attachments, LinkedIssues, WatchButton } from "@/components/IssueExtras";
import { ProjectBadge } from "@/components/Sidebar";
import { DevPanel } from "@/components/DevPanel";

const FIELD_LABEL: Record<string, string> = {
  title: "title", description: "description", type: "type", statusId: "status", priority: "priority",
  assigneeId: "assignee", storyPoints: "estimate", dueDate: "due date", startDate: "start date", labels: "labels", parentId: "parent", sprintId: "sprint",
};

const ago = (d: Date) => {
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  return { title: (await params).key.toUpperCase() };
}

export default async function IssuePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const me = await requireUser();
  const issue = await db.issue.findUnique({
    where: { key: key.toUpperCase() },
    include: {
      project: { include: { statuses: { orderBy: { position: "asc" } } } },
      status: true,
      assignee: true,
      reporter: true,
      parent: { select: { id: true, key: true, title: true, type: true } },
      children: { include: { status: true, assignee: true }, orderBy: { number: "asc" } },
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      activities: { include: { actor: true }, orderBy: { createdAt: "desc" }, take: 50 },
      attachments: { include: { uploader: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
      watchers: { select: { id: true } },
      linksOut: { include: { to: { select: { key: true, title: true, type: true, status: true } } } },
      linksIn: { include: { from: { select: { key: true, title: true, type: true, status: true } } } },
      devActivity: { orderBy: { updatedAt: "desc" } },
    },
  });
  if (!issue) notFound();
  const [users, sprints, parents] = await Promise.all([
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.sprint.findMany({ where: { projectId: issue.projectId, state: { not: "CLOSED" } }, select: { id: true, name: true } }),
    db.issue.findMany({
      where: { projectId: issue.projectId, id: { not: issue.id }, type: issue.type === "SUBTASK" ? { not: "SUBTASK" } : "EPIC" },
      select: { id: true, key: true, title: true },
      orderBy: { number: "desc" },
      take: 200,
    }),
  ]);
  const done = issue.children.filter((c) => c.status.category === "DONE").length;
  const links = [
    ...issue.linksOut.map((l) => ({ id: l.id, relation: describeLink(l.type, true), issue: l.to })),
    ...issue.linksIn.map((l) => ({ id: l.id, relation: describeLink(l.type, false), issue: l.from })),
  ];
  const inStatusDays = Math.floor((Date.now() - issue.statusChangedAt.getTime()) / 86400000);
  const stale = issue.status.category === "IN_PROGRESS" && inStatusDays >= issue.project.staleDays;

  // One timeline: comments and history interleaved, oldest first.
  const timeline = [
    ...issue.comments.map((c) => ({ kind: "comment" as const, at: c.createdAt, c })),
    ...issue.activities.map((a) => ({ kind: "activity" as const, at: a.createdAt, a })),
  ].sort((x, y) => x.at.getTime() - y.at.getTime());

  return (
    <div>
      <IssueHotkeys issueId={issue.id} meId={me.id} />
      <header className="flex h-12 min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap border-b border-slate-200 px-4 text-[13px] sm:px-6 dark:border-slate-800">
        <ProjectBadge p={issue.project} size={18} />
        <Link href={`/projects/${issue.project.key}/board`} className="hidden truncate text-slate-500 hover:text-slate-900 sm:inline dark:hover:text-white">{issue.project.name}</Link>
        {issue.parent && (
          <>
            <ChevronRight size={14} className="text-slate-400" />
            <Link href={`/issues/${issue.parent.key}`} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white">
              <TypeIcon type={issue.parent.type} />{issue.parent.key}
            </Link>
          </>
        )}
        <ChevronRight size={14} className="text-slate-400" />
        <span className="flex items-center gap-1.5 font-medium"><TypeIcon type={issue.type} />{issue.key}</span>
        <div className="flex-1" />
        <CopyLink issueKey={issue.key} />
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="mx-auto w-full min-w-0 max-w-[920px] space-y-8 px-4 py-5 sm:px-6 sm:py-6 xl:px-10">
          <div>
            <EditableTitle issueId={issue.id} title={issue.title} />
            <div className="mt-4">
              <DescriptionEditor issueId={issue.id} description={issue.description} users={users}>
                <Markdown>{issue.description}</Markdown>
              </DescriptionEditor>
            </div>
          </div>

          {issue.type !== "SUBTASK" && (
            <section>
              <div className="mb-2 flex items-center gap-3">
                <h3 className="section-title whitespace-nowrap">{issue.type === "EPIC" ? "Issues in this epic" : "Sub-issues"}</h3>
                {issue.children.length > 0 && (
                  <span className="flex items-center gap-2 text-xs text-muted">
                    <span className="h-1 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <span className="block h-full bg-emerald-500" style={{ width: `${(done / issue.children.length) * 100}%` }} />
                    </span>
                    {done}/{issue.children.length}
                  </span>
                )}
                <div className="flex-1" />
                <CreateChildButton projectId={issue.projectId} parentId={issue.id} isEpic={issue.type === "EPIC"} />
              </div>
              {issue.children.length > 0 && (
                <ul className="card divide-y divide-slate-100 dark:divide-slate-800">
                  {issue.children.map((c) => (
                    <li key={c.id} className="flex h-10 items-center gap-3 px-3 text-[13px]">
                      <TypeIcon type={c.type} />
                      <Link href={`/issues/${c.key}`} className="w-16 shrink-0 hover:underline"><IssueKey k={c.key} /></Link>
                      <Link href={`/issues/${c.key}`} className="flex-1 truncate hover:underline">{c.title}</Link>
                      <PriorityIcon priority={c.priority} />
                      <Avatar name={c.assignee?.name} size={5} />
                      <StatusPill name={c.status.name} category={c.status.category} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <Attachments
            issueId={issue.id}
            direct={usesBlob()}
            items={issue.attachments.map((a) => ({
              id: a.id, filename: a.filename, mimeType: a.mimeType, size: a.size, uploader: a.uploader.name,
              canDelete: a.uploaderId === me.id || me.role === "ADMIN",
            }))}
          />

          <LinkedIssues issueId={issue.id} links={links} />

          <section>
            <h3 className="section-title mb-4">Activity</h3>
            <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-3 before:top-2 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
              {timeline.map((t) =>
                t.kind === "comment" ? (
                  <li key={t.c.id} className="relative flex gap-3">
                    <span className="relative z-10 ring-4 ring-white dark:ring-slate-900"><Avatar name={t.c.author.name} size={6} /></span>
                    <div className="card min-w-0 flex-1 px-3 py-2.5">
                      <div className="mb-1 flex items-center gap-2 text-xs">
                        <span className="font-medium text-slate-900 dark:text-slate-100">{t.c.author.name}</span>
                        <span className="text-muted" title={t.c.createdAt.toLocaleString()}>{ago(t.c.createdAt)}</span>
                        <div className="flex-1" />
                        {(t.c.authorId === me.id || me.role === "ADMIN") && <DeleteCommentButton commentId={t.c.id} />}
                      </div>
                      <Markdown>{t.c.body}</Markdown>
                    </div>
                  </li>
                ) : (
                  <li key={t.a.id} className="relative flex items-center gap-3 text-xs text-muted">
                    <span className="relative z-10 grid size-6 place-items-center"><span className="size-2 rounded-full bg-slate-300 ring-4 ring-white dark:bg-slate-600 dark:ring-slate-900" /></span>
                    <span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{/\(PR #\d+ \w+\)$/.test(t.a.to ?? "") ? "GitHub" : t.a.actor.name}</span>{" "}
                      {t.a.field === "created" ? (t.a.to ? t.a.to.toLowerCase() : "created the issue")
                        : t.a.field === "description" ? "edited the description"
                        : t.a.field === "attachment" ? <>attached {t.a.to}</>
                        : t.a.field === "link" ? <>linked: {t.a.to}</>
                        : <>changed {FIELD_LABEL[t.a.field] ?? t.a.field} to <span className="font-medium text-slate-700 dark:text-slate-300">{t.a.to}</span></>}
                      <span className="ml-2" title={t.a.createdAt.toLocaleString()}>{ago(t.a.createdAt)}</span>
                    </span>
                  </li>
                ),
              )}
              <li className="relative flex gap-3">
                <span className="relative z-10 ring-4 ring-white dark:ring-slate-900"><Avatar name={me.name} size={6} /></span>
                <div className="flex-1"><CommentBox issueId={issue.id} users={users} /></div>
              </li>
            </ol>
          </section>
        </main>

        <aside className="space-y-3 border-t border-slate-200 bg-slate-50/50 p-4 xl:min-h-[calc(100vh-3rem)] xl:border-l xl:border-t-0 dark:border-slate-800 dark:bg-slate-900/30">
          <div className="flex gap-2">
            <WatchButton issueId={issue.id} watching={issue.watchers.some((w) => w.id === me.id)} count={issue.watchers.length} />
          </div>
          {issue.status.category !== "DONE" && (
            <div className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-xs ${stale ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" : "text-muted"}`}>
              <Hourglass size={13} />
              {inStatusDays === 0 ? `Moved to ${issue.status.name} today` : `${inStatusDays} day${inStatusDays === 1 ? "" : "s"} in ${issue.status.name}`}
              {stale && " · looks stuck"}
            </div>
          )}
          <div className="card divide-y divide-slate-100 px-2 py-1 dark:divide-slate-800">
            <Prop label="Status">
              <FieldSelect issueId={issue.id} field="statusId" value={issue.statusId} options={issue.project.statuses.map((s) => ({ value: s.id, label: s.name }))} />
            </Prop>
            <Prop label="Assignee" hint="M">
              <FieldSelect issueId={issue.id} field="assigneeId" value={issue.assigneeId ?? ""}
                options={[{ value: "", label: "Unassigned" }, ...users.map((u) => ({ value: u.id, label: u.id === me.id ? `${u.name} (me)` : u.name }))]} />
            </Prop>
            <Prop label="Priority">
              <FieldSelect issueId={issue.id} field="priority" value={issue.priority} options={PRIORITIES.map((p) => ({ value: p.value, label: p.label }))} />
            </Prop>
            <Prop label="Type">
              <FieldSelect issueId={issue.id} field="type" value={issue.type} options={ISSUE_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
            </Prop>
            <Prop label="Estimate">
              <FieldInput issueId={issue.id} field="storyPoints" type="number" value={issue.storyPoints?.toString() ?? ""} placeholder="No estimate" />
            </Prop>
            <Prop label="Sprint">
              <FieldSelect issueId={issue.id} field="sprintId" value={issue.sprintId ?? ""} options={[{ value: "", label: "Backlog" }, ...sprints.map((s) => ({ value: s.id, label: s.name }))]} />
            </Prop>
            {issue.type !== "EPIC" && (
              <Prop label={issue.type === "SUBTASK" ? "Parent" : "Epic"}>
                <FieldSelect issueId={issue.id} field="parentId" value={issue.parentId ?? ""}
                  options={[{ value: "", label: "None" }, ...parents.map((p) => ({ value: p.id, label: `${p.key} ${p.title}`.slice(0, 50) }))]} />
              </Prop>
            )}
            <Prop label="Labels">
              <FieldInput issueId={issue.id} field="labels" value={issue.labels.join(", ")} placeholder="Add labels" />
            </Prop>
            <Prop label="Start">
              <FieldInput issueId={issue.id} field="startDate" type="date" value={issue.startDate?.toISOString().slice(0, 10) ?? ""} />
            </Prop>
            <Prop label="Due">
              <FieldInput issueId={issue.id} field="dueDate" type="date" value={issue.dueDate?.toISOString().slice(0, 10) ?? ""} />
            </Prop>
            <Prop label="Reporter">
              <div className="flex h-8 items-center gap-2 px-2 text-[13px]"><Avatar name={issue.reporter.name} size={5} />{issue.reporter.name}</div>
            </Prop>
          </div>

          <DevPanel issueKey={issue.key} title={issue.title} items={issue.devActivity.map((d) => ({ ...d, kind: d.kind }))} />

          <div className="space-y-0.5 px-1 text-[11.5px] text-muted">
            <div>Created {issue.createdAt.toLocaleString()}</div>
            <div>Updated {ago(issue.updatedAt)}</div>
            {issue.resolvedAt && <div>Resolved {issue.resolvedAt.toLocaleString()}</div>}
          </div>
          <DeleteIssueButton issueId={issue.id} issueKey={issue.key} projectKey={issue.project.key} />
        </aside>
      </div>
    </div>
  );
}

function Prop({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="grid grid-cols-[84px_1fr] items-center gap-1 py-0.5">
      <span className="flex items-center gap-1 pl-1 text-xs text-muted">{label}{hint && <span className="kbd !h-4 !min-w-4 !text-[10px]">{hint}</span>}</span>
      {children}
    </div>
  );
}
