"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

/**
 * Login-page demo of one-line issue creation. It types a sentence, and the
 * parsed fields fill in underneath as each token completes, so a new user learns
 * the syntax before they ever open the app.
 */
const EXAMPLES = [
  {
    text: "Checkout fails on Safari bug @sam !high #payments due:fri",
    fields: [
      ["Type", "Bug", "bug"],
      ["Assignee", "Sam Rivera", "@sam"],
      ["Priority", "High", "!high"],
      ["Label", "payments", "#payments"],
      ["Due", "Friday", "due:fri"],
    ],
  },
  {
    text: "Write onboarding emails @priya #growth 3pts +sprint",
    fields: [
      ["Type", "Task", ""],
      ["Assignee", "Priya Nair", "@priya"],
      ["Label", "growth", "#growth"],
      ["Estimate", "3 points", "3pts"],
      ["Sprint", "Current sprint", "+sprint"],
    ],
  },
  {
    text: "Rate-limit the public API story @arjun !!! ^API-12",
    fields: [
      ["Type", "Story", "story"],
      ["Assignee", "Arjun Mehta", "@arjun"],
      ["Priority", "Highest", "!!!"],
      ["Parent", "API-12", "^API-12"],
    ],
  },
] as const;

export function TypingDemo() {
  const [ex, setEx] = useState(0);
  const [n, setN] = useState(0);
  const { text, fields } = EXAMPLES[ex];

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(text.length); return; }
    if (n < text.length) {
      const t = setTimeout(() => setN(n + 1), text[n] === " " ? 90 : 38 + Math.random() * 40);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setN(0); setEx((ex + 1) % EXAMPLES.length); }, 3200);
    return () => clearTimeout(t);
  }, [n, ex, text]);

  const typed = text.slice(0, n);
  // A field counts as parsed once its token has been typed and followed by a space (or the line ended).
  const parsed = (token: string) => {
    if (!token) return n >= text.length;
    const i = typed.indexOf(token);
    return i >= 0 && (typed.length > i + token.length || n >= text.length);
  };

  return (
    <div className="w-full max-w-[420px]">
      <div className="rounded-lg border border-white/10 bg-[#1d1d1b] shadow-[0_20px_50px_-20px_rgb(0_0_0/0.6)]">
        <div className="flex items-center gap-1.5 border-b border-white/[0.07] px-3 py-2 text-[11px] text-slate-500">
          <span className="font-mono">WEB</span><span>/</span><span>New issue</span>
        </div>
        <div className="min-h-[52px] px-3.5 py-3 font-mono text-[13px] leading-relaxed text-slate-100">
          {typed.split(/(\s+)/).map((tok, i) =>
            /^[@#!^]|^due:|^\d+pts$|^\+sprint$|^(bug|story)$/.test(tok)
              ? <span key={i} className="rounded-[3px] bg-brand-500/15 text-brand-300">{tok}</span>
              : <span key={i}>{tok}</span>,
          )}
          <span className="ml-px inline-block h-[15px] w-[7px] translate-y-[2px] animate-pulse bg-brand-400" />
        </div>
        <dl className="grid grid-cols-[88px_1fr] gap-y-1.5 border-t border-white/[0.07] px-3.5 py-3 text-[12.5px]">
          {fields.map(([label, value, token]) => {
            const on = parsed(token);
            return (
              <div key={label} className="contents">
                <dt className="text-slate-500">{label}</dt>
                <dd className={clsx("transition-all duration-300", on ? "translate-x-0 text-slate-100 opacity-100" : "-translate-x-1 text-slate-600 opacity-60")}>
                  {on ? value : "—"}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
      <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
        {EXAMPLES.map((_, i) => <span key={i} className={clsx("h-1 rounded-full transition-all duration-300", i === ex ? "w-5 bg-brand-400" : "w-1.5 bg-white/15")} />)}
      </div>
    </div>
  );
}
