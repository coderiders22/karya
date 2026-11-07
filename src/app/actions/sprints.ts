"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function createSprint(projectId: string) {
  await requireUser();
  const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });
  const count = await db.sprint.count({ where: { projectId } });
  await db.sprint.create({ data: { projectId, name: `${project.key} Sprint ${count + 1}` } });
  revalidatePath("/", "layout");
}

export async function updateSprint(sprintId: string, form: FormData) {
  await requireUser();
  const name = String(form.get("name") ?? "").trim();
  const goal = String(form.get("goal") ?? "").trim();
  const endDate = String(form.get("endDate") ?? "");
  await db.sprint.update({
    where: { id: sprintId },
    data: { ...(name && { name }), goal, ...(endDate && { endDate: new Date(endDate) }) },
  });
  revalidatePath("/", "layout");
}

export async function startSprint(sprintId: string, weeks = 2) {
  await requireUser();
  const sprint = await db.sprint.findUniqueOrThrow({ where: { id: sprintId } });
  const active = await db.sprint.findFirst({ where: { projectId: sprint.projectId, state: "ACTIVE" } });
  if (active) throw new Error(`Complete "${active.name}" before starting another sprint`);
  const start = new Date();
  await db.sprint.update({
    where: { id: sprintId },
    data: {
      state: "ACTIVE",
      startDate: start,
      endDate: sprint.endDate ?? new Date(start.getTime() + weeks * 7 * 86400000),
    },
  });
  revalidatePath("/", "layout");
}

/** Closes the sprint. Unfinished issues go to `moveTo` (a future sprint id) or the backlog. */
export async function completeSprint(sprintId: string, moveTo: string | null) {
  await requireUser();
  const sprint = await db.sprint.findUniqueOrThrow({ where: { id: sprintId } });
  await db.$transaction([
    db.issue.updateMany({
      where: { sprintId, status: { category: { not: "DONE" } } },
      data: { sprintId: moveTo || null },
    }),
    db.sprint.update({ where: { id: sprint.id }, data: { state: "CLOSED", endDate: new Date() } }),
  ]);
  revalidatePath("/", "layout");
}

export async function deleteSprint(sprintId: string) {
  await requireUser();
  await db.$transaction([
    db.issue.updateMany({ where: { sprintId }, data: { sprintId: null } }),
    db.sprint.delete({ where: { id: sprintId } }),
  ]);
  revalidatePath("/", "layout");
}
