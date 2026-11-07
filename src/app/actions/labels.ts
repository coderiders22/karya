"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/** Labels already used in a project, most used first, for the label picker and # suggestions. */
export async function getProjectLabels(projectId: string): Promise<string[]> {
  await requireUser();
  const rows = await db.$queryRaw<{ l: string }[]>`
    SELECT l FROM (SELECT unnest(labels) AS l FROM "Issue" WHERE "projectId" = ${projectId}) t
    GROUP BY l ORDER BY count(*) DESC, l ASC LIMIT 200`;
  return rows.map((r) => r.l);
}

/** What the create dialog needs to know about a project: its labels and its running sprint. */
export async function getCreateContext(projectId: string) {
  const [labels, sprint] = await Promise.all([
    getProjectLabels(projectId),
    db.sprint.findFirst({ where: { projectId, state: "ACTIVE" }, select: { name: true } }),
  ]);
  return { labels, activeSprint: sprint?.name ?? null };
}
