// The "What's new" video, used by: node scripts/record-walkthrough.mjs --whats-new
//
// Runs on the demo data from scripts/dev-bootstrap.mjs (the full seed, not --team-only), with
// DATABASE_URL set. `prepare` connects the demo project to a sample GitHub repository and adds the
// GitHub history Reality Check reads, and signs up a student team in a browser that isn't recorded.
// Everything on screen is the real app.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const REPO = "acme/website";
const step = (n, text) => `<span class="step">Step ${n}</span>${text}`;
const DAY = 86400000;
const PASSWORD = "whats-new-" + Math.random().toString(36).slice(2);
const email = (who) => `${who}.${Date.now().toString(36)}@example.com`;
let studentState = null;

const wr = () => db.project.findFirstOrThrow({ where: { key: "WR" }, include: { statuses: true, issues: true } });

async function signUpStudent(browser, name, join) {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => { try { localStorage.setItem("karya:tour:welcome", "done"); localStorage.setItem("karya:tour:board", "done"); sessionStorage.setItem("karya:booted", "1"); } catch {} });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/signup?${join ? `join=${join}` : "as=student"}`);
  await page.fill("input[name=name]", name);
  await page.fill("input[name=email]", email(name.split(" ")[0].toLowerCase()));
  await page.fill("input[name=password]", PASSWORD);
  await page.getByRole("button", { name: "Create free account" }).click();
  await page.waitForURL(join ? /\/board/ : /your-work/);
  return { ctx, page };
}

/** Background setup, before the camera starts. */
export async function prepare(browser) {
  // 1. GitHub history on the demo project, for Reality Check.
  const p = await wr();
  const issue = (t) => p.issues.find((i) => i.title === t);
  await db.project.update({ where: { id: p.id }, data: { githubRepo: REPO, githubHookId: "1", githubLastEventAt: new Date(), githubLastEventType: "pull_request", staleDays: 3 } });
  const pr = (n, title, state) => ({ kind: "PULL_REQUEST", externalId: `${REPO}#${n}`, title, url: `https://github.com/${REPO}/pull/${n}`, state, author: "sam-rivera", repo: REPO });
  const testimonials = issue("Testimonials carousel");
  await db.issue.update({ where: { id: testimonials.id }, data: { resolvedAt: new Date(Date.now() - DAY) } });
  await db.devActivity.create({ data: { issueId: testimonials.id, ...pr(41, `${testimonials.key} testimonials carousel`, "open") } });
  const api = issue("Newsletter API endpoint");
  await db.devActivity.deleteMany({ where: { issueId: api.id } });
  await db.issue.update({ where: { id: api.id }, data: { statusChangedAt: new Date(Date.now() - 6 * DAY) } });
  const form = issue("Newsletter sign-up form");
  const waiting = await db.devActivity.create({ data: { issueId: form.id, ...pr(43, `${form.key} sign-up form`, "open") } });
  await db.$executeRaw`UPDATE "DevActivity" SET "updatedAt" = ${new Date(Date.now() - 3 * DAY)} WHERE id = ${waiting.id}`;
  await db.untrackedWork.upsert({
    where: { projectId_externalId: { projectId: p.id, externalId: `${REPO}#44` } },
    create: { projectId: p.id, externalId: `${REPO}#44`, title: "Fix crash when the cart is empty", url: `https://github.com/${REPO}/pull/44`, author: "rohan-mehta", mergedAt: new Date(Date.now() - DAY) },
    update: { dismissed: false },
  });

  // 2. A student team with some finished work, commits and comments, for the contribution report.
  const lead = await signUpStudent(browser, "Ananya Rao");
  await lead.page.goto(`${BASE}/projects?template=hackathon`);
  await lead.page.fill("input[name=name]", "Smart India Hackathon");
  await lead.page.locator("input[type=datetime-local]").fill(new Date(Date.now() + 5 * DAY).toISOString().slice(0, 16));
  await lead.page.getByRole("button", { name: "Create board" }).click();
  await lead.page.waitForURL(/\/team$/);
  const sih = await db.project.findFirstOrThrow({ where: { key: "SIH" }, orderBy: { createdAt: "desc" }, include: { statuses: true, issues: { orderBy: { number: "asc" } } } });
  for (const name of ["Rohan Verma", "Neha Iyer"]) await (await signUpStudent(browser, name, sih.joinCode)).ctx.close();
  const people = await db.user.findMany({ where: { name: { in: ["Ananya Rao", "Rohan Verma", "Neha Iyer"] } }, orderBy: { createdAt: "desc" } });
  const who = (n) => people.find((u) => u.name === n);
  const logins = { "Ananya Rao": "ananya-r", "Rohan Verma": "rohan-v", "Neha Iyer": "neha-i" };
  for (const [n, login] of Object.entries(logins)) await db.githubAccount.upsert({ where: { userId: who(n).id }, create: { userId: who(n).id, login, token: "-" }, update: { login } });
  await db.project.update({ where: { id: sih.id }, data: { githubRepo: "team-nova/smart-campus", githubHookId: "1" } });
  const done = sih.statuses.find((s) => s.category === "DONE"), building = sih.statuses.find((s) => s.name === "Building");
  const plan = [["Ananya Rao", done, 3], ["Rohan Verma", done, 2], ["Neha Iyer", done, 1], ["Rohan Verma", building, 0], ["Neha Iyer", done, 1], ["Ananya Rao", null, 0]];
  for (const [i, [n, status, daysAgo]] of plan.entries()) {
    const card = sih.issues[i];
    await db.issue.update({ where: { id: card.id }, data: { assigneeId: who(n).id, ...(status && { statusId: status.id, statusChangedAt: new Date(), ...(status.category === "DONE" && { resolvedAt: new Date(Date.now() - daysAgo * DAY) }) }) } });
    for (let c = 0; c < (status?.category === "DONE" ? 3 : 1); c++) {
      await db.devActivity.create({ data: { issueId: card.id, kind: "COMMIT", externalId: `${card.key}-${c}-${Date.now()}`, title: `${card.key} work`, url: "https://github.com/team-nova/smart-campus", author: logins[n], repo: "team-nova/smart-campus" } });
    }
    await db.comment.create({ data: { issueId: card.id, authorId: who(n).id, body: "Done, see the commit." } });
  }
  await db.devActivity.create({ data: { issueId: sih.issues[1].id, kind: "PULL_REQUEST", externalId: "team-nova/smart-campus#7", title: "Deploy setup", url: "https://github.com/team-nova/smart-campus/pull/7", state: "merged", author: "rohan-v", repo: "team-nova/smart-campus" } });
  studentState = await lead.ctx.storageState();
  await lead.ctx.close();
}

