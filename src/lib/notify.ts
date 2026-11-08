import type { NotificationKind } from "@prisma/client";
import { db } from "./db";
import { projectPeople } from "./permissions";

/** The inbox: the latest 20, and how many are unread. */
export async function loadNotifications(userId: string) {
  const [items, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { name: true } }, issue: { select: { key: true } } },
    }),
    db.notification.count({ where: { userId, readAt: null } }),
  ]);
  return {
    unread,
    items: items.map((n) => ({
      id: n.id, kind: n.kind, message: n.message, actor: n.actor.name,
      href: n.issue ? `/issues/${n.issue.key}` : n.link ?? "/your-work",
      read: !!n.readAt, createdAt: n.createdAt.toISOString(),
    })),
  };
}

export type InboxData = Awaited<ReturnType<typeof loadNotifications>>;

/** Creates in-app notifications for everyone in `userIds` except the person who acted. */
export async function notify(opts: { actorId: string; issueId: string; kind: NotificationKind; message: string; userIds: (string | null | undefined)[] }) {
  const ids = [...new Set(opts.userIds.filter((u): u is string => !!u && u !== opts.actorId))];
  if (ids.length === 0) return;
  await db.notification.createMany({
    data: ids.map((userId) => ({ userId, actorId: opts.actorId, issueId: opts.issueId, kind: opts.kind, message: opts.message })),
  });
}

/** Same, for things that aren't issues (a new assignment, marks, a class notice). */
export async function notifyLink(opts: { actorId: string; link: string; kind: NotificationKind; message: string; userIds: string[] }) {
  const ids = [...new Set(opts.userIds.filter((u) => u !== opts.actorId))];
  if (ids.length === 0) return;
  await db.notification.createMany({
    data: ids.map((userId) => ({ userId, actorId: opts.actorId, link: opts.link, kind: opts.kind, message: opts.message })),
  });
}

export async function watcherIds(issueId: string) {
  const issue = await db.issue.findUnique({
    where: { id: issueId },
    select: { assigneeId: true, reporterId: true, watchers: { select: { id: true } } },
  });
  if (!issue) return [];
  return [issue.assigneeId, issue.reporterId, ...issue.watchers.map((w) => w.id)];
}

export async function watch(issueId: string, userId: string | null | undefined) {
  if (!userId) return;
  await db.issue.update({ where: { id: issueId }, data: { watchers: { connect: { id: userId } } } });
}

/** Finds "@Full Name" mentions of team members in text. */
export async function findMentions(text: string, projectId: string) {
  if (!text.includes("@")) return [];
  const project = await db.project.findUnique({ where: { id: projectId }, select: { id: true, workspaceId: true } });
  if (!project) return [];
  const users = await db.user.findMany({ where: projectPeople(project), select: { id: true, name: true } });
  const lower = text.toLowerCase();
  return users.filter((u) => lower.includes(`@${u.name.toLowerCase()}`)).map((u) => u.id);
}
