// Records the short how-to videos shown on the Guide page, from the real app.
//
// Needs: the dev server running with the demo data from scripts/dev-bootstrap.mjs, and Playwright:
//   npm i --no-save playwright && npx playwright install chromium
//   node scripts/record-guide-videos.mjs            # all videos
//   node scripts/record-guide-videos.mjs board      # just one
// Output: public/guide/videos/<name>.webm plus a poster <name>.jpg
//
// Each clip shows a visible cursor and a caption bar, since screen recordings don't show either.
import { chromium } from "playwright";
import { mkdirSync, readFileSync, rmSync } from "fs";
import { helpers, overlay } from "./recording-kit.mjs";
import path from "path";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const OUT = path.resolve("public/guide/videos");
const TMP = path.resolve(".video-tmp");
const SIZE = { width: 1280, height: 800 };
const [email, password] = readFileSync(".dev-credentials", "utf8").split("\n").find((l) => l.startsWith("ADMIN")).trim().split(/\s+/).slice(1);

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

// The sprint's heading, not the <option> with the same name inside the pickers.
const sprintTitle = (page) => page.locator('xpath=//*[not(self::option)][normalize-space(text())="WR Sprint 3"]').first();

const VIDEOS = {
  async board(page, h) {
    await page.goto(`${BASE}/projects/WR/board`);
    await page.getByText("Newsletter API endpoint").waitFor();
    await h.wait(600);
    await h.caption("Each column is a step in your workflow. <b>Drag a card</b> to change its status.", 1800);
    await h.drag(page.getByRole("link", { name: "Contact form sends twice on slow networks" }), page.locator('[data-tour="board-columns"] > div').nth(1));
    await h.wait(900);
    await h.poster("board");
    await h.caption("Every card shows <b>how long it has sat in its column</b>. Amber means it's stuck.");
    await h.moveTo(page.getByRole("link", { name: "Newsletter API endpoint" }), { dy: 50, dx: -90 });
    await h.wait(2600);
    await h.caption("<b>Stuck only</b> shows blocked work and anything waiting too long.");
    await h.click(page.getByRole("button", { name: "Stuck only" }));
    await h.wait(2400);
    await h.click(page.getByRole("button", { name: "Stuck only" }));
    await h.caption("Click a card to open it in the <b>side panel</b>, without leaving the board.");
    await h.click(page.getByRole("link", { name: "Newsletter sign-up form" }));
    await h.wait(2200);
    await h.caption("<kbd>J</kbd> <kbd>K</kbd> step through issues, <kbd>M</kbd> assigns to you, <kbd>Esc</kbd> closes.");
    await h.wait(900); await page.keyboard.press("j"); await h.wait(1300); await page.keyboard.press("j"); await h.wait(1300);
    await page.keyboard.press("Escape");
    await h.caption("", 800);
  },

  async "create-issue"(page, h) {
    await page.goto(`${BASE}/projects/WR/board`);
    await page.getByText("Newsletter API endpoint").waitFor();
    await h.wait(700);
    await h.caption("Click <b>New issue</b>, or press <kbd>C</kbd> anywhere.", 900);
    await h.click(page.locator('header button[aria-label="New issue"]'));
    await page.getByPlaceholder("Issue title").waitFor();
    await h.wait(500);
    await h.caption("Write the title. Type <b>@</b> and your teammates appear.", 300);
    await h.type("Checkout button hidden on Safari @sa", 65);
    await h.wait(1300);
    await page.keyboard.press("Enter");
    await h.wait(500);
    await h.caption("<b>#</b> picks a label (or creates one), <b>!</b> sets the priority, <b>/</b> the type.", 300);
    await h.type("#fro", 90); await h.wait(1100); await page.keyboard.press("Enter"); await h.wait(400);
    await h.type("!hi", 90); await h.wait(1100); await page.keyboard.press("Enter"); await h.wait(400);
    await h.type("/bu", 90); await h.wait(1000); await page.keyboard.press("Enter");
    await h.wait(600);
    await h.caption("Every field fills in as you type, in colors you can read at a glance.", 300);
    await h.poster("create-issue");
    await h.moveTo(page.getByRole("button", { name: "Priority" }));
    await h.wait(2200);
    await h.caption("Press <kbd>Enter</kbd> and it's on the board.", 900);
    await page.getByPlaceholder("Issue title").focus();
    await page.keyboard.press("Enter");
    await h.wait(1800);
    await h.moveTo(page.getByRole("link", { name: "Checkout button hidden on Safari" }));
    await h.wait(1800);
    await h.caption("", 600);
  },

  async "quick-add"(page, h) {
    await page.goto(`${BASE}/projects/WR/board`);
    await page.getByText("Newsletter API endpoint").waitFor();
    await h.wait(700);
    await h.caption("<b>Add an issue…</b> at the bottom of a column adds one in a single line.", 600, true);
    await h.click(page.getByRole("button", { name: "Add an issue…" }).first());
    await h.wait(500);
    await h.type("Hero image blurry on retina screens @", 60);
    await h.caption("<b>@</b> suggests teammates…", 300, true);
    await h.wait(900);
    await h.type("ro", 120); await h.wait(500); await page.keyboard.press("Enter"); await h.wait(400);
    await h.caption("…<b>#</b> labels, <b>!</b> priority and <b>/</b> the type.", 200, true);
    await h.type("#fro", 110); await h.wait(900); await page.keyboard.press("Enter"); await h.wait(300);
    await h.type("!hi", 110); await h.wait(900); await page.keyboard.press("Enter"); await h.wait(300);
    await h.type("/bu", 110); await h.wait(800); await page.keyboard.press("Enter");
    await h.wait(500);
    await h.caption("Your picks show as <b>colored chips</b>. Click <b>Add issue</b> (or press <kbd>Enter</kbd>).", 300, true);
    await h.poster("quick-add");
    await h.wait(1800);
    await h.click(page.getByRole("button", { name: "Add issue" }));
    await h.wait(1800);
    await h.moveTo(page.getByRole("link", { name: "Hero image blurry on retina screens" }));
    await h.wait(1600);
    await h.caption("The box stays open for the next one. <b>Cancel</b> closes it.", 300, true);
    await h.click(page.getByRole("button", { name: "Cancel" }));
    await h.wait(1200);
    await h.caption("", 600, true);
  },

  async "side-panel"(page, h) {
    await page.goto(`${BASE}/projects/WR/board`);
    await page.getByText("Newsletter API endpoint").waitFor();
    await h.wait(700);
    await h.caption("Click a card to open it in the <b>side panel</b>.", 600);
    await h.click(page.getByRole("link", { name: "Newsletter API endpoint" }));
    const panel = page.locator("aside[role=dialog]");
    await panel.getByRole("button", { name: "Status" }).waitFor();
    await h.wait(1200);
    await h.caption("Change status, priority, assignee and labels with <b>colored pickers</b>.");
    await h.click(panel.getByRole("button", { name: "Status" }));
    await h.wait(900);
    await page.keyboard.press("ArrowDown"); await h.wait(450);
    await page.keyboard.press("Enter");
    await h.wait(1000);
    await h.click(panel.getByRole("button", { name: "Priority" }));
    await h.wait(700);
    await h.poster("side-panel");
    await page.keyboard.press("ArrowUp"); await h.wait(400); await page.keyboard.press("ArrowUp"); await h.wait(400);
    await page.keyboard.press("Enter");
    await h.wait(900);
    await h.click(panel.getByRole("button", { name: "Labels" }));
    await h.wait(500);
    await h.type("api", 100); await h.wait(800);
    await page.keyboard.press("Enter"); await h.wait(600);
    await h.caption("A new label opens the color palette. Pick any color; it applies everywhere.");
    await h.click(page.locator('[aria-label="Color for api"] [title="Indigo"]'));
    await h.wait(1400);
    await page.keyboard.press("Escape");
    await h.wait(900);
    await h.caption("Reply at the bottom. <b>@</b> brings up teammates to mention.");
    await h.click(panel.locator("textarea"));
    await h.type("Mail provider key has arrived. @le", 55);
    await h.wait(1100);
    await page.keyboard.press("Enter");
    await h.type("can you review the endpoint?", 50);
    await h.wait(500);
    await h.caption("Click <b>Comment</b> to post it. They're notified straight away.");
    await h.click(panel.getByRole("button", { name: "Comment", exact: true }));
    await h.wait(2400);
    await h.caption("", 600);
  },

  async sprint(page, h) {
    await page.goto(`${BASE}/projects/WR/backlog`);
    await sprintTitle(page).waitFor();
    await h.wait(700);
    await h.caption("Plan the next sprint in the <b>Backlog</b>.", 2000);
    const pickers = page.getByLabel("Move to sprint");
    for (const title of ["Trial sign-up with company details", "Welcome email sequence"]) {
      const row = page.locator("li, tr, div").filter({ hasText: title }).filter({ has: pickers }).last();
      const picker = row.getByLabel("Move to sprint");
      await picker.scrollIntoViewIfNeeded();
      await h.caption("Pick a sprint for each issue, or select many in <b>Issues</b> and move them together.");
      await h.moveTo(picker); await h.wait(500);
      await picker.selectOption({ label: "WR Sprint 3" });
      await h.wait(1600);
    }
    await sprintTitle(page).scrollIntoViewIfNeeded();
    await h.moveTo(sprintTitle(page));
    await h.caption("Karya checks the plan against your <b>usual velocity</b> and warns before you over-commit.", 600);
    await h.poster("sprint");
    await h.wait(3000);
    await h.caption("When the current sprint ends, <b>Start sprint</b> here. The board then shows a live forecast.", 3200);
    await h.caption("", 500);
  },

  async standup(page, h) {
    await page.goto(`${BASE}/projects/WR/standup`);
    await page.getByRole("button", { name: "Run standup" }).waitFor();
    await h.wait(700);
    await h.caption("<b>Standup</b> lists everyone's done, in-progress, blocked and next work. Nobody has to prepare.", 2800);
    await h.poster("standup");
    await h.caption("<b>Run standup</b> goes person by person, with a 2-minute timer each.");
    await h.click(page.getByRole("button", { name: "Run standup" }));
    await h.wait(2600);
    await h.caption("<kbd>→</kbd> or <kbd>Space</kbd> for the next person, <kbd>←</kbd> to go back.", 800);
    await page.keyboard.press("ArrowRight"); await h.wait(2000);
    await page.keyboard.press("ArrowRight"); await h.wait(2000);
    await h.caption("Click <b>End</b> when everyone's done.");
    await h.click(page.getByRole("button", { name: "End" }));
    await h.wait(1200);
    await h.caption("", 500);
  },

  async "search-bulk"(page, h) {
    await page.goto(`${BASE}/filters`);
    await page.getByPlaceholder("Search text or key").waitFor();
    await h.wait(700);
    await h.caption("<b>All issues</b> searches every project. Filter by text, status, person, priority…", 600);
    await h.click(page.getByPlaceholder("Search text or key"));
    await h.type("newsletter", 70);
    await h.wait(300);
    await h.click(page.getByRole("button", { name: "Apply" }));
    await page.waitForURL(/q=newsletter/);
    await h.wait(1500);
    await h.caption("Tick the issues you want to change…");
    const boxes = page.locator('tbody input[type="checkbox"]');
    const n = Math.min(2, await boxes.count());
    for (let i = 0; i < n; i++) { await h.click(boxes.nth(i)); await h.wait(500); }
    await h.wait(600);
    await h.caption("…and change status, assignee, priority or sprint for <b>all of them at once</b>.", 600);
    await h.poster("search-bulk");
    const assign = page.locator("select").filter({ hasText: "Assign to…" });
    await h.moveTo(assign); await h.wait(700);
    await assign.selectOption({ label: "Lena Fischer" });
    await h.wait(2200);
    await h.caption("<b>Save view</b> keeps the filter. Shared views show in everyone's sidebar.");
    await h.click(page.getByRole("button", { name: "Save view" }));
    await page.getByPlaceholder("Filter name").waitFor();
    await h.type("Newsletter work", 60);
    await h.click(page.getByLabel("Share with team"));
    await h.click(page.getByRole("button", { name: "Save", exact: true }));
    await h.wait(2200);
    await h.caption("", 500);
  },

  async invite(page, h) {
    await page.goto(`${BASE}/settings/members`);
    await page.getByRole("button", { name: "Create invite link" }).waitFor();
    await h.wait(700);
    await h.caption("Karya has no public sign-up. Admins <b>invite people with a link</b>.", 2200);
    await h.click(page.getByPlaceholder(/Email/));
    await h.type("priya@yourcompany.com", 55);
    await h.wait(500);
    await h.caption("Choose <b>Member</b> or <b>Admin</b>, then create the link.", 1400);
    await h.click(page.getByRole("button", { name: "Create invite link" }));
    await h.wait(1400);
    await h.poster("invite");
    await h.caption("Copy it and send it on Slack, WhatsApp or email. It works for 7 days.", 600);
    await h.click(page.getByRole("button", { name: "Copy" }));
    await h.wait(2600);
    await h.caption("", 500);
  },
};

const only = process.argv.slice(2);
const browser = await chromium.launch();
// Log in once, reuse the session for every clip.
{
  const ctx = await browser.newContext({ viewport: SIZE });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder("you@company.com").fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.keyboard.press("Enter");
  await page.waitForURL(/your-work/);
  await ctx.storageState({ path: path.join(TMP, "state.json") });
  await ctx.close();
}

for (const [name, run] of Object.entries(VIDEOS)) {
  if (only.length && !only.includes(name)) continue;
  const ctx = await browser.newContext({
    viewport: SIZE, deviceScaleFactor: 1, colorScheme: "light",
    storageState: path.join(TMP, "state.json"),
    recordVideo: { dir: TMP, size: SIZE },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  await ctx.addInitScript(overlay);
  const page = await ctx.newPage();
  try {
    await run(page, helpers(page, OUT));
  } catch (e) {
    console.error(`✗ ${name}:`, e.message);
  }
  const video = page.video();
  await ctx.close();
  const out = path.join(OUT, `${name}.webm`);
  await video.saveAs(out);
  await video.delete();
  console.log(`✓ ${name} → ${path.relative(process.cwd(), out)}`);
}
await browser.close();
rmSync(TMP, { recursive: true, force: true });
