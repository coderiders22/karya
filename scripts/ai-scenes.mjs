// The "AI in Ruvano" video, used by: node scripts/record-walkthrough.mjs --ai
//
// Runs on the full demo data from scripts/dev-bootstrap.mjs, with DATABASE_URL set, against a
// server that has ZHIPUAI_API_KEY. The AI answers in the video are real, from GLM, as they come.
// `prepare` adds two pull requests that shipped without a card (one that matches a card, one that
// doesn't) and opens the status link once, so its AI summary is ready before the camera starts.
import { randomBytes } from "crypto";
import { writeFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const REPO = "acme/website";
const step = (n, text) => `<span class="step">Step ${n}</span>${text}`;
const token = randomBytes(18).toString("base64url");
export const responses = {};
const save = () => writeFileSync(".video-tmp-ai-responses.json", JSON.stringify(responses, null, 2));

export async function prepare() {
  const p = await db.project.findFirstOrThrow({ where: { key: "WR" } });
  await db.project.update({ where: { id: p.id }, data: { githubRepo: REPO, githubHookId: "1", githubLastEventAt: new Date(), githubLastEventType: "pull_request", statusToken: token, aiSummary: null, aiSummaryAt: null } });
  const pr = (n, title, author, hoursAgo) => ({ projectId: p.id, externalId: `${REPO}#${n}`, title, url: `https://github.com/${REPO}/pull/${n}`, author, mergedAt: new Date(Date.now() - hoursAgo * 3600_000) });
  await db.untrackedWork.createMany({ data: [pr(44, "Add POST /subscribe endpoint for the newsletter", "rohan-mehta", 3), pr(45, "Bump eslint to v9", "sam-rivera", 5)] });
  // The status page writes its AI summary after the first visit. Do that visit now and wait for it.
  await fetch(`${BASE}/status/${token}`);
  for (let i = 0; i < 40; i++) {
    const row = await db.project.findUnique({ where: { id: p.id }, select: { aiSummary: true } });
    if (row?.aiSummary) { responses.statusSummary = row.aiSummary; save(); break; }
    await new Promise((r) => setTimeout(r, 1500));
  }
}

export const START = "/projects/WR/board";

export const SCENES = [
  {
    id: "intro", caption: "AI in Ruvano",
    text: "This is how AI works in Ruvano. It reads what's already on your board, and helps in three places. It only suggests. It never changes your work by itself.",
    async run(page, h) {
      await page.getByText("Reality check").first().waitFor();
      await h.poster("ai-in-ruvano");
      await h.moveTo({ x: 760, y: 420, width: 0, height: 0 }); await h.wait(500);
    },
  },
  {
    id: "switch", caption: step(1, "One switch for the whole team"),
    text: "An admin turns AI on or off for the whole workspace, on the Team page. It says exactly what goes to the AI provider: card titles, notes, and pull request titles. Never emails, or passwords.",
    async run(page, h) {
      await h.click(page.locator('[data-tour="team"]'));
      const setting = page.getByText("AI suggestions and summaries");
      await setting.waitFor();
      await setting.scrollIntoViewIfNeeded();
      await h.wait(600);
      await h.moveTo(setting); await h.wait(2600);
    },
  },
  {
    id: "match", caption: step(2, "AI finds the card for untracked work"),
    text: "Reality check found a pull request that shipped without a card. Click, find its card. AI reads the pull request title and the cards on the board, and suggests the one it most likely completes.",
    async run(page, h) {
      await h.click(page.getByRole("link", { name: "Website Redesign" }).last());
      const bar = page.locator('[data-reality="found"]');
      await bar.waitFor();
      await h.wait(500);
      await h.click(bar.getByRole("button").first());
      const row = bar.locator("li").filter({ hasText: "POST /subscribe" });
      await h.moveTo(row); await h.wait(900);
      await h.click(row.getByRole("button", { name: "Find its card" }));
      await page.getByText(/Suggested by AI|couldn't find|isn't available/).first().waitFor({ timeout: 70000 });
      responses.match = (await row.innerText()).replace(/\n/g, " | "); save();
      await h.moveTo(row.getByText("Suggested by AI")); await h.wait(2200);
    },
  },
  {
    id: "link", caption: step(3, "Accept it with one click"),
    text: "If it's right, link it. The pull request goes on that card, and the card moves to done, just as if the pull request had mentioned it.",
    async run(page, h) {
      const btn = page.getByRole("button", { name: /^Link to / });
      responses.linked = await btn.innerText(); save();
      await h.click(btn);
      await page.getByText(/^Linked to/).first().waitFor();
      await h.wait(900);
      await h.moveTo(page.locator('[data-tour="board-columns"] > div').last()); await h.wait(1800);
    },
  },
  {
    id: "nomatch", caption: step(4, "When nothing fits, AI says so"),
    text: "For a pull request that doesn't fit any card, like this tooling upgrade, AI says it couldn't find a match, instead of guessing. You can still add it as a done card yourself.",
    async run(page, h) {
      const row = page.locator('[data-reality="found"] li').filter({ hasText: "eslint" });
      await h.moveTo(row); await h.wait(600);
      await h.click(row.getByRole("button", { name: "Find its card" }));
      await page.getByText(/couldn't find|Suggested by AI|isn't available/).first().waitFor({ timeout: 70000 });
      responses.noMatch = (await row.innerText()).replace(/\n/g, " | "); save();
      await h.moveTo(row.getByText(/couldn't find|Suggested by AI/).first()); await h.wait(2200);
    },
  },
  {
    id: "standup", caption: step(5, "A standup summary in seconds"),
    text: "In standup, click, A I summary. It writes a few sentences from the board and today's notes, starting with whoever needs help. Edit it if you like, then copy it into your team chat.",
    say: "In standup, click, A.I. summary. It writes a few sentences from the board, and today's notes, starting with whoever needs help. Edit it if you like, then copy it into your team chat.",
    async run(page, h) {
      await h.click(page.locator('[data-tour="project-nav"]').getByRole("link", { name: "Standup" }));
      const note = page.locator('textarea[id^="note-"]').first();
      await note.waitFor();
      await h.click(note); await h.type("Waiting on the payment provider for the API key", 35);
      await h.click(page.getByText("Needs help to move forward").first());
      await h.wait(700);
      await h.click(page.getByRole("button", { name: "AI summary" }));
      const dlg = page.getByRole("dialog", { name: "AI summary" });
      await dlg.or(page.getByText("isn't available")).first().waitFor({ timeout: 70000 });
      if (await dlg.count()) {
        responses.standup = await dlg.locator("textarea").inputValue(); save();
        await h.moveTo(dlg.locator("textarea")); await h.wait(2600);
        await h.click(dlg.getByRole("button", { name: "Copy" }));
        await h.wait(900);
        await h.click(dlg.getByRole("button", { name: "Close" }));
      }
    },
  },
  {
    id: "status", caption: step(6, "A plain summary for managers"),
    text: "And on the shared status page, managers and clients get a short summary at the top, refreshed every few hours. It's marked as written by AI, and the exact lists stay right underneath.",
    async run(page, h) {
      await page.goto(`${BASE}/status/${token}`);
      await page.getByRole("heading", { name: "Shipped this week" }).waitFor();
      await h.caption(step(6, "A plain summary for managers"));
      await h.wait(600);
      const inShort = page.locator("section").filter({ hasText: "In short" }).first();
      if (await inShort.count()) { await h.moveTo(inShort); await h.wait(2600); }
      await h.moveTo(page.getByRole("heading", { name: "Shipped this week" })); await h.wait(1200);
    },
  },
  {
    id: "outro", caption: "AI suggests. Your team decides.",
    text: "That's AI in Ruvano. It suggests and summarises, only from what's already on your board. Your team stays in control, and an admin can switch it off at any time.",
    async run(page, h) { await h.moveTo({ x: 640, y: 300, width: 0, height: 0 }); await h.wait(600); },
  },
];

export const closeAiDb = () => db.$disconnect();
