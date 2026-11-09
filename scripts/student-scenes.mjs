// The story of the student video, used by: node scripts/record-walkthrough.mjs --student
//
// It runs on an empty database. Everything on screen is the real app. What a teammate or GitHub
// would do happens in the background: teammates really join through the team link, and GitHub
// events really go through the signed webhook, using a sample repository name.
import { createHmac } from "crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const NAME = "Smart India Hackathon";
const REPO = "team-nova/smart-campus";
const step = (n, text) => `<span class="step">Step ${n}</span>${text}`;
const PASSWORD = "student-demo-" + Math.random().toString(36).slice(2);
const email = (who) => `${who}.${Date.now().toString(36)}@example.com`;

// Boards check for changes every few seconds. This asks right away, so the video doesn't sit waiting.
const nudge = (page) => page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));

async function project() {
  return db.project.findFirstOrThrow({ where: { key: "SIH" }, include: { statuses: { orderBy: { position: "asc" } }, issues: { orderBy: { number: "asc" } } } });
}

/** A teammate following the link, in a browser of their own that isn't being recorded. */
async function joinAs(browser, code, name) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/signup?join=${code}`);
  await page.fill("input[name=name]", name);
  await page.fill("input[name=email]", email(name.split(" ")[0].toLowerCase()));
  await page.fill("input[name=password]", PASSWORD);
  await page.getByRole("button", { name: "Create free account" }).click();
  await page.waitForURL(/\/board/);
  await ctx.close();
}

async function githubEvent(action, issue) {
  // New connections get a secret of their own. The sample connection uses the shared one, which needs no setup here.
  const secret = createHmac("sha256", process.env.AUTH_SECRET).update("karya:github-webhook").digest("hex");
  const body = JSON.stringify({ action, issue, repository: { full_name: REPO } });
  const res = await fetch(`${BASE}/api/integrations/github`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-github-event": "issues", "x-hub-signature-256": "sha256=" + createHmac("sha256", secret).update(body).digest("hex") },
    body,
  });
  if (!res.ok) throw new Error(`Webhook said ${res.status}`);
}

const sampleIssue = (state) => ({
  number: 14, title: "Login fails on mobile", body: "The login button does nothing on Android Chrome.", state,
  html_url: `https://github.com/${REPO}/issues/14`, updated_at: new Date().toISOString(),
  user: { login: "rohan-v" }, labels: [{ name: "bug" }], assignees: [],
});

