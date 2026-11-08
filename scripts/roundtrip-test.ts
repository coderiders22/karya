// Dev check: export a project to Jira CSV, import that file into a temporary project, print what came back, then delete it.
// Usage: npx tsx --env-file=.env scripts/roundtrip-test.ts <PROJECT_KEY>
import { db } from "../src/lib/db";
import { buildJiraCsv } from "../src/lib/jiraCsv";
import { importJiraCsv } from "../src/lib/jiraImport";

async function main() {
  const src = await db.project.findFirstOrThrow({ where: { key: process.argv[2] } });
  const issues = await db.issue.findMany({
    where: { projectId: src.id },
    include: {
      status: { select: { name: true } },
      assignee: { select: { email: true } },
      reporter: { select: { email: true } },
      parent: { select: { number: true } },
      sprint: { select: { name: true } },
      comments: { select: { body: true, createdAt: true, author: { select: { email: true } } } },
    },
  });
  const csv = buildJiraCsv(issues);
  const admin = await db.user.findFirstOrThrow({ where: { role: "ADMIN", workspaceId: src.workspaceId } });
  const dst = await db.project.create({
    data: { key: "RT" + Math.floor(Math.random() * 1000), name: "Round trip", workspaceId: src.workspaceId, statuses: { create: [{ name: "To Do", category: "TODO", position: 0 }] } },
  });
  try {
    console.log(await importJiraCsv(csv, dst.id, admin.id));
    const back = await db.issue.findMany({
      where: { projectId: dst.id },
      include: { parent: true, status: true, assignee: true, _count: { select: { comments: true } } },
      orderBy: { number: "asc" },
    });
    for (const i of back) {
      console.log(i.key, i.type, i.status.name, "| parent:", i.parent?.title ?? "-", "| pts:", i.storyPoints, "| labels:", i.labels.join(","), "| assignee:", i.assignee?.email ?? "-", "| comments:", i._count.comments);
    }
    console.log("description:", JSON.stringify(back.find((b) => b.description.includes("Goals"))?.description));
  } finally {
    await db.project.delete({ where: { id: dst.id } });
    await db.$disconnect();
  }
}

main();
