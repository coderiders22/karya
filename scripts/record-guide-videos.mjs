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
import path from "path";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const OUT = path.resolve("public/guide/videos");
const TMP = path.resolve(".video-tmp");
const SIZE = { width: 1280, height: 800 };
const [email, password] = readFileSync(".dev-credentials", "utf8").split("\n").find((l) => l.startsWith("ADMIN")).trim().split(/\s+/).slice(1);

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

/** Cursor + caption overlay, and flags so tours, splash and greetings don't interrupt. */
const overlay = () => {
  try {
    localStorage.setItem("karya:tour:welcome", "done");
    localStorage.setItem("karya:tour:board", "done");
    sessionStorage.setItem("karya:booted", "1");
    sessionStorage.setItem("karya:greeted", "1");
  } catch {}
  const mount = () => {
    if (document.getElementById("rec-cursor")) return;
    const style = document.createElement("style");
    style.textContent = `
      #rec-cursor{position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-3px,-2px);transition:transform .08s}
      #rec-cursor.down{transform:translate(-3px,-2px) scale(.86)}
      .rec-ripple{position:fixed;z-index:2147483646;pointer-events:none;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;
        border:2px solid #17a383;animation:rec-r .45s ease-out forwards}
      @keyframes rec-r{from{opacity:.9;transform:scale(.3)}to{opacity:0;transform:scale(1.4)}}
      #rec-cap{position:fixed;left:50%;bottom:28px;z-index:2147483645;pointer-events:none;transform:translate(-50%,8px);opacity:0;
        max-width:760px;padding:11px 18px;border-radius:12px;background:rgba(17,17,16,.92);color:#fff;
        font:500 16px/1.4 Inter,system-ui,sans-serif;letter-spacing:-.005em;box-shadow:0 10px 30px -8px rgba(0,0,0,.45);
        transition:opacity .25s,transform .25s}
      #rec-cap.on{opacity:1;transform:translate(-50%,0)}
      #rec-cap b{color:#5fd4b6;font-weight:600}
      #rec-cap kbd{display:inline-block;min-width:22px;padding:0 6px;margin:0 1px;border:1px solid rgba(255,255,255,.25);border-bottom-width:2px;
        border-radius:5px;font:600 13px/20px Inter,system-ui,sans-serif;text-align:center;background:rgba(255,255,255,.08)}`;
    document.head.appendChild(style);
    const c = document.createElement("div");
    c.id = "rec-cursor";
    c.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 2.5v17.2l4.6-4.4 2.9 6.6 3-1.3-2.9-6.5h6.4z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    document.body.appendChild(c);
    const cap = document.createElement("div");
    cap.id = "rec-cap";
    document.body.appendChild(cap);
    const pos = JSON.parse(sessionStorage.getItem("rec-pos") || "[640,400]");
    c.style.left = pos[0] + "px"; c.style.top = pos[1] + "px";
    addEventListener("mousemove", (e) => { c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; sessionStorage.setItem("rec-pos", JSON.stringify([e.clientX, e.clientY])); }, true);
    addEventListener("mousedown", (e) => {
      c.classList.add("down");
      const r = document.createElement("div"); r.className = "rec-ripple"; r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px";
      document.body.appendChild(r); setTimeout(() => r.remove(), 500);
    }, true);
    addEventListener("mouseup", () => c.classList.remove("down"), true);
    window.__cap = (html) => { cap.innerHTML = html || ""; cap.classList.toggle("on", !!html); };
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
};

function helpers(page) {
  const wait = (ms) => page.waitForTimeout(ms);
  let at = { x: 640, y: 400 };
  const moveTo = async (target, { dx = 0, dy = 0, steps = 28 } = {}) => {
    const box = typeof target.boundingBox === "function" ? await target.boundingBox() : target;
    const x = box.x + (box.width ?? 0) / 2 + dx, y = box.y + (box.height ?? 0) / 2 + dy;
    await page.mouse.move(x, y, { steps });
    at = { x, y };
  };
  return {
    wait,
    moveTo,
    caption: async (html, hold = 0) => { await page.evaluate((h) => window.__cap?.(h), html); if (hold) await wait(hold); },
    click: async (loc, opts) => { await loc.scrollIntoViewIfNeeded(); await moveTo(loc, opts); await wait(220); await page.mouse.down(); await wait(70); await page.mouse.up(); },
    type: async (text, delay = 55) => page.keyboard.type(text, { delay }),
    drag: async (from, to) => {
      await moveTo(from); await wait(250);
      await page.mouse.down(); await wait(120);
      await page.mouse.move(at.x + 12, at.y + 6, { steps: 4 });
      const box = await to.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + 70, { steps: 40 });
      await wait(250); await page.mouse.up();
    },
    poster: (name) => page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 82 }),
  };
}

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
    await h.caption("Press <kbd>C</kbd> anywhere to create an issue.", 1600);
    await page.keyboard.press("c");
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
    await run(page, helpers(page));
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
