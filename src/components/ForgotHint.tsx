"use client";

import { useEffect, useRef, useState } from "react";

/** Self-hosted, no email: explain the real recovery path instead of a dead "Forgot password" link. */
export function ForgotHint() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <span ref={ref} className="relative">
      <button type="button" onClick={(e) => { e.preventDefault(); setOpen(!open); }} className="text-[12.5px] text-brand hover:underline">
        Forgot password?
      </button>
      {open && (
        <span role="dialog" className="card absolute right-0 top-6 z-10 block w-64 animate-pop p-3 text-[12.5px] leading-relaxed text-slate-600 shadow-lg dark:text-slate-300">
          Ask a workspace admin to open <b className="font-medium text-slate-900 dark:text-white">Team</b> and choose{" "}
          <b className="font-medium text-slate-900 dark:text-white">Reset password</b> next to your name. They&apos;ll send you a one-time link.
        </span>
      )}
    </span>
  );
}
