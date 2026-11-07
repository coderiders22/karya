"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth";

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

/** Anyone on the team can recolor a label; it changes everywhere. */
export async function setLabelColor(name: string, color: string) {
  await requireUser();
  const { isLabelColor } = await import("@/lib/labelColors");
  const label = name.trim();
  if (!label || label.length > 60 || !isLabelColor(color)) throw new Error("Invalid label color");
  await db.labelColor.upsert({ where: { name: label }, create: { name: label, color }, update: { color } });
}

/** Renames a label on every issue that has it (admins only). Its color moves with it. */
export async function renameLabel(from: string, to: string): Promise<{ error?: string }> {
  await requireAdmin();
  const next = to.trim().replace(/[,\s]+/g, "-");
  if (!next) return { error: "Give the label a name" };
  if (next.length > 60) return { error: "Keep label names under 60 characters" };
  if (next === from) return {};
  await db.$transaction(async (tx) => {
    // array_replace, then drop duplicates in case an issue already had the new name too.
    await tx.$executeRaw`
      UPDATE "Issue" SET labels = ARRAY(SELECT DISTINCT unnest(array_replace(labels, ${from}, ${next})))
      WHERE ${from} = ANY(labels)`;
    const color = await tx.labelColor.findUnique({ where: { name: from } });
    if (color) {
      await tx.labelColor.delete({ where: { name: from } });
      await tx.labelColor.upsert({ where: { name: next }, create: { name: next, color: color.color }, update: {} });
    }
  });
  revalidatePath("/", "layout");
  return {};
}

/** Removes a label from every issue (admins only). The issues themselves stay. */
export async function deleteLabel(name: string) {
  await requireAdmin();
  await db.$executeRaw`UPDATE "Issue" SET labels = array_remove(labels, ${name}) WHERE ${name} = ANY(labels)`;
  await db.labelColor.deleteMany({ where: { name } });
  revalidatePath("/", "layout");
}