const dueIn = (days) => {
  const d = new Date(Date.now() + days * 86400000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:59`;
};

export const SCENES = [
  {
    id: "intro", caption: "Ruvano for students",
    text: "This is Ruvano for students. Major projects, minor projects, hackathons. Let's set up a hackathon project, with a team, from scratch.",
    async run(page, h) { await h.moveTo({ x: 900, y: 240, width: 0, height: 0 }); await h.wait(500); },
  },
  {
    id: "signup", caption: step(1, "Sign up in under a minute"),
    text: "Choose I'm a student, and create a free account. That's all it takes.",
    say: "Choose, I'm a student, and create a free account. That's all it takes.",
    async run(page, h) {
      await h.click(page.locator("input[name=name]")); await h.type("Ananya Rao", 60);
      await h.click(page.locator("input[name=email]")); await h.type("ananya@example.com".replace("ananya", `ananya.${Date.now().toString(36)}`), 22);
      await h.click(page.locator("input[name=password]")); await h.type(PASSWORD, 18);
      await h.wait(300);
      await h.click(page.getByRole("button", { name: "Create free account" }));
      await page.waitForURL(/your-work/);
      await page.getByText("What are you working on?").waitFor();
    },
  },
  {
    id: "template", caption: step(2, "Pick what you're working on"),
    text: "Pick what you're working on. Major project, minor project, hackathon, and more. We'll take hackathon.",
    async run(page, h) {
      await h.wait(900);
      await h.moveTo(page.locator('a[href="/projects?template=major"]')); await h.wait(700);
      await h.moveTo(page.locator('a[href="/projects?template=minor"]')); await h.wait(700);
      await h.click(page.locator('a[href="/projects?template=hackathon"]'));
      await page.waitForURL(/template=hackathon/);
      await page.locator("input[name=name]").waitFor();
    },
  },
  {
    id: "create", caption: step(3, "Name it and set the deadline"),
    text: "Give it a name, and the submission deadline. Ruvano lays out the usual steps, and dates each one back from that deadline.",
    async run(page, h) {
      await h.click(page.locator("input[name=name]")); await h.type(NAME, 55);
      const due = page.locator("input[type=datetime-local]");
      await h.moveTo(due); await h.wait(300);
      await due.fill(dueIn(6));
      await h.wait(1300);
      await h.moveTo(page.getByText("To do → Building", { exact: false }).first()); await h.wait(1500);
      await h.click(page.getByRole("button", { name: "Create board" }));
      await page.waitForURL(/\/team$/);
      await page.getByText("Add teammates").waitFor();
    },
  },
  {
    id: "team", caption: step(4, "Bring your team in with one link"),
    text: "Every project has its own link. Share it on WhatsApp, and your teammates join straight away, even from other colleges.",
    async run(page, h, { browser }) {
      await h.wait(800);
      await h.click(page.getByRole("button", { name: "Copy link" }));
      await h.wait(700);
      await h.moveTo(page.getByRole("link", { name: "WhatsApp" })); await h.wait(1200);
      const code = (await project()).joinCode;
      await joinAs(browser, code, "Rohan Verma");
      await joinAs(browser, code, "Neha Iyer");
      await page.reload();
      await page.getByText("Rohan Verma").first().waitFor();
      await h.moveTo(page.getByText("Neha Iyer").first()); await h.wait(600);
    },
  },
  {
    id: "board", caption: step(5, "Your board is ready"),
    text: "Here's the board. The steps are already there, each with a due date, and the countdown at the top shows how long you've got.",
    async run(page, h) {
      await h.click(page.locator('[data-tour="project-nav"]').getByRole("link", { name: "Board" }));
      await page.getByText("Register the team").first().waitFor();
      await h.wait(900);
      await h.poster("student-walkthrough");
      await h.moveTo(page.getByText(/days? left|\dd \d+h left/).first()); await h.wait(1300);
      await h.moveTo(page.getByText("Register the team").first()); await h.wait(700);
    },
  },
  {
    id: "assign", caption: step(6, "Share out the work"),
    text: "Open a card, and give it to someone. They get a notification straight away.",
    async run(page, h) {
      await h.click(page.getByRole("link", { name: /Pick the problem statement/ }));
      const panel = page.locator("aside[role=dialog]");
      const picker = panel.locator('[aria-haspopup="listbox"]').filter({ hasText: /Unassigned/ }).first();
      await picker.waitFor();
      await h.wait(500);
      await h.click(picker); await h.wait(600);
      await h.click(page.getByRole("option", { name: /Rohan Verma/ }).first());
      await h.wait(1200);
      await page.keyboard.press("Escape");
      await h.wait(400);
      const p = await project();
      const pick = (t) => p.issues.find((i) => i.title.startsWith(t)).id;
      const people = await db.user.findMany({ where: { name: { in: ["Ananya Rao", "Neha Iyer", "Rohan Verma"] } }, orderBy: { createdAt: "desc" } });
      const who = (n) => people.find((u) => u.name === n).id;
      const assign = { "Register the team": "Ananya Rao", "Split the work": "Ananya Rao", "Build a working demo": "Neha Iyer", "Deploy it": "Rohan Verma", "Make the pitch deck": "Neha Iyer", "Record the demo video": "Ananya Rao", "Submit before": "Ananya Rao" };
      for (const [t, n] of Object.entries(assign)) await db.issue.update({ where: { id: pick(t) }, data: { assigneeId: who(n) } });
      await nudge(page);
      await h.wait(900);
    },
  },
  {
    id: "live", caption: step(7, "The board updates by itself"),
    text: "When a teammate moves a card, you see it straight away, with no reloading.",
    async run(page, h) {
      await h.moveTo(page.getByText("Live", { exact: true })); await h.wait(1000);
      const p = await project();
      const building = p.statuses.find((s) => s.name === "Building");
      const done = p.statuses.find((s) => s.category === "DONE");
      const pick = (t) => p.issues.find((i) => i.title.startsWith(t)).id;
      await db.issue.update({ where: { id: pick("Register the team") }, data: { statusId: done.id, resolvedAt: new Date(), statusChangedAt: new Date() } });
      await db.issue.update({ where: { id: pick("Pick the problem") }, data: { statusId: done.id, resolvedAt: new Date(), statusChangedAt: new Date() } });
      await db.issue.update({ where: { id: pick("Build a working demo") }, data: { statusId: building.id, statusChangedAt: new Date(), startedAt: new Date() } });
      await nudge(page);
      await h.wait(1200);
      await h.moveTo(page.locator('[data-tour="board-columns"] > div').nth(1)); await h.wait(600);
    },
  },
  {
    id: "github", caption: step(8, "Connect your GitHub repo"),
    text: "Click GitHub in the project menu, and connect your repo in one click.",
    async run(page, h) {
      await h.click(page.locator('[data-tour="github"]'));
      const connect = page.getByRole("link", { name: "Connect GitHub" }).last();
      await connect.waitFor();
      await h.wait(500);
      await h.moveTo(connect); await h.wait(900);
      await db.project.update({ where: { id: (await project()).id }, data: { githubRepo: REPO, githubHookId: "1", githubLastEventAt: new Date(), githubLastEventType: "ping" } });
      await page.reload();
      await page.getByText("Last received").waitFor();
      await h.moveTo(page.getByText("Add GitHub issues to the board")); await h.wait(800);
    },
  },
  {
    id: "issue", caption: step(9, "GitHub issues become cards"),
    text: "Now, when someone opens an issue on GitHub, it lands on your board by itself. Close it on GitHub, and the card closes too. You can also click Fetch from GitHub, any time.",
    async run(page, h) {
      await h.click(page.locator('[data-tour="project-nav"]').getByRole("link", { name: "Board" }));
      await page.getByRole("button", { name: "Fetch from GitHub" }).waitFor();
      await h.wait(1200);
      await githubEvent("opened", sampleIssue("open"));
      await nudge(page);
      const card = page.getByRole("link", { name: /Login fails on mobile/ });
      await card.waitFor();
      await h.moveTo(card); await h.wait(3000);
      await githubEvent("closed", sampleIssue("closed"));
      await nudge(page);
      await h.wait(2200);
      await h.moveTo(page.getByRole("button", { name: "Fetch from GitHub" })); await h.wait(1200);
    },
  },
  {
    id: "who", caption: step(10, "See who's doing what"),
    text: "The Team page shows who's doing what. And the contribution report puts it on paper, with finished tasks and commits, ready to print for the viva.",
    async run(page, h) {
      await h.click(page.locator('[data-tour="project-nav"]').getByRole("link", { name: "Team" }));
      await page.getByText("Who's doing what").waitFor();
      await h.wait(600);
      await h.moveTo(page.locator("tr").filter({ hasText: "Rohan Verma" })); await h.wait(900);
      await h.click(page.getByRole("link", { name: "Contribution report" }));
      await page.getByText("Finished tasks").waitFor();
      await h.caption(step(10, "See who's doing what"));
      await h.wait(1800);
      await h.moveTo(page.getByRole("button", { name: /Print or save as PDF/ })); await h.wait(1000);
      await h.click(page.getByRole("link", { name: "Back" }));
      await page.getByText("Who's doing what").waitFor();
      await h.caption(step(10, "See who's doing what"));
    },
  },
  {
    id: "today", caption: step(11, "Start every day on Today"),
    text: "And Today shows every deadline, and all your tasks, across all your projects.",
    async run(page, h) {
      await h.click(page.locator('[data-tour="your-work"]'));
      await page.getByText("Deadlines").first().waitFor();
      await h.wait(500);
      await h.moveTo(page.getByText("Deadlines").first()); await h.wait(900);
      await h.moveTo(page.getByText("Your tasks").first()); await h.wait(900);
    },
  },
  {
    id: "outro", caption: "Free, for your whole team",
    text: "That's Ruvano for students. It's free, for your whole team. Good luck with your project!",
    async run(page, h) { await h.moveTo({ x: 800, y: 400, width: 0, height: 0 }); await h.wait(500); },
  },
];

export const closeStudentDb = () => db.$disconnect();
