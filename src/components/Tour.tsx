"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserMode } from "@prisma/client";
import { useAccess } from "./Access";
import { isDialogOpen } from "./Dialog";

/**
 * Guided tours: a spotlight on a real element plus a card that says what it is, how to use it
 * and what it does. Elements opt in with `data-tour="name"`.
 *
 *  - "welcome" runs once on a person's first visit (the app shell).
 *  - "board" runs the first time they open a project board.
 *  - Both can be replayed from the Guide page or the user menu: startTour("board").
 *
 * Steps whose element isn't on the page (e.g. no active sprint, so no forecast) are skipped.
 */

type Step = { target?: string; title: string; body: React.ReactNode; keys?: string[] };
type TourId = "welcome" | "board";

const K = ({ children }: { children: React.ReactNode }) => <span className="kbd mx-0.5 align-[1px]">{children}</span>;
const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded bg-slate-100 px-1 py-px font-mono text-[12px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">{children}</code>
);

function steps(id: TourId, name: string, mode: UserMode): Step[] {
  const welcome: Step = {
    title: `Welcome to Ruvano, ${name.split(" ")[0]}`,
    body: <>A one-minute look at where everything is. Use <K>→</K> and <K>←</K> to move, <K>Esc</K> to stop. You can replay this any time from <b>Guide</b>.</>,
  };
  const finish: Step[] = [
    { target: "guide", title: "Guide and videos", body: <>Every feature explained step by step. Open it whenever you're unsure how something works.</> },
    { target: "user-menu", title: "Your menu", body: <>Profile and password, light or dark theme, and this tour again.</> },
  ];
  if (id === "welcome" && mode === "STUDENT") return [
    welcome,
    { target: "your-work", title: "Today", body: <>Every project deadline with a countdown, then your tasks across all projects, soonest first. A good page to open every day.</> },
    { target: "projects", title: "Projects", body: <>Start a major project, minor project or hackathon from a template, with the usual steps laid out for you. Share its link and your team joins, even from other colleges.</> },
    { target: "create", title: "Add a task", body: <>Press <K>C</K> anywhere. While typing, <K>@</K> suggests teammates, <K>!</K> priority and <K>#</K> labels.</> },
    { target: "inbox", title: "Your inbox", body: <>When a teammate assigns you work, mentions you or joins your team, it lands here with a soft chime.</> },
    ...finish,
  ];
  if (id === "welcome") return [
    {
      title: `Welcome to Ruvano, ${name.split(" ")[0]}`,
      body: <>A one-minute look at where everything is. Use <K>→</K> and <K>←</K> to move, <K>Esc</K> to stop. You can replay this any time from <b>Guide</b>.</>,
    },
    {
      target: "create", title: "Create an issue",
      body: <>Click <b>+</b> or press <K>C</K> anywhere. While typing the title, <K>@</K> suggests teammates, <K>#</K> labels, <K>!</K> priority and <K>/</K> the type, so you rarely touch the mouse.</>,
    },
    {
      target: "search", title: "Find anything",
      body: <>Press <K>⌘</K><K>K</K> (<K>Ctrl</K><K>K</K> on Windows) to jump to any issue, project or page by typing a few letters. Faster than clicking through menus.</>,
    },
    {
      target: "inbox", title: "Your inbox",
      body: <>When someone assigns you work, @mentions you or comments on an issue you follow, it lands here. A pop-up and a soft chime tell you straight away; mute the sound from inside the inbox.</>,
    },
    {
      target: "your-work", title: "Your work",
      body: <>Everything assigned to you across all projects, in-progress first, plus what the team did recently. A good page to start the day on.</>,
    },
    {
      target: "project-nav", title: "Inside a project",
      body: <><b>Board</b> to move work along, <b>Backlog</b> to plan sprints, <b>Standup</b> to run the daily meeting, <b>Roadmap</b> for epics on a timeline, <b>Insights</b> for charts and bottlenecks, <b>GitHub</b> to connect your repository, <b>Settings</b> for columns and Jira export.</>,
    },
    {
      target: "projects", title: "Projects",
      body: <>Every project has a short key, so its issues are numbered like <Code>WR-12</Code>. Create one here, or import an existing Jira project.</>,
    },
    {
      target: "all-issues", title: "All issues",
      body: <>Search across every project with filters, select many issues to change status, assignee or sprint in one go, and save a filter as a view the whole team can open.</>,
    },
    {
      target: "team", title: "Your team",
      body: <>Admins invite people with a link and choose what they can do: <b>Viewer</b>, <b>Member</b>, <b>Manager</b> or <b>Admin</b>. This workspace is private to the people you invite.</>,
    },
    {
      target: "guide", title: "Guide and videos",
      body: <>Every feature explained step by step, with short videos. Open it whenever you're unsure how something works.</>,
    },
    {
      target: "user-menu", title: "Your menu",
      body: <>Profile and password, light or dark theme, keyboard shortcuts (<K>?</K>), and this tour again.</>,
    },
    {
      title: "You're set",
      body: <>Open a project's board next. Ruvano will point out how cards, columns and the sprint forecast work the first time you go there.</>,
    },
  ];
  return [
    {
      target: "board-columns", title: "The board",
      body: <>Each column is a step in your team's workflow. <b>Drag a card</b> to another column to change its status; on a phone, press and hold the card first. A column turns red when it has more cards than its work-in-progress limit.</>,
    },
    {
      target: "card", title: "Reading a card",
      body: <>Issue key, title and priority, the assignee's avatar, and <b>how long it has sat in this column</b>. That time turns amber when work is stuck, and a red <b>Blocked</b> tag means another issue is holding it up. <b>Click</b> a card to open it in a side panel; <b>right-click</b> for quick actions.</>,
    },
    {
      target: "quick-add", title: "Add without leaving the board",
      body: <>Type a title and press <K>Enter</K>. While typing, <K>@</K> suggests teammates, <K>#</K> labels, <K>!</K> priority and <K>/</K> the type; your picks show as colored chips under the box.</>,
    },
    {
      target: "board-filters", title: "Narrow the board",
      body: <>Filter by text, by person (click the avatars), or by type. <b>Stuck only</b> shows blocked work and anything in progress for too long, so standups can focus on what needs help.</>,
    },
    {
      target: "github", title: "Connect GitHub",
      body: <>Connect your repository here. New GitHub issues become cards on this board, and cards move when pull requests open and merge. The board stays <b>Live</b>, so changes show up by themselves.</>,
    },
    {
      target: "forecast", title: "Sprint forecast",
      body: <>Compares how much of the sprint's time has gone with how much work is done, and tells you mid-sprint how much won't make it. No more surprises on the last day.</>,
    },
    {
      target: "project-nav", title: "More views of the same work",
      body: <><b>Backlog</b>: plan the next sprint; it warns when you've planned more than your usual pace. <b>Standup</b>: everyone's done, doing and blocked work, with a timed presenter mode. <b>Insights</b>: burndown, velocity and where work waits.</>,
    },
    {
      title: "The side panel",
      body: <>Click a card to open it on the right: change status, priority, assignee and labels with colored pickers, and reply with <K>@</K> mentions. <K>J</K> / <K>K</K> next and previous, <K>M</K> assign to me, <K>Esc</K> close. Press <K>?</K> for every shortcut.</>,
    },
  ];
}

const DONE_KEY = (id: TourId) => `karya:tour:${id}`;
const isDone = (id: TourId) => { try { return localStorage.getItem(DONE_KEY(id)) === "done"; } catch { return true; } };
const markDone = (id: TourId) => { try { localStorage.setItem(DONE_KEY(id), "done"); } catch {} };

/** Start a tour from anywhere (Guide page, user menu). */
export function startTour(id: TourId) {
  window.dispatchEvent(new CustomEvent("karya:tour", { detail: id }));
}

const isMobile = () => !window.matchMedia("(min-width: 64rem)").matches;

function findTarget(name?: string) {
  if (!name) return null;
  const all = [...document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)];
  // Prefer one that's actually laid out (the sidebar copy, not a hidden duplicate).
  return all.find((el) => el.getClientRects().length > 0) ?? null;
}

export function TourHost({ userName }: { userName: string }) {
  const { mode } = useAccess();
  const path = usePathname();
  const [tour, setTour] = useState<TourId | null>(null);
  const [list, setList] = useState<Step[]>([]);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const openedDrawer = useRef(false);

  const begin = useCallback((id: TourId) => {
    if (isDialogOpen()) return;
    // Keep only steps whose element exists right now (or that need no element).
    const usable = steps(id, userName, mode).filter((s) => !s.target || findTarget(s.target));
    if (!usable.length) return;
    setList(usable);
    setI(0);
    setTour(id);
  }, [userName]);

  const end = useCallback(() => {
    if (tour) markDone(tour);
    setTour(null);
    setRect(null);
    if (openedDrawer.current) { window.dispatchEvent(new Event("karya:sidebar-close")); openedDrawer.current = false; }
  }, [tour]);

  // Replay requests.
  useEffect(() => {
    const on = (e: Event) => begin((e as CustomEvent<TourId>).detail);
    window.addEventListener("karya:tour", on);
    return () => window.removeEventListener("karya:tour", on);
  }, [begin]);

  // First visit: welcome tour after the splash. First board visit: board tour.
  useEffect(() => {
    if (tour) return;
    const id: TourId | null = !isDone("welcome") ? "welcome" : /^\/projects\/[^/]+\/board$/.test(path) && !isDone("board") ? "board" : null;
    if (!id) return;
    const t = setTimeout(() => begin(id), id === "welcome" ? 1700 : 900);
    return () => clearTimeout(t);
  }, [path, tour, begin]);

  const step = tour ? list[i] : undefined;

  // Measure (and keep measuring) the highlighted element.
  useLayoutEffect(() => {
    if (!step) return;
    let raf = 0;
    let cancelled = false;
    const el = findTarget(step.target);
    if (!el) { setRect(null); return; }
    const inSidebar = !!el.closest("aside");
    const measure = () => { if (!cancelled) setRect(el.getBoundingClientRect()); };
    const show = () => {
      el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      measure();
      // Smooth scrolling and drawer slide take a moment; keep the spotlight following.
      const until = performance.now() + 600;
      const follow = () => { measure(); if (performance.now() < until) raf = requestAnimationFrame(follow); };
      raf = requestAnimationFrame(follow);
    };
    if (inSidebar && isMobile()) {
      if (!openedDrawer.current) { window.dispatchEvent(new Event("karya:sidebar-open")); openedDrawer.current = true; }
      setTimeout(show, 320);
    } else {
      if (openedDrawer.current && isMobile()) { window.dispatchEvent(new Event("karya:sidebar-close")); openedDrawer.current = false; }
      show();
    }
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { cancelled = true; cancelAnimationFrame(raf); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [step]);

  const next = useCallback(() => { if (i >= list.length - 1) end(); else setI(i + 1); }, [i, list.length, end]);
  const back = useCallback(() => setI((x) => Math.max(0, x - 1)), []);

  // Keyboard: capture phase so page shortcuts don't also fire.
  useEffect(() => {
    if (!tour) return;
    const onKey = (e: KeyboardEvent) => {
      if (isDialogOpen()) return;
      if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); end(); }
      else if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); e.stopImmediatePropagation(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); e.stopImmediatePropagation(); back(); }
      else e.stopImmediatePropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [tour, next, back, end]);

  if (!tour || !step) return null;
  const hole = step.target && rect ? { x: rect.left - 6, y: rect.top - 6, w: rect.width + 12, h: rect.height + 12 } : null;

  return createPortal(
    <div className="fixed inset-0 z-[95]" aria-live="polite">
      {/* Dim everything except the spotlight. The box-shadow trick keeps the hole animatable. */}
      {hole ? (
        <div
          className="pointer-events-none fixed rounded-lg ring-2 ring-brand transition-[left,top,width,height] duration-300 ease-out-quint"
          style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h, boxShadow: "0 0 0 9999px rgb(10 10 9 / 0.55)" }}
        />
      ) : (
        <div className="fixed inset-0 animate-fade bg-slate-950/55" />
      )}
      {/* Clicks outside the card are absorbed so nothing changes mid-tour. */}
      <div className="fixed inset-0" onMouseDown={(e) => e.preventDefault()} />
      <TourCard
        key={`${tour}-${i}`} step={step} index={i} total={list.length} hole={hole}
        onNext={next} onBack={back} onSkip={end}
      />
    </div>,
    document.body,
  );
}

