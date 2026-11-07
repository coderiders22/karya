"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { IssueType, Priority } from "@prisma/client";
import { getProjectLabels } from "@/app/actions/labels";
import { MenuList, labelItems, navKey, personItems, priorityItems, typeItems, type MenuItem } from "./Pickers";

/**
 * Suggestions while typing an issue title: @ teammates, # labels, ! priority, / type.
 * Used by the create dialog and every quick-add box, so they all behave the same.
 *
 * Picking takes the "@ro" out of the text and hands back a structured value instead,
 * so names with spaces and look-alike names can't be misread.
 */

export const TRIGGERS = { "@": "Assign to", "#": "Add label", "!": "Priority", "/": "Type" } as const;
export type Trigger = keyof typeof TRIGGERS;
type Active = { sym: Trigger; q: string; start: number; end: number };
export type Picked =
  | { sym: "@"; value: string }
  | { sym: "#"; value: string }
  | { sym: "!"; value: Priority }
  | { sym: "/"; value: IssueType };

// Labels per project, shared by every box on the page (one request per project).
const labelCache = new Map<string, Promise<string[]>>();
export function useProjectLabels(projectId: string | undefined, enabled = true) {
  const [labels, setLabels] = useState<string[]>([]);
  useEffect(() => {
    if (!projectId || !enabled) return;
    if (!labelCache.has(projectId)) labelCache.set(projectId, getProjectLabels(projectId).catch(() => []));
    let live = true;
    labelCache.get(projectId)!.then((l) => { if (live) setLabels(l); });
    return () => { live = false; };
  }, [projectId, enabled]);
  return labels;
}
/** Call after creating an issue with a new label, so the next box sees it. */
export const forgetProjectLabels = (projectId: string) => labelCache.delete(projectId);

type BindOpts = {
  users: { id: string; name: string }[];
  meId: string;
  labels: string[];
  current: { assigneeId?: string; priority?: string; type?: string; labels: string[] };
  onPick: (p: Picked) => void;
};

/**
 * Step 1 (a hook): follows what's typed and where the caret is.
 * Step 2 (`bind`, after the caller has parsed `textForParse`): builds the menu and key handling.
 */
export function useTitleSuggest({ input, value, setValue }: {
  input: React.RefObject<HTMLInputElement | null>; value: string; setValue: (v: string) => void;
}) {
  const [act, setAct] = useState<Active | null>(null);
  const [idx, setIdx] = useState(0);
  const [, reflow] = useState(0);
  // Where the caret goes after a pick. Placed in a layout effect, i.e. in the same commit as the new
  // text, before the browser handles the next key; a later frame was too late for fast typing.
  const caretAfterPick = useRef<number | null>(null);
  useLayoutEffect(() => {
    const c = caretAfterPick.current;
    if (c == null || !input.current) return;
    caretAfterPick.current = null;
    input.current.focus();
    input.current.setSelectionRange(c, c);
  });

  const detect = (text: string, caret: number) => {
    const m = text.slice(0, caret).match(/(?:^|\s)([@#!/])([\w.-]{0,30})$/);
    setIdx(0);
    setAct(m ? { sym: m[1] as Trigger, q: m[2], start: caret - m[2].length - 1, end: caret } : null);
  };

  // Keep the floating menu attached while the page scrolls or resizes.
  useEffect(() => {
    if (!act) return;
    const r = () => reflow((n) => n + 1);
    window.addEventListener("scroll", r, true);
    window.addEventListener("resize", r);
    return () => { window.removeEventListener("scroll", r, true); window.removeEventListener("resize", r); };
  }, [act]);

  const bind = ({ users, meId, labels, current, onPick }: BindOpts) => {
    const items: MenuItem[] = !act ? [] : (() => {
      const q = act.q.toLowerCase();
      // Closest match first: "!hi" means High, not Highest.
      const byFit = (list: MenuItem[]) => !q ? list
        : list.filter((x) => x.label.toLowerCase().startsWith(q)).sort((a, b) => a.label.length - b.label.length);
      if (act.sym === "@") return personItems(users, meId, current.assigneeId, q).slice(0, 6);
      if (act.sym === "#") return labelItems([...new Set([...current.labels, ...labels])], current.labels, q).slice(0, 7);
      if (act.sym === "!") return byFit(priorityItems(current.priority));
      return byFit(typeItems(current.type));
    })();

    const choose = (it: MenuItem) => {
      if (!act) return;
      const before = value.slice(0, act.start).replace(/\s+$/, "");
      const after = value.slice(act.end).replace(/^\s+/, "");
      const next = before ? `${before} ${after}` : after;
      const caret = before ? before.length + 1 : 0;
      setValue(next);
      onPick({ sym: act.sym, value: it.value } as Picked);
      setAct(null);
      caretAfterPick.current = caret;
    };

    return {
      /** Returns true if the key was used by the menu (the caller should do nothing else with it). */
      handleKey: (e: React.KeyboardEvent) => {
        if (!act) return false;
        if (items.length && navKey(e, items.length, idx, setIdx, () => choose(items[idx]))) return true;
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setAct(null); return true; }
        return false;
      },
      expanded: !!act && items.length > 0,
      menu: act && (items.length > 0 || act.sym === "#") ? (
        <SuggestMenu input={input} value={value} start={act.start} title={TRIGGERS[act.sym]}>
          <MenuList items={items} active={idx} onPick={choose} onHover={setIdx} empty={act.sym === "#" ? "Type a name to create a label" : undefined} />
        </SuggestMenu>
      ) : null,
    };
  };

  return {
    /** The text without the half-typed "#fro", so it isn't read as a label of its own. */
    textForParse: act ? value.slice(0, act.start) + value.slice(act.end) : value,
    open: !!act,
    close: () => setAct(null),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => { setValue(e.target.value); detect(e.target.value, e.target.selectionStart ?? e.target.value.length); },
    onKeyUp: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") detect(value, e.currentTarget.selectionStart ?? 0);
    },
    bind,
  };
}

const W = 260;

/** Floats above everything (board columns scroll and would clip it), under the character that opened it. */
function SuggestMenu({ input, value, start, title, children }: {
  input: React.RefObject<HTMLInputElement | null>; value: string; start: number; title: string; children: React.ReactNode;
}) {
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  useLayoutEffect(() => {
    const el = input.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const c = document.createElement("canvas").getContext("2d");
    let x = parseFloat(cs.paddingLeft) || 0;
    if (c) { c.font = cs.font; x += c.measureText(value.slice(0, start)).width - el.scrollLeft; }
    const left = Math.max(8, Math.min(r.left + x - 8, window.innerWidth - W - 8));
    const below = window.innerHeight - r.bottom;
    const next = below < 300 && r.top > below ? { left, bottom: window.innerHeight - r.top + 4 } : { left, top: r.bottom + 4 };
    // Runs after every render; only update when the spot actually moved, or it would loop.
    setPos((p) => (p && p.left === next.left && p.top === next.top && p.bottom === next.bottom ? p : next));
  });
  if (!pos) return null;
  return createPortal(
    <div
      className="card fixed z-[70] animate-pop overflow-hidden !shadow-xl"
      style={{ width: W, left: pos.left, top: pos.top, bottom: pos.bottom }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted dark:border-slate-800">
        {title}
        <span className="normal-case tracking-normal">↑↓ · Enter</span>
      </div>
      {children}
    </div>,
    document.body,
  );
}
