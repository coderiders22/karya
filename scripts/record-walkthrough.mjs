// The full Karya walkthrough: one video that sets up a project from scratch and uses every main
// feature, with captions and a spoken narration.
//
// 1. Start from a workspace that has people but no projects:
//      createdb … && npx prisma migrate deploy && node --env-file=.env scripts/dev-bootstrap.mjs --team-only
//    and run the dev server on that database.
// 2. npm i --no-save playwright ffmpeg-static && npx playwright install chromium
// 3. node scripts/record-walkthrough.mjs                  record + narrate
//    node scripts/record-walkthrough.mjs --audio-only     re-narrate the last recording (e.g. another voice)
//    Options: --voice=Tara  --rate=172   (any voice from `say -v '?'`)
//
// Output: public/guide/videos/walkthrough.mp4 (+ .jpg poster, .vtt captions)
//
// The student video: node scripts/record-walkthrough.mjs --student
// Run it on an empty database, with DATABASE_URL and AUTH_SECRET set. See scripts/student-scenes.mjs.
// Output: public/guide/videos/student-walkthrough.mp4 (+ .jpg, .vtt)
//
// Each scene's narration is spoken with macOS `say` first, so we know how long it is; the scene
// then lasts at least that long while its actions run. Afterwards the clips are laid on the
// recording at each scene's start time and everything is encoded as H.264 + AAC.
import { chromium } from "playwright";
import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { createRequire } from "module";
import { helpers, overlay, readMarkers } from "./recording-kit.mjs";

const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static");
const arg = (name, dflt) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? dflt;
const VOICE = arg("voice", "Tara");
const RATE = arg("rate", "172");
const AUDIO_ONLY = process.argv.includes("--audio-only");
const STUDENT = process.argv.includes("--student");
const NAME = STUDENT ? "student-walkthrough" : "walkthrough";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const OUT = path.resolve("public/guide/videos");
const TMP = path.resolve(STUDENT ? ".video-tmp-student" : ".video-tmp-walkthrough");
const SIZE = { width: 1280, height: 800 };
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const step = (n, text) => `<span class="step">Step ${n}</span>${text}`;
const P = "Mobile App";

/**
 * The story. `say` is what the voice reads (spelled for speech where needed); `text` is the
 * written version for the captions file.
 */
