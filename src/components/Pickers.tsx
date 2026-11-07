"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { IssueType, Priority } from "@prisma/client";
import { Check, ChevronDown, Plus, Search, Tag } from "lucide-react";
import { ISSUE_TYPES, PRIORITIES } from "@/lib/constants";
import { Avatar, LabelChip, PRIORITY_TINT, PriorityIcon, TypeIcon, labelDot } from "./IssueBits";

/**
 * Property pickers for issues: type, priority, assignee, labels. Real icons and colors instead of
 * plain <select>s, full keyboard use (↑ ↓ Enter, Esc), and the same rows power the @ # ! / suggestions
 * in the create dialog's title.
 */

export const TYPE_HINT: Record<IssueType, string> = {
  EPIC: "A big goal made of several stories",
  STORY: "Something a user can do or see",
  TASK: "A piece of work to get done",
  BUG: "Something that's broken",
  SUBTASK: "A step inside another issue",
};
export const PRIORITY_HINT: Record<Priority, string> = {
  HIGHEST: "Drop everything",
  HIGH: "Do this next",
  MEDIUM: "Normal",
  LOW: "When there's time",
  LOWEST: "Someday",
};

export type MenuItem = { value: string; label: string; icon?: React.ReactNode; hint?: string; selected?: boolean; create?: boolean };

