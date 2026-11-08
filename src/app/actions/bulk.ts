"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireEditor, requireUser } from "@/lib/auth";
import { isAdmin, manageableProjects, visibleProjects } from "@/lib/permissions";
import { updateIssueField } from "./issues";

const FIELDS = ["statusName", "assigneeId", "priority", "sprintId", "type", "addLabel"] as const;

/**
 * Applies one change to many issues. Status is matched by name so it works across projects.
 * Returns how many issues changed and how many were skipped (e.g. no status with that name).
 */
export async function bulkUpdate(ids: string[], field: (typeof FIELDS)[number], value: string) {
  const user = await requireEditor();
  if (!FIELDS.includes(field)) throw new Error("Unsupported field");
  const issues = await db.issue.findMany({ where: { id: { in: ids.slice(0, 500) }, project: visibleProjects(user) }, select: { id: true, projectId: true, labels: true } });
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
  const user = await requireEditor();
  const { count } = await db.issue.deleteMany({ where: { id: { in: ids.slice(0, 500) }, project: manageableProjects(user) } });
  revalidatePath("/", "layout");
  return count;
}

export async function saveFilter(name: string, query: string, projectId: string | null, shared: boolean) {
  const user = await requireUser();
  if (!name.trim()) return;
  if (projectId && !(await db.project.count({ where: { id: projectId, ...visibleProjects(user) } }))) return;
  await db.savedFilter.create({ data: { name: name.trim().slice(0, 60), query, projectId, shared, ownerId: user.id } });
  revalidatePath("/", "layout");
}

export async function deleteFilter(id: string) {
  const user = await requireUser();
  const f = await db.savedFilter.findFirstOrThrow({ where: { id, owner: { workspaceId: user.workspaceId } } });
  if (f.ownerId !== user.id && !isAdmin(user.role)) throw new Error("Not your filter");
  await db.savedFilter.delete({ where: { id } });
  revalidatePath("/", "layout");
}