const TEAM_SCENES = [
  {
    id: "intro", caption: "Karya · the full walkthrough",
    text: "Welcome to Karya. In the next few minutes, we'll set up a brand new project, and use everything your team will need, day to day.",
    async run(page, h) { await h.moveTo({ x: 700, y: 330, width: 0, height: 0 }); await h.wait(600); },
  },
  {
    id: "project", caption: step(1, "Create a project"),
    text: "Everything starts with a project. We'll call this one Mobile App, with the short key MOB. Every issue in the project is numbered with that key, like MOB one.",
    say: "Everything starts with a project. We'll call this one, Mobile App, with the short key, M O B. Every issue in the project is numbered with that key, like M O B one.",
    async run(page, h) {
      await h.click(page.locator('[data-tour="projects"]'));
      const name = page.getByPlaceholder("Website Redesign");
      await name.waitFor();
      await h.click(name); await h.type(P, 75);
      const key = page.locator('form input[name="key"]').first();
      await h.click(key); await key.fill(""); await h.type("MOB", 140);
      await h.wait(400);
      await h.click(page.getByRole("button", { name: "Create project" }));
      await page.waitForURL(/\/projects\/MOB\/board/);
      await h.wait(600);
    },
  },
  {
    id: "epic", caption: step(2, "Add an epic: a big goal"),
    text: "This is the board, empty for now. Big goals are called epics. Click New issue, type the title, and slash epic sets the type.",
    say: "This is the board, empty for now. Big goals are called epics. Click, New issue, type the title, and, slash epic, sets the type.",
    async run(page, h) {
      await h.click(page.locator('header button[aria-label="New issue"]'));
      await page.getByPlaceholder("Issue title").waitFor();
      await h.wait(300);
      await h.type("User onboarding /ep", 75); await h.wait(900); await page.keyboard.press("Enter");
      await h.wait(1000);
      await h.click(page.getByRole("button", { name: /Create issue/ }));
      await page.getByPlaceholder("Issue title").waitFor({ state: "detached" });
    },
  },
  {
    id: "story", caption: step(3, "Add a story: @ assigns, # labels, ! priority"),
    text: "Now a story under that epic. While you type the title, the at sign assigns a teammate, the hash sign adds a label, and the exclamation mark sets the priority. We'll add an estimate, and link it to the epic.",
    async run(page, h) {
      await h.click(page.locator('header button[aria-label="New issue"]'));
      await page.getByPlaceholder("Issue title").waitFor();
      await h.wait(300);
      await h.type("Sign up with email @sa", 70); await h.wait(1000); await page.keyboard.press("Enter");
      await h.type("#auth", 110); await h.wait(1000); await page.keyboard.press("Enter");
      await h.type("!hi", 110); await h.wait(900); await page.keyboard.press("Enter");
      await h.type("/st", 110); await h.wait(800); await page.keyboard.press("Enter");
      await h.click(page.getByLabel("Estimate in points")); await h.type("3", 150);
      await h.click(page.getByLabel("Parent issue key")); await h.type("MOB-1", 90);
      await h.wait(1200);
      await h.click(page.getByRole("button", { name: /Create issue/ }));
      await page.getByPlaceholder("Issue title").waitFor({ state: "detached" });
    },
  },
  {
    id: "quick", caption: step(4, "Quick add: several issues, fast"),
    text: "To add several issues quickly, use Add an issue, at the bottom of a column. The same shortcuts work here, and your picks show up as colored chips.",
    async run(page, h) {
      await h.click(page.getByRole("button", { name: "Add an issue…" }).first());
      const add = page.getByRole("button", { name: "Add issue" });
      await h.type("Password reset email @ro", 65); await h.wait(800); await page.keyboard.press("Enter");
      await h.type("#au", 110); await h.wait(800); await page.keyboard.press("Enter");
      await h.wait(400); await h.click(add); await h.wait(1300);
      await h.type("App crashes on Android login @le", 60); await h.wait(700); await page.keyboard.press("Enter");
      await h.type("!highe", 100); await h.wait(700); await page.keyboard.press("Enter");
      await h.type("/bu", 110); await h.wait(700); await page.keyboard.press("Enter");
      await h.wait(400); await h.click(add); await h.wait(1300);
      await h.type("Add the app icon @aa", 65); await h.wait(700); await page.keyboard.press("Enter");
      await h.wait(400); await h.click(add);
      // The new card pushes the form down: wait for it, or the click lands on the card.
      await page.getByRole("link", { name: "Add the app icon" }).waitFor();
      await h.wait(900);
      await h.click(page.getByRole("button", { name: "Cancel" }));
    },
  },
  {
    id: "plan", caption: step(5, "Plan a sprint in the Backlog"),
    text: "Next, plan a sprint. In the Backlog, create a sprint, give it a goal, and move the issues you'll work on into it. After a sprint or two, Karya also compares each plan with your team's usual pace.",
    async run(page, h) {
      await h.click(page.locator('[data-tour="project-nav"]').getByRole("link", { name: "Backlog" }));
      await h.click(page.getByRole("button", { name: "New sprint" }));
      const title = page.locator('xpath=//*[not(self::option)][normalize-space(text())="MOB Sprint 1"]').first();
      await title.waitFor();
      await h.wait(500);
      await h.click(page.getByRole("button", { name: "Edit" }).first());
      const goal = page.locator('textarea[name="goal"]');
      await goal.waitFor();
      await h.click(goal); await h.type("Ship sign-up and login", 60);
      await h.click(page.getByRole("button", { name: "Save" }));
      await goal.waitFor({ state: "detached" });
      await h.wait(500);
      const pickers = page.getByLabel("Move to sprint");
      for (const t of ["Sign up with email", "Password reset email", "App crashes on Android login"]) {
        const row = page.locator("li, tr, div").filter({ hasText: t }).filter({ has: pickers }).last();
        const picker = row.getByLabel("Move to sprint");
        await picker.scrollIntoViewIfNeeded();
        await h.moveTo(picker); await h.wait(450);
        await picker.selectOption({ label: "MOB Sprint 1" });
        await h.wait(1100);
      }
    },
  },
  {
    id: "start", caption: step(6, "Start the sprint"),
    text: "When the plan looks right, start the sprint. The board now shows only this sprint, with a live forecast at the top, so you know early if work won't land.",
    async run(page, h) {
      // Stays disabled for a moment after the last issue moves into the sprint.
      const start = page.getByRole("button", { name: "Start sprint", disabled: false });
      await start.waitFor();
      await start.scrollIntoViewIfNeeded();
      await h.click(start);
      await page.getByRole("button", { name: "Start sprint" }).waitFor({ state: "detached" });
      await h.wait(800);
      await h.click(page.locator('[data-tour="project-nav"]').getByRole("link", { name: "Board" }));
      const forecast = page.locator('[data-tour="forecast"]');
      await forecast.waitFor();
      await h.wait(500);
      await h.moveTo(forecast);
    },
  },
  {
    id: "move", caption: step(7, "Drag cards as work moves"),
    text: "As work moves, drag the cards across the columns. Every card shows how long it has been in its column, so anything stuck stands out. The board is live, so your team's changes show up by themselves.",
    async run(page, h) {
      const cols = page.locator('[data-tour="board-columns"] > div');
      await h.drag(page.getByRole("link", { name: "Sign up with email" }), cols.nth(1));
      await h.wait(900);
      await h.drag(page.getByRole("link", { name: "App crashes on Android login" }), cols.nth(1));
      await h.wait(900);
      await h.drag(page.getByRole("link", { name: "Password reset email" }), cols.nth(2));
      await h.wait(1000);
      await h.poster("walkthrough");
    },
  },
  {
    id: "panel", caption: step(8, "Side panel: colored pickers and labels"),
    text: "Click any card to open it in the side panel. Change its status, priority, or labels, right here. New labels can get any color you like.",
    async run(page, h) {
      await h.click(page.getByRole("link", { name: "App crashes on Android login" }));
      const panel = page.locator("aside[role=dialog]");
      await panel.getByRole("button", { name: "Labels" }).waitFor();
      await h.wait(800);
      await h.click(panel.getByRole("button", { name: "Labels" }));
      await h.wait(400);
      await h.type("android", 100); await h.wait(700);
      await page.keyboard.press("Enter"); await h.wait(700);
      await h.click(page.locator('[aria-label="Color for android"] [title="Green"]'));
      await h.wait(900);
      await page.keyboard.press("Escape");
      await h.wait(500);
    },
  },
  {
    id: "comment", caption: step(9, "Comment and @mention a teammate"),
    text: "Comments live here too. Type the at sign to mention a teammate. They get a notification, with a soft chime, straight away.",
    async run(page, h) {
      const panel = page.locator("aside[role=dialog]");
      await h.click(panel.locator("textarea"));
      await h.type("Crash log is in Slack. @ro", 60); await h.wait(900); await page.keyboard.press("Enter");
      await h.type("can you take a look today?", 55);
      await h.wait(500);
      await h.click(panel.getByRole("button", { name: "Comment", exact: true }));
      await h.wait(1600);
      await page.keyboard.press("Escape");
    },
  },
  {
    id: "standup", caption: step(10, "Run the daily standup"),
    text: "Every morning, open Standup. It shows what each person finished, what they're on, and what's blocked, straight from the board. Run standup goes person by person, with a timer.",
    async run(page, h) {
      await h.click(page.locator('[data-tour="project-nav"]').getByRole("link", { name: "Standup" }));
      const run = page.getByRole("button", { name: "Run standup" });
      await run.waitFor();
      await h.wait(1800);
      await h.click(run);
      await h.wait(2400);
      await page.keyboard.press("ArrowRight"); await h.wait(2000);
      await page.keyboard.press("ArrowRight"); await h.wait(1800);
      await h.click(page.getByRole("button", { name: "End" }));
    },
  },
  {
    id: "roadmap", caption: step(11, "Roadmap and Insights"),
    text: "The roadmap shows every epic on a timeline, filling up as its stories get done. Insights tracks the sprint burndown, your velocity, and where work tends to wait.",
    async run(page, h) {
      await h.click(page.locator('[data-tour="project-nav"]').getByRole("link", { name: "Roadmap" }));
      await h.wait(3200);
      await h.click(page.locator('[data-tour="project-nav"]').getByRole("link", { name: "Insights" }));
      await h.wait(1800);
      await h.moveTo({ x: 760, y: 450, width: 0, height: 0 });
      for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, 90); await h.wait(160); }
      await h.wait(1200);
    },
  },
  {
    id: "bulk", caption: step(12, "Search and change many issues at once"),
    text: "All issues searches across every project. Filter, tick a few rows, and change their assignee, priority, or sprint, in one go.",
    async run(page, h) {
      await h.click(page.locator('[data-tour="all-issues"]'));
      const q = page.getByPlaceholder("Search text or key");
      await q.waitFor();
      await h.click(q); await h.type("email", 90);
      await h.click(page.getByRole("button", { name: "Apply" }));
      await page.waitForURL(/q=email/);
      await h.wait(900);
      const boxes = page.locator('tbody input[type="checkbox"]');
      const n = Math.min(2, await boxes.count());
      for (let i = 0; i < n; i++) { await h.click(boxes.nth(i)); await h.wait(400); }
      const assign = page.locator("select").filter({ hasText: "Assign to…" });
      await h.moveTo(assign); await h.wait(700);
      await assign.selectOption({ label: "Lena Fischer" });
      await h.wait(1500);
    },
  },
  {
    id: "github", caption: step(13, "Connect GitHub"),
    text: "Click GitHub in the project menu to connect your repository. New GitHub issues become cards on the board, and cards move by themselves when pull requests open and merge.",
    async run(page, h) {
      await h.click(page.getByRole("link", { name: P }).last());
      await page.locator('[data-tour="github"]').waitFor();
      await h.click(page.locator('[data-tour="github"]'));
      const connect = page.getByRole("link", { name: "Connect GitHub" }).last();
      await connect.waitFor();
      await h.wait(700);
      await h.moveTo(connect);
      await h.wait(900);
    },
  },
  {
    id: "settings", caption: step(14, "Settings: columns and Jira"),
    text: "In project settings, you can set work in progress limits on columns, and export the whole project to Jira at any time.",
    say: "In project settings, you can set work in progress limits on columns, and export the whole project to Jira, at any time.",
    async run(page, h) {
      await h.click(page.locator('[data-tour="project-nav"]').getByRole("link", { name: "Settings" }));
      await page.getByText("Board columns").first().waitFor();
      await h.wait(900);
      await h.moveTo({ x: 760, y: 420, width: 0, height: 0 });
      for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 110); await h.wait(260); }
      await h.wait(800);
    },
  },
  {
    id: "invite", caption: step(15, "Invite your team"),
    text: "Finally, invite your team. Type an email, choose a role, from viewer to admin, and create a link to share on Slack or WhatsApp. Only people you invite can get in.",
    say: "Finally, invite your team. Type an email, choose a role, from viewer to admin, and create a link to share on Slack, or WhatsApp. Only people you invite can get in.",
    async run(page, h) {
      await h.click(page.locator('[data-tour="team"]'));
      const email = page.getByPlaceholder(/Email/);
      await email.waitFor();
      await h.wait(500);
      await h.click(email); await h.type("priya@yourcompany.com", 55);
      await h.wait(400);
      const role = page.locator("select[name=role]");
      await h.moveTo(role); await h.wait(500);
      await role.selectOption("MANAGER");
      await h.wait(800);
      await h.click(page.getByRole("button", { name: "Create invite link" }));
      await h.wait(1600);
    },
  },
  {
    id: "outro", caption: "Need help? Everything is in the Guide",
    text: "That's Karya. Every feature is explained in the Guide, with short videos, and you can press the question mark key, any time, for keyboard shortcuts. Happy shipping!",
    async run(page, h) {
      await h.click(page.locator('[data-tour="guide"]'));
      await page.getByPlaceholder(/Search the guide/).waitFor();
      await h.wait(1000);
    },
  },
];

