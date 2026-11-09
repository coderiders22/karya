"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Github, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { fetchGithubIssues } from "@/app/actions/github";

/** Check every 15s, but only while the tab is visible and someone is using it, so the free database can sleep. */
const POLL_MS = 15_000;
const IDLE_MS = 10 * 60_000;

/** Reloads the page's data when a teammate or GitHub changes something, without losing what's on screen. */
function useLivePulse(projectKey: string, paused: boolean) {
  const router = useRouter();
  const version = useRef<string | null>(null);
  const lastActive = useRef(Date.now());
  const held = useRef(paused);
  held.current = paused;

  const check = useCallback(async () => {
    if (document.visibilityState !== "visible" || held.current || Date.now() - lastActive.current > IDLE_MS) return;
    const next: { v?: string } | null = await fetch(`/api/projects/${projectKey}/pulse`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (!next?.v) return;
    if (version.current !== null && next.v !== version.current) router.refresh();
    version.current = next.v;
  }, [projectKey, router]);

  useEffect(() => {
    check();
    const timer = setInterval(check, POLL_MS);
    const onActivity = () => {
      const wasIdle = Date.now() - lastActive.current > IDLE_MS;
      lastActive.current = Date.now();
      if (wasIdle) check();
    };
    const onVisible = () => { if (document.visibilityState === "visible") { lastActive.current = Date.now(); check(); } };
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check]);
}

/** For pages that just need to stay current, like the backlog. */
export function LiveRefresh({ projectKey }: { projectKey: string }) {
  useLivePulse(projectKey, false);
  return null;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** A big repository comes in batches, so each server call stays short. */
export async function pullGithubIssues(projectId: string, projectKey: string) {
  let added = 0, updated = 0;
  for (let round = 0; round < 40; round++) {
    const r = await fetchGithubIssues(projectId);
    if (r.error) {
      toast.error(r.error, r.connect ? { action: { label: "Connect", onClick: () => { location.href = `/projects/${projectKey}/github`; } } } : undefined);
      return;
    }
    added += r.added ?? 0;
    updated += r.updated ?? 0;
    if (!r.more) break;
  }
  if (added) toast.success(`${plural(added, "new issue")} from GitHub`);
  else if (updated) toast.success(`${plural(updated, "issue")} updated from GitHub`);
  else toast("You're up to date with GitHub");
}

export function FetchGithubButton({ projectId, projectKey }: { projectId: string; projectKey: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button className="btn !h-7 !px-2 text-xs" disabled={busy} data-tip="Get new issues from GitHub now" onClick={async () => {
      setBusy(true);
      try {
        await pullGithubIssues(projectId, projectKey);
      } catch {
        toast.error("Couldn't reach GitHub. Try again.");
      }
      setBusy(false);
      router.refresh();
    }}>
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Github size={13} />}{busy ? "Fetching…" : "Fetch from GitHub"}
    </button>
  );
}

/** Shows the board is live, and lets people pull the latest themselves. */
export function BoardSync({ projectId, projectKey, paused, canFetch }: { projectId: string; projectKey: string; paused: boolean; canFetch: boolean }) {
  const router = useRouter();
  const [refreshing, start] = useTransition();
  useLivePulse(projectKey, paused);
  return (
    <div className="ml-auto flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs text-muted" data-tip="This board updates by itself as your team and GitHub make changes">
        <span className="relative flex size-1.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:animate-none" /><span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" /></span>
        Live
      </span>
      {canFetch ? <FetchGithubButton projectId={projectId} projectKey={projectKey} /> : (
        <button className="btn !h-7 !px-2 text-xs" disabled={refreshing} data-tip="Get the latest now" onClick={() => start(() => router.refresh())}>
          <RefreshCw size={13} className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} />Refresh
        </button>
      )}
    </div>
  );
}

/** Shown on the board, because that's where people work and nobody goes looking in settings. */
export function GithubPrompt({ projectKey }: { projectKey: string }) {
  const storage = `karya:github-prompt:${projectKey}`;
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { setShow(localStorage.getItem(storage) !== "dismissed"); } catch { setShow(true); }
  }, [storage]);
  if (!show) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] dark:border-slate-800 dark:bg-slate-900/60">
      <Github size={16} className="shrink-0 text-slate-500" />
      <span className="min-w-0 flex-1 basis-64"><b className="font-medium">Using GitHub for this project?</b> <span className="text-muted">Connect the repo. New GitHub issues become cards here, and cards move when pull requests open and merge.</span></span>
      <Link href={`/projects/${projectKey}/github`} className="btn-primary !h-7 !px-2.5 text-xs">Connect GitHub</Link>
      <button className="btn-icon !size-7" aria-label="Don't show this again" data-tip="Don't show this again" onClick={() => {
        setShow(false);
        try { localStorage.setItem(storage, "dismissed"); } catch {}
      }}><X size={14} /></button>
    </div>
  );
}