export const START = "/projects/WR/board";

export const SCENES = [
  {
    id: "intro", caption: "What's new in Ruvano",
    text: "Here's what's new in Ruvano. Five features that keep your board honest, and save your team time.",
    async run(page, h) {
      await page.getByText("Reality check").first().waitFor();
      await h.poster("whats-new");
      await h.moveTo({ x: 760, y: 420, width: 0, height: 0 }); await h.wait(600);
    },
  },
  {
    id: "reality", caption: step(1, "Reality check: the board against the code"),
    text: "First, Reality check. Ruvano now compares the board with your code on GitHub. It flags cards marked done while the pull request is still open, work in progress with no commits, pull requests waiting for review, and code that shipped without a card.",
    async run(page, h) {
      const bar = page.locator('[data-reality="found"]');
      await h.moveTo(bar); await h.wait(1200);
      await h.click(bar.getByRole("button").first());
      await h.wait(900);
      for (const t of ["Testimonials carousel", "Newsletter API endpoint", "Newsletter sign-up form", "Fix crash when the cart is empty"]) {
        await h.moveTo(bar.getByText(t).first()); await h.wait(1700);
      }
    },
  },
  {
    id: "untracked", caption: step(2, "Put untracked work on the board"),
    text: "Work that shipped without a card goes on the board in one click, already done. So nothing your team ships stays invisible.",
    async run(page, h) {
      await h.click(page.getByRole("button", { name: "Add as done card" }).first());
      await page.getByText(/already done/).first().waitFor();
      await h.wait(1800);
    },
  },
  {
    id: "close", caption: step(3, "Done in Ruvano closes the GitHub issue"),
    text: "When a card that came from GitHub moves to Done, its GitHub issue now closes too. Move it back, and the issue reopens. You can switch this off on the project's GitHub page.",
    async run(page, h) {
      await h.click(page.locator('[data-tour="github"]'));
      const box = page.getByText("Close the GitHub issue when its card is done");
      await box.waitFor();
      await h.wait(800);
      await h.moveTo(box); await h.wait(2500);
    },
  },
  {
    id: "standup", caption: step(4, "Standup notes and a ready summary"),
    text: "In standup, type what each person says, and tick needs help for blockers. Then copy a ready summary, and paste it into Slack, Teams, or WhatsApp. Nobody has to write meeting notes.",
    async run(page, h) {
      await h.click(page.locator('[data-tour="project-nav"]').getByRole("link", { name: "Standup" }));
      const note = page.locator('textarea[id^="note-"]').first();
      await note.waitFor();
      await h.wait(700);
      await h.click(note); await h.type("Waiting on the payment provider's API key", 40);
      await h.wait(300);
      await h.click(page.getByText("Needs help to move forward").first());
      await h.wait(1000);
      await h.click(page.getByRole("button", { name: "Copy summary" }));
      await page.getByText("Standup summary copied").waitFor();
      await h.wait(2200);
    },
  },
  {
    id: "status", caption: step(5, "Share status without a meeting"),
    text: "Need to update a manager or a client? Share status creates a read-only page, with no login. What shipped this week, what's in progress, and what's stuck, always up to date.",
    async run(page, h) {
      await h.click(page.getByRole("button", { name: "Share status" }));
      await h.click(page.getByRole("button", { name: "Create link" }));
      const link = page.locator("input[readonly]").first();
      await link.waitFor();
      await h.wait(900);
      await h.click(page.getByRole("button", { name: "Copy", exact: true }));
      await h.wait(900);
      // The link carries the site's public address; open the same page on the server being recorded.
      const url = (await link.inputValue()).replace(/^https?:\/\/[^/]+/, BASE);
      await page.goto(url);
      await page.getByRole("heading", { name: "Shipped this week" }).waitFor();
      await h.caption(step(5, "Share status without a meeting"));
      await h.wait(1200);
      await h.moveTo(page.getByRole("heading", { name: "Needs attention" })); await h.wait(1300);
      await h.moveTo({ x: 640, y: 500, width: 0, height: 0 });
      for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 120); await h.wait(250); }
      await h.wait(1000);
    },
  },
  {
    id: "report", caption: step(6, "For students: a contribution report"),
    text: "And for student teams, the Team page now has a contribution report. Who finished what, with comments, commits, and pull requests. Ready to print for the viva.",
    async run(page, h) {
      await page.context().addCookies(studentState.cookies);
      await page.goto(`${BASE}/projects/SIH/team`);
      const btn = page.getByRole("link", { name: "Contribution report" });
      await btn.waitFor();
      await h.caption(step(6, "For students: a contribution report"));
      await h.wait(900);
      await h.click(btn);
      await page.getByText("Finished tasks").waitFor();
      await h.caption(step(6, "For students: a contribution report"));
      await h.wait(1200);
      await h.moveTo(page.locator("tr").filter({ hasText: "Rohan Verma" })); await h.wait(1400);
      await h.moveTo(page.getByRole("button", { name: /Print or save as PDF/ })); await h.wait(1200);
    },
  },
  {
    id: "outro", caption: "Every feature is in the Guide",
    text: "That's what's new in Ruvano. Every feature is explained in the Guide, inside the app.",
    async run(page, h) { await h.moveTo({ x: 640, y: 300, width: 0, height: 0 }); await h.wait(600); },
  },
];

export const closeWhatsNewDb = () => db.$disconnect();
