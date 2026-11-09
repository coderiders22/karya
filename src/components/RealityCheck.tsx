"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ChevronDown, CircleCheck, ExternalLink, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { dismissUntrackedWork, trackUntrackedWork } from "@/app/actions/reality";
import { REALITY_TITLES, type RealityItem, type RealityKind } from "@/lib/realityShared";

/**
 * Sits above the board: how many cards disagree with the code, and what each one is. Collapsed to
 * one line, so it informs without getting in the way.
 */
export function RealityCheck({ items, github, canEdit }: { items: RealityItem[]; github: boolean; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) {
    if (!github) return null;
    return (
      <p className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] text-muted" data-reality="clear">
        <CircleCheck size={14} className="text-brand" />Reality check: the board matches GitHub.
      </p>
    );
  }
  const groups = (Object.keys(REALITY_TITLES) as RealityKind[]).map((k) => [k, items.filter((i) => i.kind === k)] as const).filter(([, list]) => list.length);
  return (
    <section className="mb-3 overflow-hidden rounded-lg border border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20" data-reality="found">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px]">
        <ScanSearch size={15} className="shrink-0 text-amber-700 dark:text-amber-400" />
        <span className="font-medium">Reality check</span>
        <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">
          {items.length} {items.length === 1 ? "thing doesn't" : "things don't"} match {github ? "the code" : "the plan"}
          <span className="hidden sm:inline">: {groups.map(([k, l]) => `${l.length} ${REALITY_TITLES[k].toLowerCase()}`).join(", ")}</span>
        </span>
        <span className="shrink-0 text-[12px] font-medium text-amber-800 dark:text-amber-300">{open ? "Hide" : "Review"}</span>
        <ChevronDown size={14} className={clsx("shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-amber-200 bg-white px-3 py-3 dark:border-amber-900/60 dark:bg-slate-950">
          {groups.map(([kind, list]) => (
            <div key={kind}>
              <h3 className="mb-1 text-[11.5px] font-semibold text-slate-500">{REALITY_TITLES[kind]}</h3>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {list.map((i) => <Row key={i.kind + i.id} item={i} canEdit={canEdit} />)}
              </ul>
            </div>
          ))}
          {!github && <p className="text-[12px] text-muted">Connect GitHub in the project menu to also check cards against commits and pull requests.</p>}
        </div>
      )}
    </section>
  );
}

function Row({ item, canEdit }: { item: RealityItem; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const label = <span className="w-16 shrink-0 font-mono text-[11.5px] text-muted">{item.label}</span>;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 text-[13px]">
      {item.external ? (
        <a href={item.href} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 basis-60 items-center gap-2 hover:underline">
          {label}<span className="truncate font-medium">{item.title}</span><ExternalLink size={11} className="shrink-0 text-slate-400" />
        </a>
      ) : (
        <Link href={item.href} className="flex min-w-0 flex-1 basis-60 items-center gap-2 hover:underline">
          {label}<span className="truncate font-medium">{item.title}</span>
        </Link>
      )}
      <span className="basis-full pl-[4.75rem] text-[12px] text-muted sm:basis-auto sm:flex-[2] sm:pl-0">
        {item.detail}{item.assignee && <span className="text-slate-400"> · {item.assignee}</span>}
      </span>
      {item.kind === "untracked" && canEdit && (
        <span className="flex shrink-0 gap-1.5 pl-[4.75rem] sm:pl-0">
          <button className="btn !h-7 text-xs" disabled={pending} onClick={() => start(async () => {
            const r = await trackUntrackedWork(item.id);
            if ("error" in r && r.error) toast.error(r.error); else { toast.success(`Added as ${"key" in r ? r.key : "a card"}, already done`); router.refresh(); }
          })}>Add as done card</button>
          <button className="btn-ghost !h-7 text-xs" disabled={pending} onClick={() => start(async () => { await dismissUntrackedWork(item.id); router.refresh(); })}>Ignore</button>
        </span>
      )}
    </li>
  );
}