const SCENES = STUDENT ? (await import("./student-scenes.mjs")).SCENES : TEAM_SCENES;

/** Speak one line with macOS `say`; returns the file and its length in seconds. */
function speak(scene, voice) {
  const file = path.join(TMP, `${scene.id}.${voice.replace(/\W+/g, "")}.aiff`);
  const text = scene.say ?? scene.text;
  const words = text.split(/\s+/).length;
  for (let attempt = 0; attempt < 3; attempt++) {
    // `say -o` doesn't always replace an existing file cleanly (an old run's audio can linger), so start fresh.
    rmSync(file, { force: true });
    execFileSync("say", ["-v", voice, "-r", String(RATE), "-o", file, text]);
    const info = execFileSync("afinfo", [file]).toString();
    const dur = Number(info.match(/estimated duration: ([\d.]+)/)?.[1] ?? 0);
    if (dur > 0 && dur < words * 0.6 + 3) return { file, dur }; // ~2+ words a second; anything slower is a bad file
    console.warn(`  ! ${scene.id}: ${dur.toFixed(1)}s for ${words} words looks wrong, speaking it again`);
  }
  throw new Error(`Couldn't produce narration for ${scene.id}`);
}

async function record() {
  for (const s of SCENES) Object.assign(s, speak(s, VOICE));
  console.log(`Narration (${VOICE}): ${SCENES.reduce((t, s) => t + s.dur, 0).toFixed(0)}s across ${SCENES.length} scenes`);

  const browser = await chromium.launch();
  if (!STUDENT) {
  const [email, password] = readFileSync(".dev-credentials", "utf8").split("\n").find((l) => l.startsWith("ADMIN")).trim().split(/\s+/).slice(1);
  const login = await browser.newContext({ viewport: SIZE });
  const lp = await login.newPage();
  await lp.goto(`${BASE}/login`);
  await lp.getByPlaceholder("you@company.com").fill(email);
  await lp.locator('input[type="password"]').fill(password);
  await lp.keyboard.press("Enter");
  await lp.waitForURL(/your-work/);
  // Dev servers compile each page on first visit; do that now so the video has no dead pauses.
  for (const u of ["/projects", "/filters", "/settings/members", "/guide", ...["board", "backlog", "standup", "roadmap", "reports", "settings"].map((x) => `/projects/WARM/${x}`)]) {
    await lp.goto(`${BASE}${u}`).catch(() => {});
  }
  await login.storageState({ path: path.join(TMP, "state.json") });
  await login.close();
  }

  const ctx = await browser.newContext({
    viewport: SIZE, deviceScaleFactor: 1, colorScheme: "light",
    ...(STUDENT ? {} : { storageState: path.join(TMP, "state.json") }),
    recordVideo: { dir: TMP, size: SIZE },
  });
  await ctx.addInitScript(overlay);
  // Show the splash screen once, at the very start.
  await ctx.addInitScript(() => {
    try { if (!sessionStorage.getItem("wt-once")) { sessionStorage.setItem("wt-once", "1"); sessionStorage.removeItem("karya:booted"); } } catch {}
  });
  const page = await ctx.newPage();
  const t0 = Date.now();
  const h = helpers(page, OUT);
  await page.goto(`${BASE}${STUDENT ? "/signup?as=student" : "/your-work"}`);
  await page.locator(STUDENT ? "input[name=name]" : '[data-tour="projects"]').waitFor();

  const timeline = [];
  let failed = null;
  for (const [i, s] of SCENES.entries()) {
    const start = Date.now() - t0;
    timeline.push({ id: s.id, start, text: s.text, say: s.say });
    await page.evaluate((n) => window.__mark?.(n), i);
    await h.caption(s.caption);
    const minEnd = Date.now() + s.dur * 1000 + 700;
    try {
      await s.run(page, h, { browser });
    } catch (e) {
      failed = `${s.id}: ${e.message.split("\n")[0]}`;
      console.error(`✗ scene ${failed}`);
      break;
    }
    const left = minEnd - Date.now();
    if (left > 0) await h.wait(left);
    console.log(`  ✓ ${s.id.padEnd(9)} ${(start / 1000).toFixed(1)}s`);
  }
  await h.caption("");
  await h.wait(1200);
  const end = Date.now() - t0;
  const video = page.video();
  await ctx.close();
  const raw = path.join(TMP, `${NAME}-raw.webm`);
  await video.saveAs(raw);
  await video.delete();
  await browser.close();
  writeFileSync(path.join(TMP, "timeline.json"), JSON.stringify({ timeline, end, raw }, null, 2));
  if (failed) throw new Error(`Recording stopped at scene ${failed}`);
}

