"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { memberInWorkspace, requireAdmin } from "@/lib/auth";
import { appUrl } from "@/lib/appUrl";
import { issueResetLink } from "@/lib/passwordReset";

export async function createInvite(form: FormData): Promise<{ link?: string; error?: string }> {
  const admin = await requireAdmin();
  if (admin.mode === "STUDENT") return { error: "Students add teammates from a project's Team page" };
  const email = String(form.get("email") ?? "").trim().toLowerCase() || null;
  const roles: Role[] = ["ADMIN", "MANAGER", "MEMBER", "VIEWER"];
  const picked = String(form.get("role") ?? "MEMBER");
  const role: Role = roles.includes(picked as Role) ? (picked as Role) : "MEMBER";
  if (email && (await db.user.findUnique({ where: { email } }))) return { error: "That person already has an account" };
  const token = randomBytes(24).toString("base64url");
  await db.invite.create({ data: { token, email, role, workspaceId: admin.workspaceId, expiresAt: new Date(Date.now() + 7 * 86400000) } });
  revalidatePath("/settings/members");
  const base = appUrl();
  return { link: `${base}/register?token=${token}` };
}

export async function revokeInvite(inviteId: string) {
  const admin = await requireAdmin();
  await db.invite.deleteMany({ where: { id: inviteId, workspaceId: admin.workspaceId } });
  revalidatePath("/settings/members");
}

export async function setRole(userId: string, role: Role) {
  const me = await requireAdmin();
  if (userId === me.id) throw new Error("You can't change your own role");
  await memberInWorkspace(me, userId);
  if (!["ADMIN", "MANAGER", "MEMBER", "VIEWER"].includes(role)) throw new Error("Unknown role");
  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/settings/members");
}

export async function removeUser(userId: string) {
  const me = await requireAdmin();
  if (userId === me.id) throw new Error("You can't remove yourself");
  await memberInWorkspace(me, userId);
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
  const admin = await requireAdmin();
  const user = await memberInWorkspace(admin, userId);
  return { link: await issueResetLink(userId, 24), name: user.name };
}

export async function renameWorkspace(form: FormData) {
  const me = await requireAdmin();
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  if (!name) return;
  await db.workspace.update({ where: { id: me.workspaceId }, data: { name } });
  revalidatePath("/", "layout");
}
