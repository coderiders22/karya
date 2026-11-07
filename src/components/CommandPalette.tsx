"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { IssueType } from "@prisma/client";
import { searchIssues } from "@/app/actions/issues";
import { ArrowRight, Search } from "lucide-react";
import { TypeIcon } from "./IssueBits";
import { openCreateIssue, type ShellProject } from "./CreateIssueDialog";

type Item = { id: string; label: string; hint?: string; type?: IssueType; run: () => void };

export function CommandPalette({ projects }: { projects: ShellProject[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [issues, setIssues] = useState<{ id: string; key: string; title: string; type: IssueType }[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("trackr:palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("trackr:palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await searchIssues(q);
      if (!cancelled) setIssues(res);
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, open]);

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => {
      setOpen(false);
      router.push(href);
    };
    const needle = q.toLowerCase();
    const actions: Item[] = [
      { id: "create", label: "Create issue", hint: "C", run: () => { setOpen(false); openCreateIssue(); } },
      { id: "work", label: "Your work", run: go("/your-work") },
      { id: "projects", label: "All projects", run: go("/projects") },
      { id: "filters", label: "Search all issues (filters)", run: go("/filters") },
      { id: "members", label: "Team members", run: go("/settings/members") },
      { id: "profile", label: "Profile & password", run: go("/settings/profile") },
      ...projects.flatMap((p) => [
        { id: `b-${p.id}`, label: `${p.name}: Board`, run: go(`/projects/${p.key}/board`) },
        { id: `bl-${p.id}`, label: `${p.name}: Backlog`, run: go(`/projects/${p.key}/backlog`) },
        { id: `l-${p.id}`, label: `${p.name}: Issues`, run: go(`/projects/${p.key}/issues`) },
        { id: `r-${p.id}`, label: `${p.name}: Roadmap`, run: go(`/projects/${p.key}/roadmap`) },
        { id: `st-${p.id}`, label: `${p.name}: Standup`, run: go(`/projects/${p.key}/standup`) },
        { id: `rp-${p.id}`, label: `${p.name}: Insights`, run: go(`/projects/${p.key}/reports`) },
      ]),
    ].filter((a) => !needle || a.label.toLowerCase().includes(needle));
    const issueItems: Item[] = issues.map((i) => ({
      id: i.id, label: i.title, hint: i.key, type: i.type, run: go(`/issues/${i.key}`),
    }));
    return [...issueItems, ...actions].slice(0, 15);
  }, [issues, projects, q, router]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => { if (!open) setQ(""); }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex animate-fade justify-center bg-slate-950/45 p-4 pt-[12vh] backdrop-blur-[3px]" onMouseDown={() => setOpen(false)}>
      <div className="card h-fit w-full max-w-xl animate-pop overflow-hidden !shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-slate-200 px-3 dark:border-slate-800">
        <Search size={16} className="text-slate-400" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === "Enter") items[active]?.run();
          }}
          placeholder="Search issues, or type a page name…"
          className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-slate-400"
        />
        <span className="kbd">esc</span>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-1 [&_button]:rounded-md">
          {items.length === 0 && <li className="px-4 py-3 text-sm text-muted">No results</li>}
          {items.map((it, i) => (
            <li key={it.id}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={it.run}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] transition-colors ${i === active ? "bg-brand-soft text-slate-900 dark:text-white" : ""}`}
              >
                {it.type ? <TypeIcon type={it.type} /> : <ArrowRight size={14} className="text-slate-400" />}
                <span className="flex-1 truncate">{it.label}</span>
                {it.hint && <span className="font-mono text-[11px] text-muted">{it.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
