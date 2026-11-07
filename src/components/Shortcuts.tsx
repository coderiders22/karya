"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Modal } from "./CreateIssueDialog";

const GROUPS: [string, [string[], string][]][] = [
  ["Anywhere", [
    [["⌘", "K"], "Search & jump to anything"],
    [["C"], "Create an issue"],
    [["/"], "Search"],
    [["?"], "Show this list"],
  ]],
  ["Go to", [
    [["G", "W"], "Your work"],
    [["G", "P"], "Projects"],
    [["G", "I"], "All issues"],
    [["G", "B"], "Board (current project)"],
    [["G", "L"], "Backlog (current project)"],
    [["G", "S"], "Standup (current project)"],
  ]],
  ["On an issue", [
    [["M"], "Assign to me"],
    [["E"], "Edit description"],
    [["W"], "Watch / unwatch"],
  ]],
  ["Lists", [
    [["J"], "Next row"],
    [["K"], "Previous row"],
    [["↵"], "Open selected issue"],
    [["X"], "Select row"],
  ]],
];

export function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t?.closest("input,textarea,select,[contenteditable=true]") || e.metaKey || e.ctrlKey || e.altKey;
}

export function Shortcuts({ projects }: { projects: { key: string }[] }) {
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let pendingG = 0;
    const project = projects.find((p) => path.startsWith(`/projects/${p.key}`))?.key;
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || e.defaultPrevented) return;
      if (e.key === "?") { e.preventDefault(); setOpen((o) => !o); return; }
      if (e.key === "/") { e.preventDefault(); window.dispatchEvent(new Event("trackr:palette")); return; }
      const k = e.key.toLowerCase();
      if (k === "g") { pendingG = Date.now(); return; }
      if (Date.now() - pendingG < 1200) {
        pendingG = 0;
        const to: Record<string, string | undefined> = {
          w: "/your-work", p: "/projects", i: "/filters",
          b: project && `/projects/${project}/board`, l: project && `/projects/${project}/backlog`, s: project && `/projects/${project}/standup`,
        };
        if (to[k]) { e.preventDefault(); router.push(to[k]!); }
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("trackr:shortcuts", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("trackr:shortcuts", onOpen); };
  }, [path, projects, router]);

  if (!open) return null;
  return (
    <Modal onClose={() => setOpen(false)} wide>
      <h2 className="mb-4 text-base font-semibold">Keyboard shortcuts</h2>
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {GROUPS.map(([title, rows]) => (
          <div key={title}>
            <div className="label mb-2">{title}</div>
            <ul className="space-y-1.5">
              {rows.map(([keys, label]) => (
                <li key={label} className="flex items-center justify-between text-[13px]">
                  <span className="text-slate-700 dark:text-slate-300">{label}</span>
                  <span className="flex gap-1">{keys.map((k, i) => <span key={i} className="kbd">{k}</span>)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  );
}