/** The list part of a menu. Shared by pickers and title suggestions. */
export function MenuList({ items, active, onPick, onHover, empty }: {
  items: MenuItem[]; active: number; onPick: (it: MenuItem) => void; onHover: (i: number) => void; empty?: string;
}) {
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => { list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" }); }, [active]);
  if (!items.length) return <p className="px-3 py-2.5 text-[13px] text-muted">{empty ?? "No matches"}</p>;
  return (
    <ul ref={list} role="listbox" className="max-h-64 overflow-y-auto p-1">
      {items.map((it, i) => (
        <li key={(it.create ? "+" : "") + it.value} role="option" aria-selected={i === active} data-i={i}>
          <button
            type="button" tabIndex={-1}
            onMouseDown={(e) => { e.preventDefault(); onPick(it); }}
            onMouseMove={() => onHover(i)}
            className={clsx("flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px]", i === active ? "bg-slate-100 dark:bg-slate-800" : "")}
          >
            {it.icon && <span className="grid w-5 shrink-0 place-items-center">{it.icon}</span>}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-slate-900 dark:text-slate-100">{it.label}</span>
              {it.hint && <span className="block truncate text-[11.5px] text-muted">{it.hint}</span>}
            </span>
            {it.selected && <Check size={14} className="shrink-0 text-brand" strokeWidth={2.5} />}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** ↑ ↓ to move, Enter / Tab to pick. Returns true when it handled the key. */
export function navKey(e: React.KeyboardEvent, count: number, active: number, setActive: (n: number) => void, pick: () => void) {
  if (!count) return false;
  if (e.key === "ArrowDown") { e.preventDefault(); setActive((active + 1) % count); return true; }
  if (e.key === "ArrowUp") { e.preventDefault(); setActive((active - 1 + count) % count); return true; }
  if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(); return true; }
  return false;
}

const pill = "inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-[border-color,box-shadow,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";
const neutral = "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800/60";

/** A pill that opens a menu below it (or above, when there's no room). */
function Picker({ label, auto, tint, trigger, children, width = 240 }: {
  label: string; auto?: boolean; tint?: string; trigger: React.ReactNode; width?: number;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    setUp(r.bottom + 300 > window.innerHeight && r.top > 300);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const close = () => { setOpen(false); btn.current?.focus(); };
  return (
    <div ref={wrap} className="relative" onKeyDown={(e) => { if (e.key === "Escape" && open) { e.stopPropagation(); e.preventDefault(); close(); } }}>
      <button
        ref={btn} type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label}
        title={auto ? `${label}: set from what you typed` : label}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (!open && (e.key === "ArrowDown" || e.key === " ")) { e.preventDefault(); setOpen(true); } }}
        className={clsx(pill, tint ?? neutral, auto && "ring-2 ring-brand/30")}
      >
        {trigger}
        <ChevronDown size={12} className="-mr-0.5 shrink-0 opacity-50" />
      </button>
      {open && (
        <div className={clsx("card absolute left-0 z-30 animate-pop overflow-hidden !shadow-xl", up ? "bottom-full mb-1 origin-bottom-left" : "top-full mt-1 origin-top-left")}
          style={{ width: `min(${width}px, calc(100vw - 2rem))` }}>
          {children(close)}
        </div>
      )}
    </div>
  );
}

/** A menu without a search box: focus sits on the list itself. */
function KeyList({ items, initial, onPick }: { items: MenuItem[]; initial: number; onPick: (it: MenuItem) => void }) {
  const [active, setActive] = useState(Math.max(0, initial));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div ref={ref} tabIndex={-1} className="outline-none" onKeyDown={(e) => {
      navKey(e, items.length, active, setActive, () => onPick(items[active]));
      const n = Number(e.key);
      if (n >= 1 && n <= items.length) { e.preventDefault(); onPick(items[n - 1]); }
    }}>
      <MenuList items={items} active={active} onPick={onPick} onHover={setActive} />
    </div>
  );
}

/** A menu with a search box on top. */
function SearchList({ items, placeholder, onPick, onQuery, empty, keepOpen }: {
  items: (q: string) => MenuItem[]; placeholder: string; onPick: (it: MenuItem, q: string) => void; onQuery?: (q: string) => void; empty?: string; keepOpen?: boolean;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const shown = items(q);
  const pick = (it: MenuItem) => { onPick(it, q); if (keepOpen) { setQ(""); setActive(0); } };
  return (
    <>
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 dark:border-slate-800">
        <Search size={13} className="shrink-0 text-slate-400" />
        <input
          autoFocus value={q} placeholder={placeholder}
          onChange={(e) => { setQ(e.target.value); setActive(0); onQuery?.(e.target.value); }}
          onKeyDown={(e) => navKey(e, shown.length, active, setActive, () => pick(shown[active]))}
          className="h-9 w-full bg-transparent text-[13px] outline-none placeholder:text-slate-400"
        />
      </div>
      <MenuList items={shown} active={active} onPick={pick} onHover={setActive} empty={empty} />
    </>
  );
}

export const typeItems = (current?: string): MenuItem[] =>
  ISSUE_TYPES.map((t) => ({ value: t.value, label: t.label, hint: TYPE_HINT[t.value], icon: <TypeIcon type={t.value} />, selected: t.value === current }));

export const priorityItems = (current?: string): MenuItem[] =>
  PRIORITIES.map((p) => ({ value: p.value, label: p.label, hint: PRIORITY_HINT[p.value], icon: <PriorityIcon priority={p.value} />, selected: p.value === current }));

export const personItems = (users: { id: string; name: string }[], meId: string, current?: string, q = ""): MenuItem[] => {
  const s = q.trim().toLowerCase();
  const me = users.find((u) => u.id === meId);
  const ordered = me ? [me, ...users.filter((u) => u.id !== meId)] : users;
  return ordered
    .filter((u) => !s || u.name.toLowerCase().split(/\s+/).some((part) => part.startsWith(s)) || u.name.toLowerCase().startsWith(s))
    .map((u) => ({ value: u.id, label: u.id === meId ? `${u.name} (you)` : u.name, icon: <Avatar name={u.name} size={5} />, selected: u.id === current }));
};

export const labelItems = (all: string[], chosen: string[], q = ""): MenuItem[] => {
  const s = q.trim().toLowerCase().replace(/\s+/g, "-");
  const items: MenuItem[] = all
    .filter((l) => !s || l.toLowerCase().includes(s))
    .slice(0, 50)
    .map((l) => ({ value: l, label: l, icon: <span className={clsx("size-2.5 rounded-full", labelDot(l))} />, selected: chosen.includes(l) }));
  if (s && !all.some((l) => l.toLowerCase() === s)) items.push({ value: s, label: `Create “${s}”`, icon: <Plus size={14} className="text-slate-400" />, create: true });
  return items;
};

export function TypePicker({ value, onChange, auto }: { value: IssueType; onChange: (v: IssueType) => void; auto?: boolean }) {
  const label = ISSUE_TYPES.find((t) => t.value === value)?.label;
  return (
    <Picker label="Type" auto={auto} width={260} trigger={<><TypeIcon type={value} />{label}</>}>
      {(close) => <KeyList items={typeItems(value)} initial={ISSUE_TYPES.findIndex((t) => t.value === value)} onPick={(it) => { onChange(it.value as IssueType); close(); }} />}
    </Picker>
  );
}

export function PriorityPicker({ value, onChange, auto }: { value: Priority; onChange: (v: Priority) => void; auto?: boolean }) {
  const label = PRIORITIES.find((p) => p.value === value)?.label;
  return (
    <Picker label="Priority" auto={auto} tint={PRIORITY_TINT[value]} width={230} trigger={<><PriorityIcon priority={value} />{label}</>}>
      {(close) => <KeyList items={priorityItems(value)} initial={PRIORITIES.findIndex((p) => p.value === value)} onPick={(it) => { onChange(it.value as Priority); close(); }} />}
    </Picker>
  );
}

export function AssigneePicker({ value, onChange, users, meId, auto }: { value: string; onChange: (v: string) => void; users: { id: string; name: string }[]; meId: string; auto?: boolean }) {
  const user = users.find((u) => u.id === value);
  return (
    <Picker label="Assignee" auto={auto} width={250}
      trigger={user ? <><Avatar name={user.name} size={5} /><span className="truncate">{user.id === meId ? "Me" : user.name}</span></> : <><Avatar size={5} /><span className="text-slate-500 dark:text-slate-400">Unassigned</span></>}>
      {(close) => (
        <SearchList
          placeholder="Assign to…"
          items={(q) => [
            ...(q ? [] : [{ value: "", label: "Unassigned", icon: <Avatar size={5} />, selected: !value }]),
            ...personItems(users, meId, value, q),
          ]}
          onPick={(it) => { onChange(it.value); close(); }}
          empty="Nobody by that name"
        />
      )}
    </Picker>
  );
}

export function LabelPicker({ value, onChange, all, auto, onRemoveAuto }: {
  value: string[]; onChange: (v: string[]) => void; all: string[]; auto?: string[]; onRemoveAuto?: (l: string) => void;
}) {
  const remove = (l: string) => (auto?.includes(l) && onRemoveAuto ? onRemoveAuto(l) : onChange(value.filter((x) => x !== l)));
  const chosen = [...new Set([...value, ...(auto ?? [])])];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chosen.map((l) => <LabelChip key={l} name={l} onRemove={() => remove(l)} className={auto?.includes(l) ? "ring-2 ring-brand/30" : undefined} />)}
      <Picker label="Labels" width={240} trigger={<><Tag size={12} className="text-slate-400" />{chosen.length ? "Label" : "Add label"}</>}>
        {() => (
          <SearchList
            keepOpen
            placeholder="Find or create a label…"
            items={(q) => labelItems([...new Set([...chosen, ...all])], chosen, q)}
            onPick={(it) => (chosen.includes(it.value) ? remove(it.value) : onChange([...value, it.value]))}
            empty="Type to create a label"
          />
        )}
      </Picker>
    </div>
  );
}
