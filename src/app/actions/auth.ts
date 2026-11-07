"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
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
  redirect("/your-work");
}

/** First-run: create the first admin. Only works while there are no users. */
export async function setupAdmin(_: FormState, form: FormData): Promise<FormState> {
  if ((await db.user.count()) > 0) return { error: "Setup is already complete. Please log in." };
  const parsed = signup.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const user = await db.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: "ADMIN",
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
    },
  });
  await startSession(user.id);
  redirect("/your-work");
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
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) return { error: "This reset link is invalid or has expired. Ask an admin for a new one." };
  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  if (password !== confirm) return { error: "The two passwords don't match" };
  await db.$transaction([
    db.user.update({ where: { id: reset.userId }, data: { passwordHash: await bcrypt.hash(password, 12) } }),
    db.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
  ]);
  await startSession(reset.userId);
  redirect("/your-work");
}
