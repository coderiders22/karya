import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { recordDev } from "./github";
import { notify, watcherIds } from "./notify";
import { projectPeople } from "./permissions";

export type GithubIssue = {
  number: number;
  title: string;
  body?: string | null;
  state: string;
  html_url: string;
  updated_at?: string;
  user?: { login?: string } | null;
  labels?: ({ name?: string } | string)[];
  assignee?: { login?: string } | null;
  assignees?: { login?: string }[];
  /** GitHub's issues API returns pull requests too, marked with this. */
  pull_request?: unknown;
};

export type SyncResult = "added" | "updated" | "skipped";

/** What GitHub last said about the title and text, so a change made in Karya isn't overwritten by an unrelated GitHub update. */
const seenHash = (i: GithubIssue) => createHash("sha256").update(`${i.title}\n${i.body ?? ""}`).digest("hex").slice(0, 32);
const cleanBody = (i: GithubIssue) => (i.body ?? "").replace(/\r\n?/g, "\n").slice(0, 20000);
const labelsOf = (i: GithubIssue) => [...new Set((i.labels ?? [])
  .map((l) => (typeof l === "string" ? l : l.name ?? "").trim().toLowerCase().replace(/\s+/g, "-"))
  .filter(Boolean))];

/** Someone on the team who has linked this GitHub login. GitHub usernames say nothing about who that is in Karya otherwise. */
async function assigneeFrom(project: { id: string; workspaceId: string }, issue: GithubIssue) {
  const logins = [issue.assignee?.login, ...(issue.assignees ?? []).map((a) => a.login)].filter((l): l is string => !!l);
  if (logins.length === 0) return null;
  const account = await db.githubAccount.findFirst({
    where: { login: { in: logins, mode: "insensitive" }, user: projectPeople(project) },
    select: { userId: true },
  });
  return account?.userId ?? null;
}

/**
 * Brings one GitHub issue onto the board, or updates its card. Goes one way only: GitHub to Karya.
 * Safe to run twice for the same issue, because GitHub can deliver an event more than once.
 *
 * A card only changes column when the issue's state changes on GitHub. So a card moved to Done in
 * Karya stays there, even though its GitHub issue is still open.
 */
export async function syncGithubIssue(projectId: string, issue: GithubIssue, opts: { action?: string; announce?: boolean } = {}): Promise<SyncResult> {
  if (issue.pull_request || !issue.number || !issue.title) return "skipped";
  const project = await db.project.findUniqueOrThrow({ where: { id: projectId }, include: { statuses: { orderBy: { position: "asc" } } } });
  const actor = (project.leadId && await db.user.findUnique({ where: { id: project.leadId }, select: { id: true } }))
    || await db.user.findFirst({ where: { workspaceId: project.workspaceId, role: "ADMIN" }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!actor) return "skipped";

  const repo = project.githubRepo ?? "";
  const state = issue.state === "closed" ? "closed" : "open";
  const dev = { title: issue.title.slice(0, 200), url: issue.html_url, state, author: issue.user?.login ?? "", repo };
  const externalId = `${repo}#${issue.number}`;
  const existing = await db.issue.findUnique({
    where: { projectId_githubNumber: { projectId, githubNumber: issue.number } },
    include: { status: true, devActivity: { where: { kind: "ISSUE" }, take: 1 } },
  });

  if (!existing) {
    // Old closed issues stay on GitHub: a board is for work still to do.
    if (state === "closed") return "skipped";
    const first = project.statuses.find((s) => s.category === "TODO") ?? project.statuses[0];
    if (!first) return "skipped";
    const labels = labelsOf(issue);
    const assigneeId = await assigneeFrom(project, issue);
    // Boards show the running sprint, so this is what makes the new card visible on them.
    const sprint = await db.sprint.findFirst({ where: { projectId, state: "ACTIVE" }, select: { id: true } });
    let created;
    try {
      created = await db.$transaction(async (tx) => {
        const counted = await tx.project.update({ where: { id: projectId }, data: { issueCounter: { increment: 1 } } });
        const top = await tx.issue.aggregate({ where: { projectId }, _max: { rank: true } });
        return tx.issue.create({
          data: {
            projectId, number: counted.issueCounter, key: `${counted.key}-${counted.issueCounter}`,
            title: issue.title.slice(0, 255), description: cleanBody(issue),
            type: labels.includes("bug") ? "BUG" : "TASK",
            statusId: first.id, reporterId: actor.id, assigneeId, sprintId: sprint?.id ?? null, labels,
            rank: (top._max.rank ?? 0) + 1000,
            githubNumber: issue.number, githubSeenHash: seenHash(issue),
            watchers: assigneeId ? { connect: [{ id: assigneeId }] } : undefined,
            activities: { create: { actorId: actor.id, field: "created" } },
          },
        });
      });
    } catch (e) {
      // The webhook and a manual fetch reached the same new issue at once. The other one added it.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return "skipped";
      throw e;
    }
    await recordDev(created.id, "ISSUE", externalId, dev);
    if (opts.announce) {
      const people = [...new Set([project.leadId, assigneeId].filter((id): id is string => !!id))];
      if (people.length) {
        await db.notification.createMany({
          data: people.map((userId) => ({ userId, actorId: actor.id, issueId: created.id, kind: "GITHUB_ISSUE" as const, message: `GitHub issue #${issue.number} added to ${project.name}: ${created.title}` })),
        });
      }
    }
    return "added";
  }

  const lastState = existing.devActivity[0]?.state ?? "open";
  const data: Prisma.IssueUncheckedUpdateInput = {};
  const hash = seenHash(issue);
  if (hash !== existing.githubSeenHash) Object.assign(data, { title: issue.title.slice(0, 255), description: cleanBody(issue), githubSeenHash: hash });
  if (opts.action === "labeled") {
    const missing = labelsOf(issue).filter((l) => !existing.labels.includes(l));
    if (missing.length) data.labels = [...existing.labels, ...missing];
  }
  if (opts.action === "assigned") {
    const assigneeId = await assigneeFrom(project, issue);
    if (assigneeId) data.assigneeId = assigneeId;
  }
  if (opts.action === "unassigned" && !issue.assignee && !issue.assignees?.length) data.assigneeId = null;

  let moved: string | undefined;
  const now = new Date();
  const target = state === "closed" && lastState !== "closed" && existing.status.category !== "DONE"
    ? project.statuses.find((s) => s.category === "DONE")
    : state === "open" && lastState === "closed" && existing.status.category === "DONE"
      ? project.statuses.find((s) => s.category === "TODO") ?? project.statuses[0]
      : undefined;
  if (target) {
    const reason = state === "closed" ? "closed on GitHub" : "reopened on GitHub";
    Object.assign(data, {
      statusId: target.id, statusChangedAt: now, resolvedAt: target.category === "DONE" ? now : null,
      activities: { create: { actorId: actor.id, field: "statusId", from: existing.status.name, to: `${target.name} (${reason})` } },
    });
    moved = `${existing.key} moved to ${target.name}: ${reason}`;
  }
  const changed = Object.keys(data).length > 0;
  if (changed) await db.issue.update({ where: { id: existing.id }, data });
  await recordDev(existing.id, "ISSUE", externalId, dev);
  if (moved && opts.announce) {
    await notify({ actorId: actor.id, issueId: existing.id, kind: "STATUS_CHANGED", userIds: await watcherIds(existing.id), message: moved });
  }
  return changed ? "updated" : "skipped";
}
