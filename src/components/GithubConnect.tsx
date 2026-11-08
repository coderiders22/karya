"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Activity, Check, CircleAlert, CircleCheck, ExternalLink, Github, Loader2, Lock, Search } from "lucide-react";
import { toast } from "sonner";
import { checkGithubConnection, connectGithubRepo, disconnectGithubRepo, forgetGithubAccount, linkRepoByHand, listGithubRepos } from "@/app/actions/github";
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
  canManage: boolean;
  lastEventAt: string | null;
  lastEventType: string | null;
  hasHook: boolean;
};

const MESSAGES: Record<string, string> = {
  authorised: "GitHub is connected. Now pick the repository for this project.",
  cancelled: "GitHub connection was cancelled.",
  expired: "That GitHub sign-in took too long or came from somewhere else. Try again.",
  error: "GitHub didn't accept the connection. Check the OAuth app's callback URL and try again.",
  "not-configured": "One-click GitHub isn't set up on this server yet.",
};

/** Project settings → GitHub: connect a repository in a few clicks, see what's connected, disconnect. */
export function GithubConnect({ projectId, projectKey, configured, repo, login, status, automation, canManage, lastEventAt, lastEventType, hasHook }: Props) {
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
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 px-4 py-3 dark:bg-slate-900/60">
          <span className="grid size-9 place-items-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900"><Github size={18} /></span>
          <div className="min-w-0 flex-1">
            <a href={`https://github.com/${repo}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium hover:underline">
              {repo}<ExternalLink size={12} className="text-slate-400" />
            </a>
            <div className="text-xs text-muted">Pushes, branches and pull requests are sent to Karya.</div>
          </div>
          {canManage && <button className="btn" disabled={pending} onClick={async () => {
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
          }}>Disconnect</button>}
        </div>
        <ConnectionHealth projectId={projectId} projectKey={projectKey} canManage={canManage} hasHook={hasHook} lastEventAt={lastEventAt} lastEventType={lastEventType} />
        </div>
      ) : !canManage ? (
        <p className="text-sm text-muted">A manager or this project's lead can connect a repository.</p>
      ) : !configured ? (
        <ManualSetup projectId={projectId} />
      ) : login ? (
        <RepoPicker projectId={projectId} login={login} connectHref={connectHref} />
      ) : (
        <>
          <a href={connectHref} className="btn-primary !h-9 !px-3.5"><Github size={16} />Connect GitHub</a>
          <p className="mt-2 text-xs text-muted">
            GitHub will ask to let Karya see your repositories and manage webhooks. Karya only adds one webhook to the repository you pick; it never reads or changes your code.
          </p>
        </>
      )}
    </section>
  );
}

/** Answers "is it actually working?": what Karya has received, a live test, and how to see it work. */
function ConnectionHealth({ projectId, projectKey, canManage, hasHook, lastEventAt, lastEventType }: {
  projectId: string; projectKey: string; canManage: boolean; hasHook: boolean; lastEventAt: string | null; lastEventType: string | null;
}) {
  const router = useRouter();
  const [checking, start] = useTransition();
  const [result, setResult] = useState<{ state: "ok" | "failing" | "unknown"; message: string }>();
  const LABEL: Record<string, string> = { ping: "test ping", push: "push", pull_request: "pull request", create: "new branch" };
  return (
    <div className="space-y-3 border-t border-slate-200 px-4 py-3 text-[13px] dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {lastEventAt ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400"><CircleCheck size={15} />Last received: {LABEL[lastEventType ?? ""] ?? lastEventType ?? "event"}, {timeAgo(lastEventAt)}</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400"><CircleAlert size={15} />Nothing received from GitHub yet</span>
        )}
        {canManage && hasHook && (
          <button className="btn !h-7 text-xs" disabled={checking} onClick={() => start(async () => {
            const r = await checkGithubConnection(projectId);
            setResult(r);
            router.refresh();
          })}>
            {checking ? <><Loader2 size={13} className="animate-spin" />Testing…</> : <><Activity size={13} />Test connection</>}
          </button>
        )}
      </div>
      {result && (
        <p role="status" className={`rounded-md px-3 py-2 ${result.state === "ok" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" : result.state === "failing" ? "bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{result.message}</p>
      )}
      <details className="text-muted">
        <summary className="cursor-pointer hover:text-slate-900 dark:hover:text-white">How to see it work</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Create a branch named after an issue, for example <code className="font-mono">{projectKey.toLowerCase()}-1-fix-login</code>, and push it.</li>
          <li>Open that issue in Karya: the branch appears under <b>Development</b>.</li>
          <li>Open a pull request from it: the issue moves to review. Merge it: the issue moves to done.</li>
        </ol>
        <p className="mt-2">Work is only linked when the branch, commit or PR mentions an issue key. New issues on GitHub don't create cards.</p>
      </details>
    </div>
  );
}

/** For servers without a GitHub OAuth app: link by hand, with a secret that's shown once. */
function ManualSetup({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [repo, setRepo] = useState("");
  const [made, setMade] = useState<{ secret: string; url: string }>();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  if (made) {
    return (
      <div className="space-y-2 text-[13px]">
        <p>In your repository, open <b>Settings → Webhooks → Add webhook</b> and enter:</p>
        <dl className="space-y-1 rounded-md bg-slate-50 p-3 dark:bg-slate-900/60">
          <div><dt className="inline text-muted">Payload URL: </dt><dd className="inline select-all break-all font-mono text-[12px]">{made.url}</dd></div>
          <div><dt className="inline text-muted">Content type: </dt><dd className="inline font-mono text-[12px]">application/json</dd></div>
          <div><dt className="inline text-muted">Secret: </dt><dd className="inline select-all break-all font-mono text-[12px]">{made.secret}</dd></div>
          <div><dt className="inline text-muted">Events: </dt><dd className="inline">Pushes, Pull requests, Branch or tag creation</dd></div>
        </dl>
        <p className="text-xs text-muted">Copy the secret now: it isn't shown again.</p>
        <button className="btn" onClick={() => router.refresh()}>Done</button>
      </div>
    );
  }
  return (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); start(async () => {
      const r = await linkRepoByHand(projectId, repo);
      setError(r.error);
      if (r.secret && r.url) setMade({ secret: r.secret, url: r.url });
    }); }}>
      <label className="block text-[13px]">
        <span className="label">Repository</span>
        <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="owner/name" className="input mt-1 font-mono" required />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn" disabled={pending}>Create webhook details</button>
    </form>
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
