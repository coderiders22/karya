"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/** Everything the side panel needs for one issue, in a single round trip. */
export async function getIssuePeek(key: string) {
  await requireUser();
  const i = await db.issue.findUnique({
    where: { key: key.toUpperCase() },
    include: {
      project: { select: { id: true, key: true, name: true, color: true, staleDays: true, statuses: { orderBy: { position: "asc" }, select: { id: true, name: true, category: true } } } },
      status: { select: { id: true, name: true, category: true } },
      reporter: { select: { name: true } },
      parent: { select: { key: true, title: true } },
      children: { select: { status: { select: { category: true } } } },
      comments: { orderBy: { createdAt: "desc" }, take: 3, include: { author: { select: { name: true } } } },
      linksIn: { where: { type: "BLOCKS" }, select: { from: { select: { key: true, title: true, status: { select: { category: true } } } } } },
      devActivity: { where: { kind: "PULL_REQUEST" }, orderBy: { updatedAt: "desc" }, take: 3, select: { title: true, url: true, state: true, externalId: true } },
      _count: { select: { comments: true, attachments: true } },
    },
  });
  if (!i) return null;
  const users = await db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return {
    id: i.id, key: i.key, title: i.title, description: i.description, type: i.type, priority: i.priority,
    status: i.status, statuses: i.project.statuses, assigneeId: i.assigneeId, users,
    storyPoints: i.storyPoints, dueDate: i.dueDate?.toISOString().slice(0, 10) ?? "", labels: i.labels,
    project: { id: i.project.id, key: i.project.key, name: i.project.name, color: i.project.color },
    staleDays: i.project.staleDays, statusChangedAt: i.statusChangedAt.toISOString(),
    reporter: i.reporter.name, parent: i.parent,
    subtasks: { total: i.children.length, done: i.children.filter((c) => c.status.category === "DONE").length },
    blockers: i.linksIn.map((l) => l.from).filter((f) => f.status.category !== "DONE").map((f) => ({ key: f.key, title: f.title })),
    prs: i.devActivity,
    comments: i.comments.reverse().map((c) => ({ id: c.id, body: c.body, author: c.author.name, at: c.createdAt.toISOString() })),
    commentCount: i._count.comments, attachmentCount: i._count.attachments,
  };
}

export type IssuePeekData = NonNullable<Awaited<ReturnType<typeof getIssuePeek>>>;
