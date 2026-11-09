import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { visibleProjects } from "@/lib/permissions";

/**
 * What an open board polls. A short fingerprint of the project's issues, so the page only reloads
 * when something really changed, and a board nobody is touching costs almost nothing.
 */
export async function GET(_: Request, { params }: { params: Promise<{ key: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const project = await db.project.findFirst({ where: { ...visibleProjects(me), key: (await params).key.toUpperCase() }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const issues = await db.issue.aggregate({ where: { projectId: project.id }, _count: true, _max: { updatedAt: true } });
  return NextResponse.json({ v: `${issues._count}:${issues._max.updatedAt?.getTime() ?? 0}` }, { headers: { "Cache-Control": "no-store" } });
}
