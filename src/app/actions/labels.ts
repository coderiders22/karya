"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { projectInWorkspace, requireAdmin, requireEditor, requireUser } from "@/lib/auth";
import { projectPeople } from "@/lib/permissions";

/** Labels already used in a project, most used first, for the label picker and # suggestions. */
export async function getProjectLabels(projectId: string): Promise<string[]> {
  const user = await requireUser();
  await projectInWorkspace(user, projectId);
  const rows = await db.$queryRaw<{ l: string }[]>`
    SELECT l FROM (SELECT unnest(labels) AS l FROM "Issue" WHERE "projectId" = ${projectId}) t
    GROUP BY l ORDER BY count(*) DESC, l ASC LIMIT 200`;
  return rows.map((r) => r.l);
}

/** What the create dialog needs to know about a project: its labels and its running sprint. */
export async function getCreateContext(projectId: string) {
  const me = await requireUser();
  const project = await projectInWorkspace(me, projectId);
  const [labels, sprint, people] = await Promise.all([
    getProjectLabels(projectId),
    db.sprint.findFirst({ where: { projectId, state: "ACTIVE" }, select: { name: true } }),
    db.user.findMany({ where: projectPeople(project), select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return { labels, activeSprint: sprint?.name ?? null, people };
}

/** Anyone on the team can recolor a label; it changes everywhere. */
export async function setLabelColor(name: string, color: string) {
  const user = await requireEditor();
  const { isLabelColor } = await import("@/lib/labelColors");
  const label = name.trim();
  if (!label || label.length > 60 || !isLabelColor(color)) throw new Error("Invalid label color");
  const workspaceId = user.workspaceId;
  await db.labelColor.upsert({ where: { workspaceId_name: { workspaceId, name: label } }, create: { workspaceId, name: label, color }, update: { color } });
}

/** Renames a label on every issue that has it (admins only). Its color moves with it. */
export async function renameLabel(from: string, to: string): Promise<{ error?: string }> {
  const { workspaceId } = await requireAdmin();
  const next = to.trim().replace(/[,\s]+/g, "-");
  if (!next) return { error: "Give the label a name" };
  if (next.length > 60) return { error: "Keep label names under 60 characters" };
  if (next === from) return {};
  await db.$transaction(async (tx) => {
    // array_replace, then drop duplicates in case an issue already had the new name too.
    await tx.$executeRaw`
      UPDATE "Issue" SET labels = ARRAY(SELECT DISTINCT unnest(array_replace(labels, ${from}, ${next})))
      WHERE ${from} = ANY(labels) AND "projectId" IN (SELECT id FROM "Project" WHERE "workspaceId" = ${workspaceId})`;
    const key = { workspaceId_name: { workspaceId, name: from } };
    const color = await tx.labelColor.findUnique({ where: key });
    if (color) {
      await tx.labelColor.delete({ where: key });
      await tx.labelColor.upsert({ where: { workspaceId_name: { workspaceId, name: next } }, create: { workspaceId, name: next, color: color.color }, update: {} });
    }
  });
  revalidatePath("/", "layout");
  return {};
}

/** Removes a label from every issue (admins only). The issues themselves stay. */
export async function deleteLabel(name: string) {
  const { workspaceId } = await requireAdmin();
  await db.$executeRaw`UPDATE "Issue" SET labels = array_remove(labels, ${name}) WHERE ${name} = ANY(labels) AND "projectId" IN (SELECT id FROM "Project" WHERE "workspaceId" = ${workspaceId})`;
  await db.labelColor.deleteMany({ where: { workspaceId, name } });
  revalidatePath("/", "layout");
}
