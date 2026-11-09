"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AtSign, Bell, CircleDot, Github, KeyRound, MessageSquare, UserPlus, Users, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { markNotificationsRead } from "@/app/actions/notifications";
import type { InboxData } from "@/lib/notify";
import { playChime, setSoundEnabled, soundEnabled, unlockAudioOnInteraction } from "@/lib/chime";

type Data = InboxData;
type Item = Data["items"][number];
const ICON = { ASSIGNED: UserPlus, MENTIONED: AtSign, COMMENTED: MessageSquare, STATUS_CHANGED: CircleDot, TEAM_JOINED: Users, PASSWORD_REQUEST: KeyRound, GITHUB_ISSUE: Github } as const;
const TITLE = { ASSIGNED: "Assigned to you", MENTIONED: "You were mentioned", COMMENTED: "New comment", STATUS_CHANGED: "Status changed", TEAM_JOINED: "New teammate", PASSWORD_REQUEST: "Password request", GITHUB_ISSUE: "New GitHub issue" } as const;

/** Check for news every 20s, but only while the tab is visible and someone is using it.
 *  Hidden or idle tabs make no requests, so the free database can sleep. */
const POLL_MS = 20_000;
const IDLE_MS = 10 * 60_000;

export function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function KindIcon({ kind, size = 13 }: { kind: string; size?: number }) {
  const I = ICON[kind as keyof typeof ICON] ?? CircleDot;
  return <I size={size} />;
}

export function NotificationBell() {
  const router = useRouter();
  const [data, setData] = useState<Data>({ unread: 0, items: [] });
  const [open, setOpen] = useState(false);
  const [sound, setSound] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const known = useRef<Set<string> | null>(null);
  const lastActive = useRef(Date.now());

  const openIssue = useCallback((n: Item) => {
    if (!n.read) markNotificationsRead([n.id]).catch(() => {});
    router.push(n.href);
  }, [router]);

  /** Toast + chime for notifications that arrived while the page was open. */
  const announce = useCallback((fresh: Item[]) => {
    playChime();
    if (fresh.length > 3) {
      toast(`${fresh.length} new notifications`, {
        description: fresh.slice(0, 2).map((n) => n.message).join(" · "),
        icon: <Bell size={15} />,
        action: { label: "Open inbox", onClick: () => window.dispatchEvent(new Event("karya:open-inbox")) },
        duration: 10_000,
      });
      return;
    }
    for (const n of fresh) {
      toast(TITLE[n.kind as keyof typeof TITLE] ?? "Notification", {
        id: n.id,
        description: n.message,
        icon: <KindIcon kind={n.kind} size={15} />,
        action: { label: "Open", onClick: () => openIssue(n) },
        duration: n.kind === "ASSIGNED" ? 12_000 : 8_000,
      });
    }
  }, [openIssue]);

  /** First load of a visit: if things came in while they were away, say so once. */
  const greet = useCallback((unread: Item[], total: number) => {
    try {
      if (sessionStorage.getItem("karya:greeted")) return;
      sessionStorage.setItem("karya:greeted", "1");
    } catch {}
    const assigned = unread.filter((n) => n.kind === "ASSIGNED").length;
    setTimeout(() => {
      toast(`While you were away: ${total} new`, {
        description: (
          <ul className="mt-1 space-y-1">
            {unread.slice(0, 3).map((n) => <li key={n.id} className="line-clamp-1">{n.message}</li>)}
            {total > 3 && <li className="text-muted">and {total - 3} more</li>}
          </ul>
        ),
        icon: assigned ? <UserPlus size={15} /> : <Bell size={15} />,
        action: { label: "Open inbox", onClick: () => window.dispatchEvent(new Event("karya:open-inbox")) },
        duration: 15_000,
      });
    }, 1500); // after the splash screen has gone
  }, []);

  const load = useCallback(async () => {
    const d: Data | null = await fetch("/api/notifications").then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (!d) return;
    setData(d);
    const unread = d.items.filter((n) => !n.read);
    if (known.current === null) {
      known.current = new Set(d.items.map((n) => n.id));
      if (unread.length) greet(unread, d.unread);
      return;
    }
    const fresh = unread.filter((n) => !known.current!.has(n.id)).reverse();
    d.items.forEach((n) => known.current!.add(n.id));
    if (fresh.length) {
      announce(fresh);
      router.refresh(); // so the new assignment also shows on the board / Your work right away
    }
  }, [announce, greet, router]);

  useEffect(() => {
    setSound(soundEnabled());
    unlockAudioOnInteraction();
    load();
    const active = () => document.visibilityState === "visible" && Date.now() - lastActive.current < IDLE_MS;
    const t = setInterval(() => { if (active()) load(); }, POLL_MS);
    const onActivity = () => {
      const wasIdle = Date.now() - lastActive.current >= IDLE_MS;
      lastActive.current = Date.now();
      if (wasIdle) load();
    };
    const onVisible = () => { if (document.visibilityState === "visible") { lastActive.current = Date.now(); load(); } };
    const onOpenInbox = () => { setOpen(true); load(); };
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("karya:open-inbox", onOpenInbox);
    return () => {
      clearInterval(t);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("karya:open-inbox", onOpenInbox);
    };
  }, [load]);

  // Unread count in the browser tab title, so it shows from other tabs too.
  useEffect(() => {
    const strip = (t: string) => t.replace(/^\(\d+\+?\) /, "");
    const apply = () => { document.title = (data.unread ? `(${data.unread > 9 ? "9+" : data.unread}) ` : "") + strip(document.title); };
    apply();
    // Next.js replaces the <title> element on navigation, so watch the whole <head>.
    const mo = new MutationObserver(() => { if (data.unread && !/^\(\d+\+?\) /.test(document.title)) apply(); });
    mo.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => mo.disconnect();
  }, [data.unread]);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundEnabled(next);
    if (next) playChime(true);
  };

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
        <div className="card absolute left-0 top-full z-50 mt-1 w-[min(22rem,calc(100vw-1.5rem))] origin-top-left animate-pop overflow-hidden shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-200 py-1.5 pl-4 pr-2 dark:border-slate-800">
            <span className="flex-1 text-sm font-semibold">Inbox</span>
            {data.unread > 0 && (
              <button className="rounded px-1.5 py-1 text-xs text-brand hover:underline" onClick={async () => { await markNotificationsRead(); load(); }}>
                Mark all as read
              </button>
            )}
            <button className="btn-icon !size-7" onClick={toggleSound} aria-pressed={sound}
              data-tip={sound ? "Sound on. Click to mute" : "Sound off. Click to unmute"} aria-label={sound ? "Mute notification sound" : "Unmute notification sound"}>
              {sound ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {data.items.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">Nothing new. Assignments, mentions and replies show up here.</li>}
            {data.items.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.href}
                  onClick={() => { setOpen(false); if (!n.read) markNotificationsRead([n.id]).then(load); }}
                  className={`flex gap-3 px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 ${n.read ? "" : "bg-brand/5"}`}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800"><KindIcon kind={n.kind} /></span>
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
