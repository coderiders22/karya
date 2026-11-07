import { createHmac, timingSafeEqual } from "crypto";
import type { DevKind } from "@prisma/client";
import { db } from "./db";
import { notify, watcherIds } from "./notify";

export function verifySignature(body: string, header: string | null, secret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const expected = Buffer.from("sha256=" + createHmac("sha256", secret).update(body).digest("hex"));
  const got = Buffer.from(header);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/** Finds issue keys like WR-12 (case-insensitive, so branch names like wr-12-fix work). */
export async function findIssues(...texts: (string | null | undefined)[]) {
  const keys = new Set<string>();
  for (const t of texts) for (const m of (t ?? "").matchAll(/\b([a-z][a-z0-9]{1,9}-\d+)\b/gi)) keys.add(m[1].toUpperCase());
  if (keys.size === 0) return [];
  return db.issue.findMany({
    where: { key: { in: [...keys] } },
    include: { status: true, project: { include: { statuses: { orderBy: { position: "asc" } } } } },
  });
}

export async function recordDev(issueId: string, kind: DevKind, externalId: string, data: { title: string; url: string; state?: string; author?: string; repo?: string }) {
  await db.devActivity.upsert({
    where: { issueId_kind_externalId: { issueId, kind, externalId } },
    create: { issueId, kind, externalId, ...data },
    update: data,
  });
}

type Issue = Awaited<ReturnType<typeof findIssues>>[number];

/** Moves an issue forward (never backward) in response to PR events. */
export async function autoTransition(issue: Issue, target: "review" | "done", reason: string) {
  if (!issue.project.gitAutomation) return;
  const statuses = issue.project.statuses;
  const next = target === "done"
    ? statuses.find((s) => s.category === "DONE")
    : statuses.find((s) => s.category === "IN_PROGRESS" && /review|qa|test/i.test(s.name)) ?? statuses.find((s) => s.category === "IN_PROGRESS");
  if (!next || next.id === issue.statusId || next.position < issue.status.position) return;
  const actor = await db.user.findFirst({ where: { OR: [{ id: issue.project.leadId ?? "" }, { role: "ADMIN" }] }, orderBy: { createdAt: "asc" } });
  if (!actor) return;
  const now = new Date();
  await db.issue.update({
    where: { id: issue.id },
    data: {
      statusId: next.id,
      statusChangedAt: now,
      ...(next.category === "DONE" ? { resolvedAt: issue.resolvedAt ?? now } : {}),
      ...(!issue.startedAt && { startedAt: now }),
      activities: { create: { actorId: actor.id, field: "statusId", from: issue.status.name, to: `${next.name} (${reason})` } },
    },
  });
  await notify({ actorId: actor.id, issueId: issue.id, kind: "STATUS_CHANGED", userIds: await watcherIds(issue.id),
    message: `${issue.key} moved to ${next.name} automatically: ${reason}` });
}
