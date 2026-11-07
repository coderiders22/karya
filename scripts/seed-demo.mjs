// Adds demo issues to an existing project so you can try the board.
// Usage: node --env-file=.env scripts/seed-demo.mjs WR
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const key = (process.argv[2] ?? "").toUpperCase();
const project = await db.project.findUnique({ where: { key }, include: { statuses: { orderBy: { position: "asc" } } } });
if (!project) throw new Error(`No project with key ${key}`);
const user = await db.user.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
const [todo, doing, review, done] = project.statuses;
const sprint = await db.sprint.create({ data: { projectId: project.id, name: `${key} Sprint 1`, goal: "Ship the new landing page" } });

let n = project.issueCounter;
async function issue(data) {
  n += 1;
  await db.project.update({ where: { id: project.id }, data: { issueCounter: n } });
  return db.issue.create({
    data: { projectId: project.id, number: n, key: `${key}-${n}`, reporterId: user.id, rank: n * 1000, statusId: todo.id, ...data,
      activities: { create: { actorId: user.id, field: "created" } } },
  });
}
const epic = await issue({ type: "EPIC", title: "Landing page relaunch", description: "Everything needed for the relaunch." });
const s1 = await issue({ type: "STORY", title: "As a visitor I can sign up for the newsletter", parentId: epic.id, sprintId: sprint.id, storyPoints: 3, labels: ["frontend"], assigneeId: user.id, statusId: doing?.id });
await issue({ type: "SUBTASK", title: "Add email validation", parentId: s1.id, sprintId: sprint.id, statusId: done?.id });
await issue({ type: "BUG", title: "Footer links overlap on mobile", priority: "HIGH", sprintId: sprint.id, labels: ["mobile", "css"], statusId: review?.id, dueDate: new Date(Date.now() - 86400000) });
await issue({ type: "TASK", title: "Set up analytics events", parentId: epic.id, storyPoints: 2 });
await issue({ type: "STORY", title: "Pricing page with plan comparison", parentId: epic.id, storyPoints: 5, priority: "HIGHEST" });
await db.comment.create({ data: { issueId: s1.id, authorId: user.id, body: 'Use the "double opt-in" flow, please. See `newsletter.ts`.' } });
console.log(`Added ${n - project.issueCounter} demo issues and ${sprint.name} to ${key}`);
await db.$disconnect();
