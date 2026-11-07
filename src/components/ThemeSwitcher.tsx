"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Monitor, Moon, Sun } from "lucide-react";

type Mode = "system" | "light" | "dark";

export function applyTheme(mode: Mode) {
  try { localStorage.setItem("theme", mode); } catch {}
  const dark = mode === "dark" || (mode === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

/** Segmented control: System / Light / Dark. */
export function ThemeSwitcher() {
  const [mode, setMode] = useState<Mode>("system");
  useEffect(() => {
    try { setMode((localStorage.getItem("theme") as Mode) || "system"); } catch {}
  }, []);
  const opts: [Mode, typeof Sun, string][] = [["system", Monitor, "System"], ["light", Sun, "Light"], ["dark", Moon, "Dark"]];
  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-0.5 rounded-md bg-slate-100 p-0.5 dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
      {opts.map(([m, I, label]) => (
        <button key={m} role="radio" aria-checked={mode === m} onClick={() => { setMode(m); applyTheme(m); }}
          className={clsx("flex h-7 items-center justify-center gap-1.5 rounded text-xs transition-all",
            mode === m ? "bg-white font-medium text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200")}>
          <I size={13} />{label}
        </button>
      ))}
    </div>
  );
}
