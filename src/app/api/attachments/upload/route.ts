import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, usesBlob } from "@/lib/storage";

/**
 * Hands the browser a short-lived token so it can upload an attachment straight to
 * Vercel Blob. Only signed-in members get one, and only for an issue that exists.
 * The attachment row is created afterwards by the registerAttachments action.
 */
export async function POST(request: Request) {
  if (!usesBlob()) return NextResponse.json({ error: "Blob storage is not configured" }, { status: 404 });
  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        if (!(await getCurrentUser())) throw new Error("Sign in to upload files");
        if (!clientPayload || !(await db.issue.findUnique({ where: { id: clientPayload }, select: { id: true } }))) throw new Error("Issue not found");
        return { maximumSizeInBytes: MAX_UPLOAD_BYTES, addRandomSuffix: true };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}
