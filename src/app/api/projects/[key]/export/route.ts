import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { buildJiraCsv } from "@/lib/jiraCsv";

export async function GET(_: Request, { params }: { params: Promise<{ key: string }> }) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { key } = await params;
  const project = await db.project.findUnique({ where: { key: key.toUpperCase() } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const issues = await db.issue.findMany({
    where: { projectId: project.id },
    include: {
      status: { select: { name: true } },
      assignee: { select: { email: true } },
      reporter: { select: { email: true } },
      parent: { select: { number: true } },
      sprint: { select: { name: true } },
      comments: { select: { body: true, createdAt: true, author: { select: { email: true } } }, orderBy: { createdAt: "asc" } },
    },
  });

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(buildJiraCsv(issues), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${project.key}-jira-import-${date}.csv"`,
    },
  });
}
