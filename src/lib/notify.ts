import type { NotificationKind } from "@prisma/client";
import { db } from "./db";

/** Creates in-app notifications for everyone in `userIds` except the person who acted. */
export async function notify(opts: { actorId: string; issueId: string; kind: NotificationKind; message: string; userIds: (string | null | undefined)[] }) {
  const ids = [...new Set(opts.userIds.filter((u): u is string => !!u && u !== opts.actorId))];
  if (ids.length === 0) return;
  await db.notification.createMany({
    data: ids.map((userId) => ({ userId, actorId: opts.actorId, issueId: opts.issueId, kind: opts.kind, message: opts.message })),
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
export async function findMentions(text: string) {
  if (!text.includes("@")) return [];
  const users = await db.user.findMany({ select: { id: true, name: true } });
  const lower = text.toLowerCase();
  return users.filter((u) => lower.includes(`@${u.name.toLowerCase()}`)).map((u) => u.id);
}
