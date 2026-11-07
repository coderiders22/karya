"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function getNotifications() {
  const user = await requireUser();
  const [items, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { name: true } }, issue: { select: { key: true } } },
    }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  return {
    unread,
    items: items.map((n) => ({
      id: n.id, kind: n.kind, message: n.message, actor: n.actor.name, issueKey: n.issue.key,
      read: !!n.readAt, createdAt: n.createdAt.toISOString(),
    })),
  };
}

export async function markNotificationsRead(ids?: string[]) {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null, ...(ids && { id: { in: ids } }) },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
}
