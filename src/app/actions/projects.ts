"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { StatusCategory } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { DEFAULT_STATUSES, PROJECT_COLORS } from "@/lib/constants";
import type { FormState } from "./auth";

const projectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9]{1,9}$/, "Key must be 2–10 letters/numbers and start with a letter (e.g. WEB)"),
  description: z.string().trim().max(2000).optional().default(""),
});

export async function createProject(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = projectSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (await db.project.findUnique({ where: { key: parsed.data.key } })) {
    return { error: `A project with key ${parsed.data.key} already exists` };
  }
  await db.project.create({
    data: {
      ...parsed.data,
      leadId: user.id,
      color: PROJECT_COLORS[(await db.project.count()) % PROJECT_COLORS.length],
      statuses: { create: DEFAULT_STATUSES.map((s, i) => ({ ...s, position: i })) },
    },
  });
  revalidatePath("/", "layout");
  redirect(`/projects/${parsed.data.key}/board`);
}

export async function updateProject(projectId: string, form: FormData) {
  await requireUser();
  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const leadId = String(form.get("leadId") ?? "") || null;
  const color = String(form.get("color") ?? "");
  const staleDays = Math.min(60, Math.max(1, Number(form.get("staleDays")) || 3));
  const gitAutomation = form.get("gitAutomation") === "on";
  if (!name) return;
  await db.project.update({
    where: { id: projectId },
    data: { name, description, leadId, staleDays, gitAutomation, ...(PROJECT_COLORS.includes(color) && { color }) },
  });
  revalidatePath("/", "layout");
}

export async function deleteProject(projectId: string) {
  await requireAdmin();
  await db.project.delete({ where: { id: projectId } });
  revalidatePath("/", "layout");
  redirect("/projects");
}

export async function addStatus(projectId: string, form: FormData) {
  await requireUser();
  const name = String(form.get("name") ?? "").trim();
  const category = String(form.get("category") ?? "TODO") as StatusCategory;
  if (!name) return;
  const count = await db.status.count({ where: { projectId } });
  await db.status.create({ data: { projectId, name, category, position: count } });
  revalidatePath("/", "layout");
}

export async function updateStatus(statusId: string, form: FormData) {
  await requireUser();
  const name = String(form.get("name") ?? "").trim();
  const category = String(form.get("category") ?? "") as StatusCategory;
  const wipRaw = form.get("wipLimit");
  const wip = wipRaw === null ? undefined : String(wipRaw).trim() === "" ? null : Math.max(0, Math.round(Number(wipRaw)) || 0) || null;
  await db.status.update({
    where: { id: statusId },
    data: { ...(name && { name }), ...(category && { category }), ...(wip !== undefined && { wipLimit: wip }) },
  });
  revalidatePath("/", "layout");
}

export async function moveStatus(statusId: string, direction: -1 | 1) {
  await requireUser();
  const status = await db.status.findUniqueOrThrow({ where: { id: statusId } });
  const all = await db.status.findMany({ where: { projectId: status.projectId }, orderBy: { position: "asc" } });
  const i = all.findIndex((s) => s.id === statusId);
  const j = i + direction;
  if (j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  await db.$transaction(all.map((s, idx) => db.status.update({ where: { id: s.id }, data: { position: idx } })));
  revalidatePath("/", "layout");
}

/** Deletes a status; its issues move to the first remaining status. */
export async function deleteStatus(statusId: string) {
  await requireUser();
  const status = await db.status.findUniqueOrThrow({ where: { id: statusId } });
  const others = await db.status.findMany({
    where: { projectId: status.projectId, id: { not: statusId } },
    orderBy: { position: "asc" },
  });
  if (others.length === 0) return;
  await db.$transaction([
    db.issue.updateMany({ where: { statusId }, data: { statusId: others[0].id } }),
    db.status.delete({ where: { id: statusId } }),
    ...others.map((s, idx) => db.status.update({ where: { id: s.id }, data: { position: idx } })),
  ]);
  revalidatePath("/", "layout");
}
