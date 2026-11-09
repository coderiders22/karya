import { NextResponse } from "next/server";
import { autoTransition, findIssues, recordDev, verifySignature } from "@/lib/github";
import { db } from "@/lib/db";
import { githubWebhookSecret, openToken } from "@/lib/githubOAuth";
import { syncGithubIssue } from "@/lib/githubIssues";

type Commit = { id: string; message: string; url: string; author?: { name?: string; username?: string } };

/**
 * GitHub webhook. Added automatically by "Connect GitHub" in project settings, or by hand in the repo:
 *   Settings → Webhooks → Payload URL: <APP_URL>/api/integrations/github, Content type: application/json,
 *   Secret: GITHUB_WEBHOOK_SECRET (or the derived one shown in project settings),
 *   Events: Pushes, Pull requests, Branch or tag creation, Issues.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const p = (() => { try { return JSON.parse(body); } catch { return null; } })();
  const repo: string = p?.repository?.full_name ?? "";
  if (!repo) return NextResponse.json({ error: "Not a repository event" }, { status: 400 });

  // Only projects connected to this repository, and only if GitHub signed with that project's secret.
  // The signature is what proves the delivery is genuine; the repository name in the body proves nothing.
  const signature = req.headers.get("x-hub-signature-256");
  const connected = await db.project.findMany({ where: { githubRepo: { equals: repo, mode: "insensitive" } }, select: { id: true, githubSecret: true, githubIssueSync: true } });
  const shared = githubWebhookSecret();
  const verified = connected.filter((c) => {
    const secret = c.githubSecret ? openToken(c.githubSecret) : shared; // older connections used the shared secret
    return !!secret && verifySignature(body, signature, secret);
  });
  if (verified.length === 0) return NextResponse.json({ error: connected.length ? "Bad signature" : "This repository isn't connected to a Karya project" }, { status: connected.length ? 401 : 404 });
  const projectIds = verified.map((c) => c.id);

  const event = req.headers.get("x-github-event");
  // Remember the delivery, so project settings can show the connection is alive.
  await db.project.updateMany({ where: { id: { in: projectIds } }, data: { githubLastEventAt: new Date(), githubLastEventType: event ?? "unknown" } });
  let linked = 0;

  if (event === "ping") return NextResponse.json({ ok: true, message: "Karya is listening" });

  if (event === "issues" && p.issue && !["deleted", "transferred"].includes(p.action)) {
    for (const project of verified) {
      if (project.githubIssueSync) await syncGithubIssue(project.id, p.issue, { action: p.action, announce: true });
    }
  }

  if (event === "push") {
    const branch = String(p.ref ?? "").replace("refs/heads/", "");
    for (const issue of await findIssues(projectIds, branch)) {
      await recordDev(issue.id, "BRANCH", `${repo}:${branch}`, { title: branch, url: `${p.repository?.html_url}/tree/${branch}`, repo, author: p.pusher?.name ?? "" });
      linked++;
    }
    for (const c of (p.commits ?? []) as Commit[]) {
      for (const issue of await findIssues(projectIds, c.message)) {
        await recordDev(issue.id, "COMMIT", c.id, { title: c.message.split("\n")[0].slice(0, 200), url: c.url, repo, author: c.author?.username ?? c.author?.name ?? "" });
        linked++;
      }
    }
  }

  if (event === "create" && p.ref_type === "branch") {
    for (const issue of await findIssues(projectIds, p.ref)) {
      await recordDev(issue.id, "BRANCH", `${repo}:${p.ref}`, { title: p.ref, url: `${p.repository?.html_url}/tree/${p.ref}`, repo, author: p.sender?.login ?? "" });
      linked++;
    }
  }

  if (event === "pull_request") {
    const pr = p.pull_request;
    const state = pr.merged ? "merged" : pr.state === "closed" ? "closed" : pr.draft ? "draft" : "open";
    for (const issue of await findIssues(projectIds, pr.title, pr.head?.ref, pr.body)) {
      await recordDev(issue.id, "PULL_REQUEST", `${repo}#${pr.number}`, { title: pr.title, url: pr.html_url, state, repo, author: pr.user?.login ?? "" });
      linked++;
      if (state === "merged") await autoTransition(issue, "done", `PR #${pr.number} merged`);
      else if (state === "open" && ["opened", "reopened", "ready_for_review"].includes(p.action)) await autoTransition(issue, "review", `PR #${pr.number} opened`);
    }
  }

  return NextResponse.json({ ok: true, linked });
}
