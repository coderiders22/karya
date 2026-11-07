"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Copy, GitBranch, PanelRight, UserCheck, UserMinus } from "lucide-react";
import type { CardIssue, StatusLite } from "@/lib/types";
import { PRIORITIES } from "@/lib/constants";
import { PriorityIcon } from "./IssueBits";

export type CardAction =
  | { kind: "assign"; userId: string | null }
  | { kind: "status"; statusId: string }
  | { kind: "priority"; value: string }
  | { kind: "copy-link" } | { kind: "copy-branch" } | { kind: "peek" };

/** Right-click / long-press menu for a board card. */
export function CardMenu({ issue, x, y, statuses, meId, onAction, onClose }: {
  issue: CardIssue; x: number; y: number; statuses: StatusLite[]; meId: string;
  onAction: (a: CardAction) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: Event) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    window.addEventListener("keydown", esc);
    window.addEventListener("scroll", onClose, true);
    ref.current?.querySelector("button")?.focus();
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
      window.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  // Keep the menu on screen.
  const left = Math.min(x, window.innerWidth - 236);
  const top = Math.min(y, window.innerHeight - 360);
  const item = "flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-[13px] text-slate-700 outline-none hover:bg-slate-100 focus:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-800";
  const mine = issue.assignee?.id === meId;
  const run = (a: CardAction) => { onAction(a); onClose(); };

  // Portal to <body>: an animated ancestor (page transition) would otherwise offset position: fixed.
  return createPortal(
    <div ref={ref} role="menu" aria-label={`Actions for ${issue.key}`} style={{ left, top }}
      className="card fixed z-[60] w-56 origin-top-left animate-pop p-1 shadow-xl">
      <div className="px-2 pb-1 pt-1.5 font-mono text-[11px] text-slate-400">{issue.key}</div>
      <button role="menuitem" className={item} onClick={() => run({ kind: "peek" })}><PanelRight size={14} className="text-slate-400" />Open in panel</button>
      <button role="menuitem" className={item} onClick={() => run({ kind: "assign", userId: mine ? null : meId })}>
        {mine ? <UserMinus size={14} className="text-slate-400" /> : <UserCheck size={14} className="text-slate-400" />}{mine ? "Unassign me" : "Assign to me"}
      </button>
      <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
      <div className="px-2 py-1 text-[11px] font-medium text-slate-400">Move to</div>
      {statuses.filter((s) => s.id !== issue.statusId).map((s) => (
        <button key={s.id} role="menuitem" className={item} onClick={() => run({ kind: "status", statusId: s.id })}>
          <ArrowRight size={14} className="text-slate-400" />{s.name}
        </button>
      ))}
      <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
      <div className="flex items-center gap-0.5 px-1 py-1">
        {PRIORITIES.map((p) => (
          <button key={p.value} role="menuitemradio" aria-checked={issue.priority === p.value} data-tip={p.label}
            onClick={() => run({ kind: "priority", value: p.value })}
            className={`grid size-8 flex-1 place-items-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 ${issue.priority === p.value ? "bg-slate-100 dark:bg-slate-800" : ""}`}>
            <PriorityIcon priority={p.value} />
          </button>
        ))}
      </div>
      <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
      <button role="menuitem" className={item} onClick={() => run({ kind: "copy-link" })}><Copy size={14} className="text-slate-400" />Copy link</button>
      <button role="menuitem" className={item} onClick={() => run({ kind: "copy-branch" })}><GitBranch size={14} className="text-slate-400" />Copy git branch command</button>
    </div>,
    document.body,
  );
}
