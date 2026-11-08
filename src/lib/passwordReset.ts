import { randomBytes } from "crypto";
import { appUrl } from "./appUrl";
import { db } from "./db";

/** Creates a single-use link for this person. Any earlier unused link of theirs stops working. */
export async function issueResetLink(userId: string, hours: number) {
  await db.passwordReset.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
  const token = randomBytes(24).toString("base64url");
  await db.passwordReset.create({ data: { token, userId, expiresAt: new Date(Date.now() + hours * 3600000) } });
  return `${appUrl()}/reset?token=${token}`;
}
