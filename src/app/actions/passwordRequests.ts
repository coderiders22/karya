"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSiteOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyLink } from "@/lib/notify";
import { issueResetLink } from "@/lib/passwordReset";

export type ForgotState = { error?: string; sentTo?: string } | undefined;

const PORTAL = "/admin/password-requests";

/**
 * From the login page, so anyone can call it. The answer is the same whether or not the email has
 * an account, and each person has at most one open request, so it can't fill up the site owner's list.
 */
export async function requestPasswordReset(_: ForgotState, form: FormData): Promise<ForgotState> {
  const parsed = z.string().trim().toLowerCase().email("Enter a valid email").safeParse(form.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const email = parsed.data;
  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true } });
  if (user) {
    const open = await db.passwordResetRequest.findFirst({ where: { userId: user.id, resolvedAt: null } });
    if (open) {
      // Asking again means the last link didn't reach them or has expired, so it needs another look.
      if (open.linkCreatedAt) await db.passwordResetRequest.update({ where: { id: open.id }, data: { linkCreatedAt: null } });
    } else {
      await db.passwordResetRequest.create({ data: { userId: user.id } });
      const owners = await db.user.findMany({ where: { siteOwner: true }, select: { id: true } });
      await notifyLink({
        actorId: user.id, kind: "PASSWORD_REQUEST", link: PORTAL,
        message: `${user.name} can't log in and asked for a reset link`, userIds: owners.map((o) => o.id),
      });
    }
  }
  return { sentTo: email };
}

/** Doesn't refresh the page, so the row and its link stay in place until the owner has sent it. */
export async function createLinkForRequest(requestId: string): Promise<{ link: string }> {
  await requireSiteOwner();
  const request = await db.passwordResetRequest.findUniqueOrThrow({ where: { id: requestId } });
  const link = await issueResetLink(request.userId, 48);
  await db.passwordResetRequest.update({ where: { id: requestId }, data: { linkCreatedAt: new Date() } });
  return { link };
}

export async function dismissRequest(requestId: string) {
  await requireSiteOwner();
  await db.passwordResetRequest.update({ where: { id: requestId }, data: { resolvedAt: new Date() } });
  revalidatePath("/", "layout");
}
