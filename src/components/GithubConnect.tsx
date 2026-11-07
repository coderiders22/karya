"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Github, Lock, Search } from "lucide-react";
import { toast } from "sonner";
import { connectGithubRepo, disconnectGithubRepo, forgetGithubAccount, listGithubRepos } from "@/app/actions/github";
import { confirmDialog } from "./Dialog";
import { timeAgo } from "./NotificationBell";

type Props = {
  projectId: string;
  projectKey: string;
  configured: boolean;
  repo: string | null;
  login: string | null;
  status: string | null;
  automation: boolean;
  manual: React.ReactNode;
};

const MESSAGES: Record<string, string> = {
  authorised: "GitHub is connected. Now pick the repository for this project.",
  cancelled: "GitHub connection was cancelled.",
  expired: "That GitHub sign-in took too long or came from somewhere else. Try again.",
  error: "GitHub didn't accept the connection. Check the OAuth app's callback URL and try again.",
  "not-configured": "One-click GitHub isn't set up on this server yet.",
};

/** Project settings → GitHub: connect a repository in a few clicks, see what's connected, disconnect. */
export function GithubConnect({ projectId, projectKey, configured, repo, login, status, automation, manual }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  // Show the result of the GitHub round trip once, then tidy the URL.
  useEffect(() => {
    if (!status || !MESSAGES[status]) return;
    (status === "authorised" ? toast.success : toast.error)(MESSAGES[status]);
    history.replaceState(null, "", location.pathname + "#github");
  }, [status]);

  const connectHref = `/api/github/connect?project=${encodeURIComponent(projectKey)}`;

  return (
    <section id="github" className="card scroll-mt-6 p-5">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="section-title">GitHub</h2>
        <span className={`chip ${repo ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
          {repo ? "Connected" : "Not connected"}
        </span>
      </div>
      <p className="mb-4 text-sm text-muted">
        Mention an issue key (for example <code className="font-mono">{projectKey}-12</code>) in a branch name, commit message or pull request title.
        Karya links it to the issue{automation ? ", moves it to review when the PR opens, and to done when it merges" : ""}.
      </p>

      {repo ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
          <span className="grid size-9 place-items-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900"><Github size={18} /></span>
          <div className="min-w-0 flex-1">
            <a href={`https://github.com/${repo}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium hover:underline">
              {repo}<ExternalLink size={12} className="text-slate-400" />
            </a>
            <div className="text-xs text-muted">Pushes, branches and pull requests are sent to Karya.</div>
          </div>
          <button className="btn" disabled={pending} onClick={async () => {
            const ok = await confirmDialog({
              title: `Disconnect ${repo}?`,
              message: "Karya removes its webhook from the repository. Links already on issues stay.",
              confirmLabel: "Disconnect", danger: true,
            });
            if (!ok) return;
            start(async () => {
              const r = await disconnectGithubRepo(projectId);
              if (r.warning) toast.warning(r.warning); else toast.success(`Disconnected ${repo}`);
              router.refresh();
            });
          }}>Disconnect</button>
        </div>
      ) : !configured ? (
        <>
          <p className="mb-3 rounded-md bg-slate-50 px-3 py-2 text-[13px] text-slate-600 dark:bg-slate-900/60 dark:text-slate-400">
            For one-click connect, an admin adds <code className="font-mono">GITHUB_CLIENT_ID</code> and <code className="font-mono">GITHUB_CLIENT_SECRET</code> from a GitHub OAuth App to the server. Until then, add the webhook by hand:
          </p>
          {manual}
        </>
      ) : login ? (
        <RepoPicker projectId={projectId} login={login} connectHref={connectHref} />
      ) : (
        <>
          <a href={connectHref} className="btn-primary !h-9 !px-3.5"><Github size={16} />Connect GitHub</a>
          <p className="mt-2 text-xs text-muted">
            GitHub will ask to let Karya see your repositories and manage webhooks. Karya only adds one webhook to the repository you pick; it never reads or changes your code.
          </p>
          <details className="mt-4 text-[13px]">
            <summary className="cursor-pointer text-muted hover:text-slate-900 dark:hover:text-white">Set up the webhook by hand instead</summary>
            <div className="mt-3">{manual}</div>
          </details>
        </>
      )}
    </section>
  );
}

function RepoPicker({ projectId, login, connectHref }: { projectId: string; login: string; connectHref: string }) {
  const router = useRouter();
  const [repos, setRepos] = useState<{ name: string; private: boolean; pushedAt: string | null }[] | null>(null);
  const [error, setError] = useState<string>();
  const [reconnect, setReconnect] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  useEffect(() => {
    listGithubRepos().then((r) => { setRepos(r.repos ?? []); setError(r.error); setReconnect(!!r.reconnect); });
  }, []);

  const shown = (repos ?? []).filter((r) => r.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 50);

  if (reconnect) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600">{error}</p>
        <a href={connectHref} className="btn-primary"><Github size={15} />Connect GitHub</a>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[13px]">
        <span className="inline-flex items-center gap-1.5 text-muted"><Github size={14} />Signed in to GitHub as <b className="font-medium text-slate-900 dark:text-white">{login}</b></span>
        <button className="text-xs text-muted underline-offset-2 hover:text-slate-900 hover:underline dark:hover:text-white"
          onClick={() => start(async () => { await forgetGithubAccount(); router.refresh(); })}>
          Use another account
        </button>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 border-b border-slate-200 px-3 dark:border-slate-800">
          <Search size={14} className="text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a repository…" aria-label="Find a repository"
            className="h-10 w-full bg-transparent text-[13.5px] outline-none placeholder:text-slate-400" />
        </div>
        {repos === null ? (
          <p className="px-4 py-6 text-center text-sm text-muted">Loading your repositories…</p>
        ) : error ? (
          <p className="px-4 py-6 text-center text-sm text-red-600">{error}</p>
        ) : shown.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">
            {repos.length ? `No repository matches “${q}”.` : "No repositories where you're an admin. Ask a repository admin to connect it."}
          </p>
        ) : (
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {shown.map((r) => (
              <li key={r.name} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate text-[13.5px] font-medium">
                    {r.name}{r.private && <Lock size={12} className="shrink-0 text-slate-400" aria-label="Private" />}
                  </div>
                  {r.pushedAt && <div className="text-xs text-muted">Updated {timeAgo(r.pushedAt)}</div>}
                </div>
                <button className="btn !h-7 text-xs" disabled={!!busy} onClick={() => {
                  setBusy(r.name);
                  start(async () => {
                    const res = await connectGithubRepo(projectId, r.name);
                    setBusy(null);
                    if (res.error) return void toast.error(res.error);
                    toast.success(`Connected ${r.name}`);
                    router.refresh();
                  });
                }}>
                  {busy === r.name ? "Connecting…" : <><Check size={13} />Connect</>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
