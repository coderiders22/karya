"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useEffect, useState } from "react";
import {
  Home, FolderKanban, Search, Users, KanbanSquare, ListTodo, GanttChartSquare, Rows3, BarChart3, Settings2,
  Bookmark, Menu, Plus, Coffee, BookOpen, KeyRound,
} from "lucide-react";
import { useAccess } from "./Access";
import { Logo } from "./Logo";
import { NotificationBell } from "./NotificationBell";
import { openCreateIssue } from "./CreateIssueDialog";

type P = { id: string; key: string; name: string; color: string };
type F = { id: string; name: string; href: string };
type Icon = React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;

function NavLink({ href, icon: I, children, exact, badge, tour }: { href: string; icon?: Icon; children: React.ReactNode; exact?: boolean; badge?: string; tour?: string }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link
      href={href}
      data-tour={tour}
      className={clsx(
        "group relative flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors duration-150",
        active ? "bg-white/[0.08] font-medium text-white" : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100",
      )}
    >
      {active && <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-brand" />}
      {I && <I size={16} strokeWidth={1.75} className={clsx("transition-colors", active ? "text-brand" : "text-slate-500 group-hover:text-slate-300")} />}
      <span className="flex-1 truncate">{children}</span>
      {badge && <span className="rounded bg-brand/15 px-1 text-[10px] font-semibold uppercase tracking-wide text-brand">{badge}</span>}
    </Link>
  );
}

export function ProjectBadge({ p, size = 20 }: { p: { key: string; color: string }; size?: number }) {
  return (
    <span className="grid shrink-0 select-none place-items-center rounded-[5px] font-semibold text-white"
      style={{ background: p.color, width: size, height: size, fontSize: Math.max(9, size * 0.4) }}>
      {p.key.slice(0, 2)}
    </span>
  );
}

function Section({ title, children, action, tour }: { title: string; children: React.ReactNode; action?: React.ReactNode; tour?: string }) {
  return (
    <div className="mt-5" data-tour={tour}>
      <div className="mb-1 flex items-center justify-between px-2 text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">
        {title}
        {action}
      </div>
      <nav className="space-y-px">{children}</nav>
    </div>
  );
}

