import { randomBytes } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

/**
 * Where attachment files live.
 *
 *  - Vercel: files go to Vercel Blob (enabled automatically when BLOB_READ_WRITE_TOKEN is set).
 *    The browser uploads straight to Blob, so files skip Vercel's 4.5 MB request limit.
 *    The stored key is the blob URL.
 *  - Docker / own server: files go to local disk (UPLOAD_DIR). The stored key is a random file name.
 */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const usesBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
export const isBlobKey = (key: string) => key.startsWith("https://");

/** Only accept blob URLs from Vercel's storage domain, never an arbitrary address sent by a client. */
export function isOurBlobUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

const dir = () => path.resolve(process.env.UPLOAD_DIR || "./uploads");

function safePath(key: string) {
  if (!/^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]{1,10})?$/.test(key)) throw new Error("Bad storage key");
  return path.join(dir(), key);
}

export async function saveFile(file: File) {
  await mkdir(dir(), { recursive: true });
  const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 11);
  const key = randomBytes(16).toString("hex") + ext;
  await writeFile(safePath(key), Buffer.from(await file.arrayBuffer()));
  return key;
}

export const readStored = (key: string) => readFile(safePath(key));

export async function deleteStored(key: string) {
  if (isBlobKey(key)) {
    const { del } = await import("@vercel/blob");
    await del(key).catch(() => {});
    return;
  }
  await unlink(safePath(key)).catch(() => {});
}
