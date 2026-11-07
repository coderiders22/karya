import { NextResponse } from "next/server";
import { autoTransition, findIssues, recordDev, verifySignature } from "@/lib/github";
import { githubWebhookSecret } from "@/lib/githubOAuth";

type Commit = { id: string; message: string; url: string; author?: { name?: string; username?: string } };

/**
 * GitHub webhook. Added automatically by "Connect GitHub" in project settings, or by hand in the repo:
 *   Settings → Webhooks → Payload URL: <APP_URL>/api/integrations/github, Content type: application/json,
 *   Secret: GITHUB_WEBHOOK_SECRET (or the derived one shown in project settings),
 *   Events: Pushes, Pull requests, Branch or tag creation.
 */
export async function POST(req: Request) {
  const secret = githubWebhookSecret();
  if (!secret) return NextResponse.json({ error: "Set AUTH_SECRET (or GITHUB_WEBHOOK_SECRET) on the server to enable the GitHub integration" }, { status: 503 });
  const body = await req.text();
  if (!verifySignature(body, req.headers.get("x-hub-signature-256"), secret)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }
  const event = req.headers.get("x-github-event");
  const p = JSON.parse(body);
  const repo: string = p.repository?.full_name ?? "";
  let linked = 0;

  if (event === "ping") return NextResponse.json({ ok: true, message: "Karya is listening" });

  if (event === "push") {
    const branch = String(p.ref ?? "").replace("refs/heads/", "");
    for (const issue of await findIssues(branch)) {
      await recordDev(issue.id, "BRANCH", `${repo}:${branch}`, { title: branch, url: `${p.repository?.html_url}/tree/${branch}`, repo, author: p.pusher?.name ?? "" });
      linked++;
    }
    for (const c of (p.commits ?? []) as Commit[]) {
      for (const issue of await findIssues(c.message)) {
        await recordDev(issue.id, "COMMIT", c.id, { title: c.message.split("\n")[0].slice(0, 200), url: c.url, repo, author: c.author?.username ?? c.author?.name ?? "" });
        linked++;
      }
    }
  }

  if (event === "create" && p.ref_type === "branch") {
    for (const issue of await findIssues(p.ref)) {
      await recordDev(issue.id, "BRANCH", `${repo}:${p.ref}`, { title: p.ref, url: `${p.repository?.html_url}/tree/${p.ref}`, repo, author: p.sender?.login ?? "" });
      linked++;
    }
  }

  if (event === "pull_request") {
    const pr = p.pull_request;
    const state = pr.merged ? "merged" : pr.state === "closed" ? "closed" : pr.draft ? "draft" : "open";
    for (const issue of await findIssues(pr.title, pr.head?.ref, pr.body)) {
      await recordDev(issue.id, "PULL_REQUEST", `${repo}#${pr.number}`, { title: pr.title, url: pr.html_url, state, repo, author: pr.user?.login ?? "" });
      linked++;
      if (state === "merged") await autoTransition(issue, "done", `PR #${pr.number} merged`);
      else if (state === "open" && ["opened", "reopened", "ready_for_review"].includes(p.action)) await autoTransition(issue, "review", `PR #${pr.number} opened`);
    }
  }

  return NextResponse.json({ ok: true, linked });
}
