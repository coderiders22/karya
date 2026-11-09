"use client";

import { useEffect, useRef, useState } from "react";
import { LogoLoader } from "./LogoLoader";

const HOLD_MS = 2500;

/**
 * First-load splash for the signed-in app.
 *
 * Part of the server HTML, so it covers the page from the very first paint until React
 * has hydrated, then fades away.
 *
 *  - Only on a full page load; client-side navigation never shows it (the layout persists).
 *  - First load of a browser session: on screen for 2.5s from when it first appeared, the usual
 *    length for an app splash and enough to read the tagline. Later reloads: hidden as soon as
 *    the app is ready.
 *  - Never blocks: a CSS failsafe fades it out after 6s even if JavaScript fails.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<"show" | "leaving" | "gone">("show");
  const firstVisit = useRef<boolean | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Kept in a ref because development mode runs this effect twice, and the second run would see "booted".
    if (firstVisit.current === null) {
      try {
        firstVisit.current = !sessionStorage.getItem("karya:booted");
        sessionStorage.setItem("karya:booted", "1");
      } catch {
        firstVisit.current = true;
      }
    }
    // Counted from when the splash appeared, not from page start: after logging in the page has been
    // open for a while, and on a slow connection hydrating has already used up part of the time.
    const shownFor = Number(root.current?.getAnimations()[0]?.currentTime ?? 0);
    const wait = firstVisit.current ? Math.max(0, HOLD_MS - shownFor) : 0;
    const t1 = setTimeout(() => setPhase("leaving"), wait);
    const t2 = setTimeout(() => setPhase("gone"), wait + 320);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === "gone") return null;
  return (
    <div
      ref={root}
      aria-hidden={phase !== "show"}
      className={`splash fixed inset-0 z-[100] grid place-items-center bg-slate-50 transition-[opacity,visibility] duration-300 dark:bg-slate-950 ${phase === "leaving" ? "pointer-events-none opacity-0" : ""}`}
    >
      <div className={`flex flex-col items-center transition-transform duration-300 ease-out-quint ${phase === "leaving" ? "scale-[1.04]" : ""}`}>
        <span className="splash-in"><LogoLoader size={64} label="Opening Ruvano" /></span>
        <div className="mt-5 px-6 text-center">
          <div className="splash-word text-[24px] font-semibold tracking-tight text-slate-900 [animation-delay:700ms] dark:text-slate-100">Ruvano</div>
          <div className="splash-word mt-1.5 text-[15px] font-medium text-brand [animation-delay:950ms]">Plan. Track. Build. Deliver.</div>
          <div className="splash-word mt-1 text-[13px] text-slate-500 [animation-delay:1200ms] dark:text-slate-400">One platform. Every step forward.</div>
        </div>
      </div>
    </div>
  );
}