export function Sidebar({ projects, filters, user, workspace, passwordRequests }: { projects: P[]; filters: F[]; user: React.ReactNode; workspace: string; /** Only set for the site owner. */ passwordRequests?: number }) {
  const path = usePathname();
  const { mode, canEdit } = useAccess();
  const student = mode === "STUDENT";
  const current = projects.find((p) => path.startsWith(`/projects/${p.key}/`) || path === `/projects/${p.key}`);
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  // "Open inbox" from a notification toast, and the guided tour: on phones these live in this drawer.
  useEffect(() => {
    const show = () => { if (!window.matchMedia("(min-width: 64rem)").matches) setOpen(true); };
    const hide = () => setOpen(false);
    window.addEventListener("karya:open-inbox", show);
    window.addEventListener("karya:sidebar-open", show);
    window.addEventListener("karya:sidebar-close", hide);
    return () => {
      window.removeEventListener("karya:open-inbox", show);
      window.removeEventListener("karya:sidebar-open", show);
      window.removeEventListener("karya:sidebar-close", hide);
    };
  }, []);

  return (
    <>
      <div className="dark sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-white/10 bg-ink px-3 pt-[env(safe-area-inset-top)] text-white lg:hidden [html.dark_&]:bg-[#0c0c0b]">
        <button className="btn-icon" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={18} /></button>
        <Link href="/your-work"><Logo /></Link>
        <div className="flex-1" />
        <button className="btn-icon" aria-label="Search" onClick={() => window.dispatchEvent(new Event("trackr:palette"))}><Search size={17} /></button>
        {canEdit && <button aria-label="New issue" onClick={() => openCreateIssue()}
          className="grid size-8 place-items-center rounded-md bg-brand text-brand-fg active:scale-95"><Plus size={17} strokeWidth={2.25} /></button>}
      </div>
      {open && <div className="fixed inset-0 z-40 animate-fade bg-slate-950/40 backdrop-blur-[2px] lg:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={clsx(
          "dark fixed inset-y-0 left-0 z-50 flex w-[min(17rem,85vw)] shrink-0 flex-col pb-[env(safe-area-inset-bottom)] lg:w-60 bg-ink text-slate-200 transition-transform duration-300 ease-out-quint",
          "[html.dark_&]:border-r [html.dark_&]:border-white/[0.06] [html.dark_&]:bg-[#0c0c0b] lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0 shadow-xl" : "-translate-x-full",
        )}
      >
        <div className="flex h-12 items-center justify-between px-3">
          <Link href="/your-work"><Logo /></Link>
          <div data-tour="inbox"><NotificationBell /></div>
        </div>
        {!student && <div className="truncate px-3.5 pb-2 text-[11px] text-slate-500" title={workspace}>{workspace}</div>}

        <div className="flex gap-1.5 px-3 pb-2">
          <button
            data-tour="search"
            onClick={() => window.dispatchEvent(new Event("trackr:palette"))}
            className="flex h-8 flex-1 items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 text-[13px] text-slate-400 transition-colors hover:border-white/15 hover:bg-white/[0.07] hover:text-slate-200"
          >
            <Search size={14} />
            <span className="flex-1 text-left">Search</span>
            <span className="kbd !border-white/10 !bg-white/5">⌘K</span>
          </button>
          {canEdit && (
            <button onClick={() => openCreateIssue()} data-tour="create" data-tip="New issue  C" aria-label="New issue"
              className="grid size-8 place-items-center rounded-md bg-brand text-brand-fg shadow-[0_0_0_1px_rgb(255_255_255/0.08),0_4px_14px_-4px_var(--color-brand-500)] transition-[background-color,transform] hover:bg-brand-hover active:scale-95">
              <Plus size={16} strokeWidth={2.25} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <nav className="space-y-px">
            <NavLink href="/your-work" icon={Home} tour="your-work">{student ? "Today" : "Your work"}</NavLink>
            <NavLink href="/projects" icon={FolderKanban} exact tour="projects">Projects</NavLink>
            {!student && <NavLink href="/filters" icon={Rows3} exact tour="all-issues">All issues</NavLink>}
            {!student && <NavLink href="/settings/members" icon={Users} tour="team">Team</NavLink>}
            <NavLink href="/guide" icon={BookOpen} tour="guide">Guide</NavLink>
          </nav>

          {passwordRequests !== undefined && (
            <Section title="Site owner">
              <NavLink href="/admin/password-requests" icon={KeyRound} badge={passwordRequests > 0 ? String(passwordRequests) : undefined}>Password requests</NavLink>
            </Section>
          )}

          {current && (
            <Section title={current.name} tour="project-nav">
              <NavLink href={`/projects/${current.key}/board`} icon={KanbanSquare}>Board</NavLink>
              {student && <NavLink href={`/projects/${current.key}/team`} icon={Users}>Team</NavLink>}
              <NavLink href={`/projects/${current.key}/backlog`} icon={ListTodo}>Backlog</NavLink>
              <NavLink href={`/projects/${current.key}/standup`} icon={Coffee}>Standup</NavLink>
              <NavLink href={`/projects/${current.key}/roadmap`} icon={GanttChartSquare}>Roadmap</NavLink>
              <NavLink href={`/projects/${current.key}/issues`} icon={Rows3}>Issues</NavLink>
              <NavLink href={`/projects/${current.key}/reports`} icon={BarChart3}>Insights</NavLink>
              <NavLink href={`/projects/${current.key}/settings`} icon={Settings2}>Settings</NavLink>
            </Section>
          )}

          <Section title="Projects">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.key}/board`}
                className={clsx("flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors hover:bg-white/[0.05]",
                  current?.id === p.id ? "font-medium text-white" : "text-slate-400 hover:text-slate-100")}>
                <ProjectBadge p={p} size={18} />
                <span className="truncate">{p.name}</span>
              </Link>
            ))}
            {projects.length === 0 && <p className="px-2 text-xs text-muted">No projects yet</p>}
          </Section>

          {filters.length > 0 && (
            <Section title="Saved views">
              {filters.map((f) => (
                <Link key={f.id} href={f.href}
                  className="flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-slate-100">
                  <Bookmark size={15} strokeWidth={1.75} className="text-slate-500" /><span className="truncate">{f.name}</span>
                </Link>
              ))}
            </Section>
          )}
        </div>

        <div className="border-t border-white/[0.06] p-2" data-tour="user-menu">{user}</div>
      </aside>
    </>
  );
}