const CARD_W = 340;

function TourCard({ step, index, total, hole, onNext, onBack, onSkip }: {
  step: Step; index: number; total: number; hole: { x: number; y: number; w: number; h: number } | null;
  onNext: () => void; onBack: () => void; onSkip: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const nextBtn = useRef<HTMLButtonElement>(null);
  const last = index === total - 1;

  useLayoutEffect(() => {
    const vw = window.innerWidth, vh = window.innerHeight, m = 12, gap = 14;
    const h = ref.current?.offsetHeight ?? 200;
    const w = Math.min(CARD_W, vw - m * 2);
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    if (!hole) { setPos({ left: (vw - w) / 2, top: clamp(vh * 0.28, m, vh - h - m) }); return; }
    const fitsRight = hole.x + hole.w + gap + w <= vw - m;
    const fitsBelow = hole.y + hole.h + gap + h <= vh - m;
    const fitsAbove = hole.y - gap - h >= m;
    if (fitsRight && hole.w < vw / 2) setPos({ left: hole.x + hole.w + gap, top: clamp(hole.y + hole.h / 2 - h / 2, m, vh - h - m) });
    else if (fitsBelow) setPos({ left: clamp(hole.x, m, vw - w - m), top: hole.y + hole.h + gap });
    else if (fitsAbove) setPos({ left: clamp(hole.x, m, vw - w - m), top: hole.y - gap - h });
    else setPos({ left: clamp(hole.x + hole.w / 2 - w / 2, m, vw - w - m), top: vh - h - m });
  }, [hole]);

  useEffect(() => { nextBtn.current?.focus({ preventScroll: true }); }, []);

  return (
    <div
      ref={ref} role="dialog" aria-modal="true" aria-labelledby="tour-title"
      className="card fixed animate-pop p-4 !shadow-xl"
      style={{ width: `min(${CARD_W}px, calc(100vw - 24px))`, left: pos?.left ?? -9999, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-brand">Tour · {index + 1} of {total}</span>
        <div className="flex-1" />
        {!last && <button className="text-xs text-muted hover:text-slate-900 dark:hover:text-white" onClick={onSkip}>Skip tour</button>}
      </div>
      <h2 id="tour-title" className="text-[15px] font-semibold leading-snug text-slate-900 dark:text-white">{step.title}</h2>
      <div className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300">{step.body}</div>
      <div className="mt-4 flex items-center gap-2">
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: total }, (_, d) => (
            <span key={d} className={`h-1.5 rounded-full transition-all ${d === index ? "w-4 bg-brand" : "w-1.5 bg-slate-300 dark:bg-slate-700"}`} />
          ))}
        </div>
        <div className="flex-1" />
        {last && <Link href="/guide" className="btn" onClick={onSkip}>Open guide</Link>}
        {index > 0 && !last && <button className="btn" onClick={onBack}>Back</button>}
        <button ref={nextBtn} className="btn-primary" onClick={onNext}>{last ? "Done" : index === 0 ? "Start" : "Next"}</button>
      </div>
    </div>
  );
}
