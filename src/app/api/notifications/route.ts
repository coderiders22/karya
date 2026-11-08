import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadNotifications } from "@/lib/notify";

/**
 * Polled by the inbox. A plain request rather than a server action: actions run through the
 * router's queue, so a poll could hold up a navigation or collide with a page still streaming.
 */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await loadNotifications(me.id), { headers: { "Cache-Control": "no-store" } });
}
