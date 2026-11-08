import Link from "next/link";
import { CircleAlert, CircleCheck, Github } from "lucide-react";
import type { Role } from "@prisma/client";
import { Avatar } from "@/components/IssueBits";
import { canManageProject } from "@/lib/permissions";

const AGO = [[86400, "d"], [3600, "h"], [60, "m"]] as const;
const ago = (date: Date) => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const unit = AGO.find(([size]) => seconds >= size);
  return unit ? `${Math.floor(seconds / unit[0])}${unit[1]} ago` : "just now";
};
const EVENT: Record<string, string> = { ping: "Test ping", push: "Push", pull_request: "Pull request", create: "New branch" };

/** Whether GitHub is really connected, and when Karya last heard from it. */
export function GithubStatus({ projects, me, offerConnect = true }: {
  projects: { id: string; key: string; leadId: string | null; workspaceId: string; githubRepo: string | null; githubLastEventAt: Date | null; githubLastEventType: string | null }[];
  me: { id: string; role: Role; workspaceId: string };
  offerConnect?: boolean;
}) {
  const connected = projects.filter((p) => p.githubRepo);
  const canConnect = offerConnect ? projects.find((p) => !p.githubRepo && canManageProject(me, p)) : undefined;
  if (connected.length === 0 && !canConnect) return null;
  return (
    <section>
      <h2 className="section-title mb-2 flex items-center gap-1.5"><Github size={14} />GitHub</h2>
      <div className="card divide-y divide-slate-100 dark:divide-slate-800">
        {connected.map((p) => (
          <Link key={p.id} href={`/projects/${p.key}/settings`} className="block px-3 py-2.5 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800/40">
            <span className="block truncate font-medium">{p.githubRepo}</span>
            {p.githubLastEventAt ? (
              <span className="mt-0.5 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400"><CircleCheck size={12} className="shrink-0" />Connected · {EVENT[p.githubLastEventType ?? ""] ?? "Event"} {ago(p.githubLastEventAt)}</span>
            ) : (
              <span className="mt-0.5 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400"><CircleAlert size={12} className="shrink-0" />Connected · waiting for the first event</span>
            )}
          </Link>
        ))}
        {connected.length === 0 && canConnect && (
          <Link href={`/projects/${canConnect.key}/settings`} className="block px-3 py-2.5 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800/40">
            <span className="font-medium text-brand">Connect a repository</span>
            <span className="mt-0.5 block text-xs text-muted">Pull requests then move issues on their own.</span>
          </Link>
        )}
      </div>
    </section>
  );
}

const VERB: Record<string, string> = {
  title: "renamed", description: "edited", type: "changed the type of", statusId: "moved",
  priority: "reprioritised", assigneeId: "reassigned", storyPoints: "re-estimated", dueDate: "rescheduled",
  startDate: "rescheduled", labels: "relabelled", parentId: "moved", sprintId: "re-planned", created: "created",
  attachment: "attached files to", link: "linked",
};

/** Recent changes by other people, newest first. */
export function ActivityFeed({ items, title = "From your team" }: {
  title?: string;
  items: { id: string; field: string; to: string | null; actor: { name: string }; issue: { key: string; title: string } }[];
}) {
  return (
    <section>
      <h2 className="section-title mb-2">{title}</h2>
      {items.length === 0 ? (
        <p className="text-xs text-muted">Teammates&apos; updates will appear here.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
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
  );
}
