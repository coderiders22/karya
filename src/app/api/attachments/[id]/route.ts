import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isBlobKey, readStored } from "@/lib/storage";
import { visibleProjects } from "@/lib/permissions";

// Only these types are shown in the browser; everything else downloads (prevents HTML/SVG script injection).
const INLINE = /^(image\/(png|jpe?g|gif|webp|avif)|application\/pdf|video\/(mp4|webm)|text\/plain)$/;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const a = await db.attachment.findFirst({ where: { id, issue: { project: visibleProjects(me) } } });
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const inline = INLINE.test(a.mimeType);
  // Vercel Blob: the member is signed in, so send them on to the file. Blob URLs carry a long
  // random suffix and are only ever shown to signed-in members. Unsafe types are forced to download.
  if (isBlobKey(a.storageKey)) {
    const url = new URL(a.storageKey);
    if (!inline) url.searchParams.set("download", "1");
    return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, no-store" } });
  }
  let data: Buffer;
  try {
    data = await readStored(a.storageKey);
  } catch {
    return NextResponse.json({ error: "File missing on server" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": inline ? a.mimeType : "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(a.filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
