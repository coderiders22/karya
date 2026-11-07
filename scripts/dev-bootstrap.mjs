// Local development only: fills an EMPTY database with a realistic team and project so every
// screen has something to show (also used to record the Guide videos).
// Writes the generated logins to .dev-credentials (gitignored).
// Usage: node --env-file=.env scripts/dev-bootstrap.mjs [--team-only]
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { writeFileSync } from "fs";

const db = new PrismaClient();
if (await db.user.count()) throw new Error("Database already has users; bootstrap is for an empty dev database.");

const DAY = 86400000;
const ago = (d) => new Date(Date.now() - d * DAY);
const pw = () => randomBytes(9).toString("base64url");

const people = [
  { name: "Aanya Kapoor", email: "aanya@karya.test", role: "ADMIN" },
  { name: "Sam Rivera", email: "sam@karya.test", role: "MEMBER" },
  { name: "Rohan Mehta", email: "rohan@karya.test", role: "MEMBER" },
  { name: "Lena Fischer", email: "lena@karya.test", role: "MEMBER" },
].map((p) => ({ ...p, password: pw() }));
const u = {};
for (const p of people) {
  u[p.name.split(" ")[0].toLowerCase()] = await db.user.create({
    data: { name: p.name, email: p.email, role: p.role, passwordHash: await bcrypt.hash(p.password, 10), createdAt: ago(40) },
  });
}

// --team-only: just the people, no projects (used to record the walkthrough from a clean start).
if (process.argv.includes("--team-only")) {
  writeFileSync(".dev-credentials", people.map((p) => `${p.role.padEnd(6)} ${p.email}  ${p.password}`).join("\n") + "\n");
  console.log(`Team ready: ${people.length} people, no projects. Logins are in .dev-credentials`);
  await db.$disconnect();
  process.exit(0);
}

const project = await db.project.create({
  data: {
    key: "WR", name: "Website Redesign", color: "#0e7c66", leadId: u.aanya.id, description: "New marketing site and sign-up flow.",
    statuses: { create: [
      { name: "To Do", category: "TODO", position: 0 },
      { name: "In Progress", category: "IN_PROGRESS", position: 1, wipLimit: 4 },
      { name: "In Review", category: "IN_PROGRESS", position: 2 },
      { name: "Done", category: "DONE", position: 3 },
    ] },
  },
  include: { statuses: { orderBy: { position: "asc" } } },
});
const [todo, doing, review, done] = project.statuses;

const past = await db.sprint.create({ data: { projectId: project.id, name: "WR Sprint 1", state: "CLOSED", startDate: ago(20), endDate: ago(7) } });
const sprint = await db.sprint.create({
  data: { projectId: project.id, name: "WR Sprint 2", state: "ACTIVE", goal: "Ship the new landing page and newsletter sign-up", startDate: ago(6), endDate: new Date(Date.now() + 8 * DAY) },
});
await db.sprint.create({ data: { projectId: project.id, name: "WR Sprint 3", state: "FUTURE" } });

let n = 0;
async function issue({ status = todo, reporter = u.aanya, changed = 0, ...data }) {
  n += 1;
  const st = status;
  return db.issue.create({
    data: {
      projectId: project.id, number: n, key: `WR-${n}`, reporterId: reporter.id, rank: n * 1000, statusId: st.id,
      createdAt: ago(changed + 3), statusChangedAt: ago(changed),
      startedAt: st.category !== "TODO" ? ago(changed + 1) : null,
      resolvedAt: st.category === "DONE" ? ago(changed) : null,
      ...data,
      watchers: { connect: [{ id: reporter.id }, ...(data.assigneeId ? [{ id: data.assigneeId }] : [])] },
      activities: { create: { actorId: reporter.id, field: "created", createdAt: ago(changed + 3) } },
    },
  });
}

const epic = await issue({ type: "EPIC", title: "Landing page relaunch", description: "Everything needed for the relaunch.", startDate: ago(20), dueDate: new Date(Date.now() + 20 * DAY) });
const epic2 = await issue({ type: "EPIC", title: "Self-serve sign-up", description: "Let visitors start a trial without talking to sales.", startDate: ago(5), dueDate: new Date(Date.now() + 45 * DAY) });

