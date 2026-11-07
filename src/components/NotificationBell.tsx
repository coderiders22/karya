"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AtSign, Bell, CircleDot, MessageSquare, UserPlus } from "lucide-react";
import { getNotifications, markNotificationsRead } from "@/app/actions/notifications";

type Data = Awaited<ReturnType<typeof getNotifications>>;
const ICON = { ASSIGNED: UserPlus, MENTIONED: AtSign, COMMENTED: MessageSquare, STATUS_CHANGED: CircleDot } as const;

export function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function NotificationBell() {
  const [data, setData] = useState<Data>({ unread: 0, items: [] });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const load = useCallback(() => getNotifications().then(setData).catch(() => {}), []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, [load]);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button data-tip="Inbox" className="btn-icon relative" aria-label={`Notifications${data.unread ? ` (${data.unread} unread)` : ""}`} onClick={() => { setOpen(!open); if (!open) load(); }}>
        <Bell size={16} strokeWidth={1.75} />
        {data.unread > 0 && (
          <span className="absolute right-1 top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-brand px-0.5 text-[9px] font-semibold text-white dark:text-slate-950">
            {data.unread > 9 ? "9+" : data.unread}
          </span>
        )}
      </button>
      {open && (
        <div className="card absolute left-0 top-full z-50 mt-1 w-[22rem] origin-top-left animate-pop overflow-hidden shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
            <span className="text-sm font-semibold">Inbox</span>
            {data.unread > 0 && (
              <button className="text-xs text-brand hover:underline" onClick={async () => { await markNotificationsRead(); load(); }}>
                Mark all as read
              </button>
            )}
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {data.items.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">Nothing new. Assignments, mentions and replies show up here.</li>}
            {data.items.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/issues/${n.issueKey}`}
                  onClick={() => { setOpen(false); if (!n.read) markNotificationsRead([n.id]).then(load); }}
                  className={`flex gap-3 px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 ${n.read ? "" : "bg-brand/5"}`}
                >
                  {(() => { const I = ICON[n.kind as keyof typeof ICON] ?? CircleDot; return <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800"><I size={13} /></span>; })()}
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2">{n.message}</span>
                    <span className="text-xs text-muted">{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
