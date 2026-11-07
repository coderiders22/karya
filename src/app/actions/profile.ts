"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type ProfileState = { error?: string; ok?: string } | undefined;

export async function updateProfile(_: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Name is required" };
  await db.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/", "layout");
  return { ok: "Profile saved" };
}

export async function changePassword(_: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (next.length < 8) return { error: "New password must be at least 8 characters" };
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await bcrypt.compare(current, row.passwordHash))) return { error: "Current password is wrong" };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 12) } });
  return { ok: "Password changed" };
}