// Last sprint (for velocity)
for (const [title, pts, who] of [["Design system tokens", 5, u.lena], ["Hero section copy", 2, u.sam], ["Set up preview deploys", 3, u.rohan], ["Cookie banner", 3, u.sam]]) {
  await issue({ type: "STORY", title, storyPoints: pts, assigneeId: who.id, sprintId: past.id, status: done, changed: 9, parentId: epic.id });
}

// Active sprint
const signup = await issue({ type: "STORY", title: "Newsletter sign-up form", storyPoints: 3, assigneeId: u.sam.id, sprintId: sprint.id, status: doing, changed: 1, parentId: epic.id, labels: ["frontend"], priority: "HIGH" });
await issue({ type: "SUBTASK", title: "Validate email on the client", assigneeId: u.sam.id, sprintId: sprint.id, status: done, changed: 1, parentId: signup.id });
const api = await issue({ type: "TASK", title: "Newsletter API endpoint", storyPoints: 3, assigneeId: u.rohan.id, sprintId: sprint.id, status: doing, changed: 5, parentId: epic.id, labels: ["backend"] });
const pricing = await issue({ type: "STORY", title: "Pricing page with plan comparison", storyPoints: 5, assigneeId: u.lena.id, sprintId: sprint.id, status: todo, parentId: epic.id, priority: "HIGHEST", labels: ["frontend"], dueDate: new Date(Date.now() + 4 * DAY) });
await issue({ type: "BUG", title: "Footer links overlap on mobile", storyPoints: 1, assigneeId: u.lena.id, sprintId: sprint.id, status: review, changed: 1, labels: ["mobile", "css"], priority: "HIGH" });
await issue({ type: "STORY", title: "Testimonials carousel", storyPoints: 3, assigneeId: u.sam.id, sprintId: sprint.id, status: done, changed: 2, parentId: epic.id });
await issue({ type: "TASK", title: "Compress hero images", storyPoints: 1, assigneeId: u.rohan.id, sprintId: sprint.id, status: done, changed: 3 });
await issue({ type: "BUG", title: "Contact form sends twice on slow networks", storyPoints: 2, assigneeId: u.rohan.id, sprintId: sprint.id, status: todo, priority: "HIGH", labels: ["backend"] });
await issue({ type: "TASK", title: "Set up analytics events", storyPoints: 2, sprintId: sprint.id, status: todo, parentId: epic.id });

// Backlog
await issue({ type: "STORY", title: "Trial sign-up with company details", storyPoints: 5, parentId: epic2.id, labels: ["frontend"] });
await issue({ type: "STORY", title: "Welcome email sequence", storyPoints: 3, parentId: epic2.id });
await issue({ type: "TASK", title: "Rate-limit the sign-up endpoint", storyPoints: 2, parentId: epic2.id, labels: ["backend", "security"], priority: "HIGH" });
await issue({ type: "BUG", title: "Safari autofill hides the password field", storyPoints: 1, labels: ["safari"] });
await issue({ type: "STORY", title: "Blog index with categories", storyPoints: 3 });

await db.project.update({ where: { id: project.id }, data: { issueCounter: n } });
// The pricing page waits on the API (shows as blocked on the board).
await db.issueLink.create({ data: { fromId: api.id, toId: pricing.id, type: "BLOCKS" } });
await db.comment.create({ data: { issueId: signup.id, authorId: u.aanya.id, body: "Use double opt-in please, the legal team asked for it.", createdAt: ago(1) } });
await db.comment.create({ data: { issueId: api.id, authorId: u.rohan.id, body: "Waiting on the mail provider's API key. @Aanya Kapoor can you chase it?", createdAt: ago(2) } });

writeFileSync(".dev-credentials", people.map((p) => `${p.role.padEnd(6)} ${p.email}  ${p.password}`).join("\n") + "\n");
console.log(`Dev data ready: ${people.length} people, ${n} issues in WR. Logins are in .dev-credentials`);
await db.$disconnect();
