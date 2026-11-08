"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { notifyLink } from "@/lib/notify";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

export type FormState = { error?: string } | undefined;

async function startSession(userId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(userId), sessionCookieOptions);
}

const credentials = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
const signup = credentials.extend({ name: z.string().trim().min(1, "Name is required") });

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const parsed = credentials.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return { error: "Wrong email or password" };
  }
  await startSession(user.id);
  redirect(safeNext(form.get("next")));
}

const signupForm = signup.extend({
  mode: z.enum(["PROFESSIONAL", "STUDENT"]),
  workspace: z.string().trim().max(80).optional(),
  join: z.string().trim().toUpperCase().max(12).optional(),
});

/** Only ever back to a team link, so a crafted login URL can't send someone to another site. */
const safeNext = (value: FormDataEntryValue | null) => (typeof value === "string" && /^\/join\/[A-Z0-9]{4,12}$/.test(value) ? value : "/your-work");

/**
 * Anyone can sign up, and gets a private workspace of their own as its admin. A student's stays
 * theirs alone: they team up per project, through team links.
 */
export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const parsed = signupForm.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (await db.user.findUnique({ where: { email: d.email } })) return { error: "An account with this email already exists. Log in instead." };
  const team = d.join ? await db.project.findUnique({ where: { joinCode: d.join }, select: { id: true, key: true, name: true, leadId: true } }) : null;
  if (d.join && !team) return { error: "This team link no longer works. Ask your team lead for a new one." };
  const student = d.mode === "STUDENT" || !!team;
  const workspaceName = student ? `${d.name.split(/\s+/)[0]}'s projects` : d.workspace;
  if (!workspaceName) return { error: "Enter your team or company name" };
  const passwordHash = await bcrypt.hash(d.password, 12);
  // The very first account on a new install runs the site.
  const siteOwner = (await db.user.count()) === 0;
  const user = await db.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({ data: { name: workspaceName, kind: student ? "STUDENT" : "TEAM" } });
    return tx.user.create({
      data: {
        email: d.email, name: d.name, passwordHash, role: "ADMIN", siteOwner, mode: student ? "STUDENT" : "PROFESSIONAL", workspaceId: workspace.id,
        ...(team && { projectMemberships: { create: { projectId: team.id } } }),
      },
    });
  });
  await startSession(user.id);
  if (!team) redirect("/your-work");
  if (team.leadId) {
    await notifyLink({ actorId: user.id, kind: "TEAM_JOINED", link: `/projects/${team.key}/team`, message: `${user.name} joined ${team.name}`, userIds: [team.leadId] });
  }
  redirect(`/projects/${team.key}/board`);
}

export async function registerWithInvite(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const invite = await db.invite.findUnique({ where: { token } });
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return { error: "This invite link is invalid or has expired. Ask an admin for a new one." };
  }
  const parsed = signup.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (invite.email && invite.email !== parsed.data.email) {
    return { error: `This invite is for ${invite.email}` };
  }
  if (await db.user.findUnique({ where: { email: parsed.data.email } })) {
    return { error: "An account with this email already exists. Log in instead." };
  }
  const user = await db.$transaction(async (tx) => {
    await tx.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
    return tx.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        role: invite.role,
        workspaceId: invite.workspaceId,
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
      },
    });
  });
  await startSession(user.id);
  redirect("/your-work");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const reset = await db.passwordReset.findUnique({ where: { token } });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) return { error: "This reset link is invalid or has expired. Request a new one from the login page." };
  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  if (password !== confirm) return { error: "The two passwords don't match" };
  await db.$transaction([
    db.user.update({ where: { id: reset.userId }, data: { passwordHash: await bcrypt.hash(password, 12) } }),
    db.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    db.passwordResetRequest.updateMany({ where: { userId: reset.userId, resolvedAt: null }, data: { resolvedAt: new Date() } }),
  ]);
  await startSession(reset.userId);
  redirect("/your-work");
}
