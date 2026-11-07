"use client";

import { useEffect, useState } from "react";
import { LogoLoader } from "./LogoLoader";

/**
 * First-load splash for the signed-in app.
 *
 * Part of the server HTML, so it covers the page from the very first paint until React
 * has hydrated, then fades away. The logo loader loops for as long as loading takes.
 *
 *  - Only on a full page load; client-side navigation never shows it (the layout persists).
 *  - First load of a browser session: held until the card has landed (~1.1s), so the
 *    animation is seen once. Later reloads: hidden as soon as the app is ready.
 *  - Never blocks: a CSS failsafe fades it out after 6s even if JavaScript fails.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<"show" | "leaving" | "gone">("show");

  useEffect(() => {
    let first = true;
    try {
      first = !sessionStorage.getItem("karya:booted");
      sessionStorage.setItem("karya:booted", "1");
    } catch {}
    const wait = first ? Math.max(0, 1100 - performance.now()) : 0;
    const t1 = setTimeout(() => setPhase("leaving"), wait);
    const t2 = setTimeout(() => setPhase("gone"), wait + 320);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === "gone") return null;
  return (
    <div
      aria-hidden={phase !== "show"}
      className={`splash fixed inset-0 z-[100] grid place-items-center bg-slate-50 transition-[opacity,visibility] duration-300 dark:bg-slate-950 ${phase === "leaving" ? "pointer-events-none opacity-0" : ""}`}
    >
      <div className={`flex flex-col items-center transition-transform duration-300 ease-out-quint ${phase === "leaving" ? "scale-[1.04]" : ""}`}>
        <span className="splash-in"><LogoLoader size={64} label="Opening Karya" /></span>
        <div className="splash-word mt-4 text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">Karya</div>
      </div>
    </div>
  );
}
