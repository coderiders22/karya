"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_STATUSES, PROJECT_COLORS } from "@/lib/constants";
import { importJiraCsv, type ImportResult } from "@/lib/jiraImport";

export type ImportState = { error?: string; result?: ImportResult } | undefined;

export async function importFromJira(_: ImportState, form: FormData): Promise<ImportState> {
  const admin = await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file exported from Jira" };
  const target = String(form.get("target") ?? "new");
  let projectId = target;
  if (target === "new") {
    const key = String(form.get("key") ?? "").trim().toUpperCase();
    const name = String(form.get("name") ?? "").trim();
    if (!/^[A-Z][A-Z0-9]{1,9}$/.test(key)) return { error: "Key must be 2–10 letters/numbers and start with a letter" };
    if (!name) return { error: "Enter a project name" };
    if (await db.project.findUnique({ where: { key } })) return { error: `Project key ${key} is taken` };
    const p = await db.project.create({
      data: {
        key, name, leadId: admin.id, color: PROJECT_COLORS[(await db.project.count()) % PROJECT_COLORS.length],
        // Statuses come from the file; start with just the defaults and add what's missing.
        statuses: { create: DEFAULT_STATUSES.map((s, i) => ({ ...s, position: i })) },
      },
    });
    projectId = p.id;
  }
  try {
    const result = await importJiraCsv(await file.text(), projectId, admin.id);
    revalidatePath("/", "layout");
    return { result };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
