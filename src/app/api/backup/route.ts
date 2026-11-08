import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "ADMIN") return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const { workspaceId } = me;
  const inWorkspace = { project: { workspaceId } };
  const [users, projects, statuses, sprints, issues, comments, links, attachments, activities] = await Promise.all([
    db.user.findMany({ where: { workspaceId }, select: { id: true, email: true, name: true, role: true, mode: true, createdAt: true } }),
    db.project.findMany({ where: { workspaceId }, omit: { githubSecret: true } }),
    db.status.findMany({ where: inWorkspace }),
    db.sprint.findMany({ where: inWorkspace }),
    db.issue.findMany({ where: inWorkspace, include: { watchers: { select: { id: true } } } }),
    db.comment.findMany({ where: { issue: inWorkspace } }),
    db.issueLink.findMany({ where: { from: inWorkspace } }),
    db.attachment.findMany({ where: { issue: inWorkspace } }),
    db.activity.findMany({ where: { issue: inWorkspace } }),
  ]);
  const body = JSON.stringify({ format: "trackr-backup", version: 1, exportedAt: new Date().toISOString(), users, projects, statuses, sprints, issues, comments, links, attachments, activities }, null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="trackr-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