async function narrate() {
  const { timeline: clock, raw } = JSON.parse(readFileSync(path.join(TMP, "timeline.json"), "utf8"));
  if (!existsSync(raw)) throw new Error("No recording yet: run without --audio-only first");
  // Scene start times as they appear in the video (recordings run slower than the clock, so the
  // clock times drift). Fall back to scaled clock times for any marker that wasn't found.
  const probe = (() => { try { execFileSync(FFMPEG, ["-hide_banner", "-i", raw]); } catch (e) { return String(e.stderr); } return ""; })();
  const [, hh, mm, ss] = probe.match(/Duration: (\d+):(\d+):([\d.]+)/) ?? [];
  const videoLen = (Number(hh) * 3600 + Number(mm) * 60 + Number(ss)) * 1000;
  const marks = await readMarkers(FFMPEG, raw, clock.length);
  const scale = videoLen / (clock.at(-1).start + 15000);
  const timeline = clock.map((t, i) => ({ ...t, start: marks[i] != null ? marks[i] * 1000 : t.start * scale }));
  const end = videoLen;
  const missing = marks.filter((m) => m == null).length;
  console.log(`Scene times read from the video${missing ? ` (${missing} estimated)` : ""}; video ${(videoLen / 1000).toFixed(1)}s vs clock ${((clock.at(-1).start) / 1000).toFixed(1)}s to last scene`);
  const trim = Math.max(0, timeline[0].start - 300); // drop the first blank frames
  const clips = timeline.map((t, i) => {
    const { file, dur } = speak({ id: t.id, text: t.text, say: t.say }, VOICE);
    const slot = ((timeline[i + 1]?.start ?? end) - t.start) / 1000 - 0.25;
    // A different voice can run a little long: speed it up gently so it never overlaps the next scene.
    const tempo = dur > slot ? Math.min(1.25, dur / slot) : 1;
    return { ...t, file, dur: dur / tempo, tempo, at: t.start - trim };
  });

  const out = path.join(OUT, `${NAME}.mp4`);
  const inputs = ["-ss", (trim / 1000).toFixed(3), "-i", raw, ...clips.flatMap((c) => ["-i", c.file])];
  const parts = clips.map((c, i) =>
    `[${i + 1}:a]aresample=48000,${c.tempo > 1 ? `atempo=${c.tempo.toFixed(3)},` : ""}adelay=delays=${Math.round(c.at)}:all=1[a${i}]`);
  const mix = `${clips.map((_, i) => `[a${i}]`).join("")}amix=inputs=${clips.length}:normalize=0:dropout_transition=0,volume=1.5,alimiter=limit=0.95,apad[aout]`;
  execFileSync(FFMPEG, [
    "-y", "-hide_banner", "-loglevel", "error", ...inputs,
    // Video: paint over the scene marker square. Audio: each narration line at its scene's start.
    "-filter_complex", ["[0:v]drawbox=x=0:y=ih-8:w=8:h=8:color=0x1a1a18:t=fill[vout]", ...parts, mix].join(";"),
    "-map", "[vout]", "-map", "[aout]",
    "-c:v", "libx264", "-preset", "medium", "-crf", "27", "-pix_fmt", "yuv420p", "-r", "25",
    // An exact length, not -shortest: with the video going through a filter graph, -shortest never
    // stops the padded audio and the encode runs forever.
    "-t", ((end - trim) / 1000).toFixed(2),
    "-c:a", "aac", "-b:a", "128k", "-ac", "1", "-movflags", "+faststart", out,
  ], { stdio: "inherit" });

  // The poster is a plain screenshot: paint over the marker there too.
  const poster = path.join(OUT, `${NAME}.jpg`);
  if (existsSync(poster)) {
    const tmp = path.join(TMP, "poster.jpg");
    execFileSync(FFMPEG, ["-y", "-hide_banner", "-loglevel", "error", "-i", poster, "-vf", "drawbox=x=0:y=ih-8:w=8:h=8:color=0x1a1a18:t=fill", "-q:v", "3", tmp]);
    writeFileSync(poster, readFileSync(tmp));
  }

  // Captions file with the spoken words, for people watching without sound.
  const ts = (ms) => new Date(Math.max(0, ms)).toISOString().slice(11, 23);
  const vtt = ["WEBVTT", "", ...clips.flatMap((c, i) => [`${i + 1}`, `${ts(c.at)} --> ${ts(c.at + c.dur * 1000)}`, c.text, ""])].join("\n");
  writeFileSync(path.join(OUT, `${NAME}.vtt`), vtt);

  const secs = (end - trim) / 1000;
  console.log(`✓ ${NAME}.mp4: ${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, "0")}, voice ${VOICE}${clips.some((c) => c.tempo > 1) ? " (some lines sped up slightly to fit)" : ""}`);
}

if (!AUDIO_ONLY) await record();
await narrate();
if (STUDENT) await (await import("./student-scenes.mjs")).closeStudentDb();
