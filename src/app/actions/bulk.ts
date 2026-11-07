"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { updateIssueField } from "./issues";

const FIELDS = ["statusName", "assigneeId", "priority", "sprintId", "type", "addLabel"] as const;

/**
 * Applies one change to many issues. Status is matched by name so it works across projects.
 * Returns how many issues changed and how many were skipped (e.g. no status with that name).
 */
export async function bulkUpdate(ids: string[], field: (typeof FIELDS)[number], value: string) {
  await requireUser();
  if (!FIELDS.includes(field)) throw new Error("Unsupported field");
  const issues = await db.issue.findMany({ where: { id: { in: ids.slice(0, 500) } }, select: { id: true, projectId: true, labels: true } });
  let changed = 0, skipped = 0;
  for (const issue of issues) {
    if (field === "statusName") {
      const status = await db.status.findFirst({ where: { projectId: issue.projectId, name: value } });
      if (!status) { skipped++; continue; }
      await updateIssueField(issue.id, "statusId", status.id);
    } else if (field === "sprintId") {
      if (value) {
        const ok = await db.sprint.count({ where: { id: value, projectId: issue.projectId } });
        if (!ok) { skipped++; continue; }
      }
      await updateIssueField(issue.id, "sprintId", value);
    } else if (field === "addLabel") {
      await updateIssueField(issue.id, "labels", [...issue.labels, value].join(","));
    } else {
      await updateIssueField(issue.id, field, value);
    }
    changed++;
  }
  revalidatePath("/", "layout");
  return { changed, skipped };
}

export async function bulkDelete(ids: string[]) {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("Only admins can bulk delete");
  const { count } = await db.issue.deleteMany({ where: { id: { in: ids.slice(0, 500) } } });
  revalidatePath("/", "layout");
  return count;
}

export async function saveFilter(name: string, query: string, projectId: string | null, shared: boolean) {
  const user = await requireUser();
  if (!name.trim()) return;
  await db.savedFilter.create({ data: { name: name.trim().slice(0, 60), query, projectId, shared, ownerId: user.id } });
  revalidatePath("/", "layout");
}

export async function deleteFilter(id: string) {
  const user = await requireUser();
  const f = await db.savedFilter.findUniqueOrThrow({ where: { id } });
  if (f.ownerId !== user.id && user.role !== "ADMIN") throw new Error("Not your filter");
  await db.savedFilter.delete({ where: { id } });
  revalidatePath("/", "layout");
}
