"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { appUrl } from "@/lib/appUrl";

export async function createInvite(form: FormData): Promise<{ link?: string; error?: string }> {
  await requireAdmin();
  const email = String(form.get("email") ?? "").trim().toLowerCase() || null;
  const role = (String(form.get("role") ?? "MEMBER") === "ADMIN" ? "ADMIN" : "MEMBER") as Role;
  if (email && (await db.user.findUnique({ where: { email } }))) return { error: "That person already has an account" };
  const token = randomBytes(24).toString("base64url");
  await db.invite.create({ data: { token, email, role, expiresAt: new Date(Date.now() + 7 * 86400000) } });
  revalidatePath("/settings/members");
  const base = appUrl();
  return { link: `${base}/register?token=${token}` };
}

export async function revokeInvite(inviteId: string) {
  await requireAdmin();
  await db.invite.delete({ where: { id: inviteId } });
  revalidatePath("/settings/members");
}

export async function setRole(userId: string, role: Role) {
  const me = await requireAdmin();
  if (userId === me.id) throw new Error("You can't change your own role");
  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/settings/members");
}

export async function removeUser(userId: string) {
  const me = await requireAdmin();
  if (userId === me.id) throw new Error("You can't remove yourself");
  const reported = await db.issue.count({ where: { reporterId: userId } });
  const commented = await db.comment.count({ where: { authorId: userId } });
  const acted = await db.activity.count({ where: { actorId: userId } });
  if (reported || commented || acted) {
    throw new Error("This person has reported issues or comments. Change their role instead of removing them.");
  }
  await db.user.delete({ where: { id: userId } });
  revalidatePath("/settings/members");
}

/** Creates a single-use, 24-hour link that lets this person choose a new password. */
export async function createResetLink(userId: string): Promise<{ link: string; name: string }> {
  await requireAdmin();
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  await db.passwordReset.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
  const token = randomBytes(24).toString("base64url");
  await db.passwordReset.create({ data: { token, userId, expiresAt: new Date(Date.now() + 86400000) } });
  const base = appUrl();
  return { link: `${base}/reset?token=${token}`, name: user.name };
}
