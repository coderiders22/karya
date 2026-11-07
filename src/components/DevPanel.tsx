"use client";

import clsx from "clsx";
import { GitBranch, GitCommitHorizontal, GitMerge, GitPullRequest, GitPullRequestClosed, GitPullRequestDraft, Copy } from "lucide-react";
import { toast } from "sonner";

type Dev = { id: string; kind: "BRANCH" | "COMMIT" | "PULL_REQUEST"; title: string; url: string; state: string; author: string; repo: string; externalId: string };

const PR_ICON = { merged: GitMerge, closed: GitPullRequestClosed, draft: GitPullRequestDraft, open: GitPullRequest } as const;
const PR_TONE = {
  merged: "text-violet-600 dark:text-violet-400",
  closed: "text-rose-600 dark:text-rose-400",
  draft: "text-slate-500",
  open: "text-emerald-600 dark:text-emerald-400",
} as const;

export function DevPanel({ issueKey, title, items }: { issueKey: string; title: string; items: Dev[] }) {
  const branch = `${issueKey.toLowerCase()}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)}`;
  const prs = items.filter((i) => i.kind === "PULL_REQUEST");
  const commits = items.filter((i) => i.kind === "COMMIT");
  const branches = items.filter((i) => i.kind === "BRANCH");
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted">Development</span>
      </div>
      <button
        onClick={() => { navigator.clipboard.writeText(`git checkout -b ${branch}`); toast.success("Branch command copied", { description: `git checkout -b ${branch}` }); }}
        className="group mb-2 flex w-full items-center gap-2 rounded-md border border-dashed border-slate-300 px-2 py-1.5 text-left text-xs hover:border-slate-400 dark:border-slate-700"
        title="Copy a git command that creates a branch linked to this issue"
      >
        <GitBranch size={13} className="text-slate-400" />
        <code className="min-w-0 flex-1 truncate font-mono text-[11px]">{branch}</code>
        <Copy size={12} className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200" />
      </button>
      {items.length === 0 ? (
        <p className="text-xs text-muted">Mention <code className="font-mono">{issueKey}</code> in a branch, commit or PR title and it shows up here.</p>
      ) : (
        <ul className="space-y-1.5 text-[13px]">
          {prs.map((d) => {
            const s = (d.state in PR_ICON ? d.state : "open") as keyof typeof PR_ICON;
            const I = PR_ICON[s];
            return (
              <li key={d.id}>
                <a href={d.url} target="_blank" rel="noreferrer" className="flex items-start gap-2 hover:underline">
                  <I size={15} className={clsx("mt-0.5 shrink-0", PR_TONE[s])} />
                  <span className="min-w-0 flex-1"><span className="line-clamp-2">{d.title}</span>
                    <span className="block text-[11px] text-muted">{d.externalId} · {s}{d.author && ` · ${d.author}`}</span></span>
                </a>
              </li>
            );
          })}
          {branches.length > 0 && (
            <li className="flex items-center gap-2 text-xs text-muted"><GitBranch size={14} />{branches.length} branch{branches.length === 1 ? "" : "es"}</li>
          )}
          {commits.length > 0 && (
            <li className="flex items-center gap-2 text-xs text-muted"><GitCommitHorizontal size={14} />{commits.length} commit{commits.length === 1 ? "" : "s"}</li>
          )}
        </ul>
      )}
    </div>
  );
}
