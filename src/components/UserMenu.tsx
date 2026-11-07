"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronsUpDown, DatabaseBackup, KeyRound, LogOut, Keyboard, Map, Users } from "lucide-react";
import { startTour } from "./Tour";
import { Avatar } from "./IssueBits";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function UserMenu({ name, email, role, logout }: { name: string; email: string; role: string; logout: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const item = "flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-[13px] text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800";
  return (
    <div ref={ref} className="relative">
      {open && (
        <div className="card absolute bottom-full left-0 mb-2 w-full origin-bottom animate-pop p-1 shadow-xl" onClick={() => setOpen(false)}>
          <div className="px-2 py-1.5 text-xs text-muted">{email}</div>
          <Link href="/settings/profile" className={item}><KeyRound size={15} className="text-slate-400" />Profile & password</Link>
          <Link href="/settings/members" className={item}><Users size={15} className="text-slate-400" />Team members</Link>
          {role === "ADMIN" && <Link href="/settings/import" className={item}><DatabaseBackup size={15} className="text-slate-400" />Import & backup</Link>}
          <button className={item} onClick={() => window.dispatchEvent(new Event("trackr:shortcuts"))}><Keyboard size={15} className="text-slate-400" />Keyboard shortcuts<span className="kbd ml-auto">?</span></button>
          <button className={item} onClick={() => startTour(/^\/projects\/[^/]+\/board$/.test(location.pathname) ? "board" : "welcome")}><Map size={15} className="text-slate-400" />Take the tour</button>
          <Link href="/guide" className={item}><BookOpen size={15} className="text-slate-400" />Guide & videos</Link>
          <div className="px-1 pb-1 pt-1.5"><ThemeSwitcher /></div>
          <div className="my-1 h-px bg-slate-200 dark:bg-slate-800" />
          <button className={item} onClick={(e) => { e.stopPropagation(); void logout(); }}><LogOut size={15} className="text-slate-400" />Log out</button>
        </div>
      )}
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 rounded-md p-1.5 text-left transition-colors hover:bg-white/[0.05]">
        <Avatar name={name} size={6} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{name}</span>
          <span className="block text-[11px] capitalize text-muted">{role.toLowerCase()}</span>
        </span>
        <ChevronsUpDown size={14} className="text-slate-400" />
      </button>
    </div>
  );
}
