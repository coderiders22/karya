"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

// The server and the browser can be in different timezones, so dates are written out in the browser.
export function TodayDate() {
  const [text, setText] = useState("");
  useEffect(() => setText(new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })), []);
  return <span>{text || " "}</span>;
}

const TONE = {
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  amber: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};
const DAY = 86400000;

/** A task's due date, which is a whole day: it's overdue only once that day has ended. */
export function DueChip({ iso }: { iso: string }) {
  const [state, setState] = useState<{ text: string; tone: keyof typeof TONE }>();
  useEffect(() => {
    const due = new Date(iso);
    const now = new Date();
    const days = Math.round((Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate()) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / DAY);
    if (days < 0) setState({ text: "Overdue", tone: "rose" });
    else if (days === 0) setState({ text: "Due today", tone: "amber" });
    else if (days === 1) setState({ text: "Due tomorrow", tone: "amber" });
    else setState({ text: `In ${days} days`, tone: "slate" });
  }, [iso]);
  if (!state) return null;
  return <span className={clsx("chip whitespace-nowrap", TONE[state.tone])}>{state.text}</span>;
}

function timeLeft(ms: number): { text: string; tone: keyof typeof TONE } {
  if (ms <= 0) return { text: "Deadline passed", tone: "rose" };
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days >= 3) return { text: `${days} days left`, tone: "slate" };
  if (days >= 1) return { text: `${days}d ${hours % 24}h left`, tone: "amber" };
  if (hours >= 1) return { text: `${hours}h ${minutes % 60}m left`, tone: "rose" };
  return { text: `${minutes}m left`, tone: "rose" };
}

/** A project's deadline. Ticks once a minute, because in a hackathon the minutes matter. */
export function Countdown({ iso, label }: { iso: string; label?: string }) {
  const [state, setState] = useState<ReturnType<typeof timeLeft>>();
  const [title, setTitle] = useState("");
  useEffect(() => {
    const due = new Date(iso);
    const tick = () => setState(timeLeft(due.getTime() - Date.now()));
    tick();
    setTitle(`${label ?? "Deadline"}: ${due.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`);
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, [iso, label]);
  if (!state) return null;
  return <span title={title} data-tip={title} className={clsx("chip whitespace-nowrap tabular-nums", TONE[state.tone])}>{state.text}</span>;
}
