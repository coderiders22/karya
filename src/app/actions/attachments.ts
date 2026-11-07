"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, deleteStored, isOurBlobUrl, saveFile } from "@/lib/storage";

async function logUpload(issueId: string, actorId: string, names: string[]) {
  await db.activity.create({ data: { issueId, actorId, field: "attachment", to: names.join(", ") } });
  revalidatePath("/", "layout");
}

/** Own server / Docker: the files themselves come through this action and are saved to disk. */
export async function uploadAttachments(issueId: string, form: FormData): Promise<{ error?: string }> {
  const user = await requireUser();
  await db.issue.findUniqueOrThrow({ where: { id: issueId } });
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const tooBig = files.find((f) => f.size > MAX_UPLOAD_BYTES);
  if (tooBig) return { error: `${tooBig.name} is larger than 25 MB` };
  for (const file of files) {
    const storageKey = await saveFile(file);
    await db.attachment.create({
      data: { issueId, uploaderId: user.id, filename: file.name.slice(0, 200), mimeType: file.type || "application/octet-stream", size: file.size, storageKey },
    });
  }
  await logUpload(issueId, user.id, files.map((f) => f.name));
  return {};
}

/**
 * Vercel: the browser has already uploaded the files to Blob. Record them, after checking
 * with Blob itself that each URL really is a file in our store, and taking its real size.
 */
export async function registerAttachments(issueId: string, uploaded: { url: string; filename: string }[]): Promise<{ error?: string }> {
  const user = await requireUser();
  await db.issue.findUniqueOrThrow({ where: { id: issueId } });
  const { head } = await import("@vercel/blob");
  for (const u of uploaded) {
    if (!isOurBlobUrl(u.url)) return { error: "Upload did not reach file storage" };
    const meta = await head(u.url).catch(() => null);
    if (!meta) return { error: `${u.filename} could not be found in file storage` };
    await db.attachment.create({
      data: { issueId, uploaderId: user.id, filename: u.filename.slice(0, 200), mimeType: meta.contentType || "application/octet-stream", size: meta.size, storageKey: meta.url },
    });
  }
  await logUpload(issueId, user.id, uploaded.map((u) => u.filename));
  return {};
}

export async function deleteAttachment(id: string) {
  const user = await requireUser();
  const a = await db.attachment.findUniqueOrThrow({ where: { id } });
  if (a.uploaderId !== user.id && user.role !== "ADMIN") throw new Error("Only the uploader or an admin can delete this");
  await db.attachment.delete({ where: { id } });
  await deleteStored(a.storageKey);
  revalidatePath("/", "layout");
}
