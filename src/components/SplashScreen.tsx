"use client";

import { useEffect, useRef, useState } from "react";
import { LogoLoader } from "./LogoLoader";

const HOLD_MS = 2800;
const WORDS = ["Plan.", "Track.", "Build.", "Deliver."];

/**
 * The opening screen, on every page of the site: the four cards land, the name rises, then the
 * tagline arrives one word at a time. Part of the server HTML, so it covers the very first paint.
 *
 *  - First load of a browser session only. A script in the root layout hides it before paint on
 *    later loads, and client-side navigation never shows it (the layout persists).
 *  - Timed from when it appeared, so a slow connection doesn't add to the wait.
 *  - Never blocks: a CSS failsafe fades it out after 6s even if JavaScript fails.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<"show" | "leaving" | "gone">("show");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (document.documentElement.classList.contains("splash-seen")) {
      setPhase("gone");
      return;
    }
    try { sessionStorage.setItem("karya:booted", "1"); } catch {}
    const shownFor = Number(root.current?.getAnimations()[0]?.currentTime ?? 0);
    const wait = Math.max(0, HOLD_MS - shownFor);
    const t1 = setTimeout(() => setPhase("leaving"), wait);
    const t2 = setTimeout(() => setPhase("gone"), wait + 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === "gone") return null;
  return (
    <div
      ref={root}
      aria-hidden={phase !== "show"}
      className={`splash dark fixed inset-0 z-[100] grid place-items-center bg-ink text-white transition-opacity duration-[400ms] ${phase === "leaving" ? "pointer-events-none opacity-0" : ""}`}
    >
      <div className={`flex flex-col items-center px-6 transition-transform duration-[400ms] ease-out-quint ${phase === "leaving" ? "scale-[1.05]" : ""}`}>
        <span className="splash-in relative block">
          <LogoLoader size={88} label="Opening Ruvano" />
          <span aria-hidden className="splash-ring" />
        </span>
        <div className="splash-word mt-6 text-[34px] font-semibold leading-none tracking-[-0.025em] [animation-delay:700ms]">Ruvano</div>
        <div className="mt-3.5 text-center text-[17px] font-medium text-brand-300 sm:text-[19px]">
          {WORDS.map((word, i) => (
            <span key={word} className="splash-word inline-block" style={{ animationDelay: `${900 + i * 130}ms` }}>
              {word}{i < WORDS.length - 1 && <>&nbsp;</>}
            </span>
          ))}
        </div>
        <div className="splash-word mt-2 text-center text-[14px] text-white/60 [animation-delay:1480ms]">One platform. Every step forward.</div>
      </div>
    </div>
  );
}
