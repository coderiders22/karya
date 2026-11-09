"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import { projectInWorkspace, requireEditor, requireProjectManager, requireUser } from "@/lib/auth";
import { GithubError, gh, githubWebhookUrl, openToken, sealToken } from "@/lib/githubOAuth";
import { syncGithubIssue, type GithubIssue } from "@/lib/githubIssues";
import { projectPeople } from "@/lib/permissions";

type Repo = { full_name: string; private: boolean; pushed_at: string | null; permissions?: { admin?: boolean } };
type Hook = { id: number; config: { url?: string } };

const EVENTS = ["push", "pull_request", "create", "issues"];
/** Small enough for one call to finish within a hosting provider's time limit. */
const ISSUES_PER_CALL = 25;

/** The signed-in person's GitHub token, or null if they haven't connected (or it no longer works). */
async function tokenFor(userId: string) {
  const acct = await db.githubAccount.findUnique({ where: { userId } });
  const token = acct && openToken(acct.token);
  return token ? { token, login: acct!.login } : null;
}

/** Whoever can read this repository on the project's behalf: you, then the lead, then anyone on the team. */
async function tokenForProject(meId: string, project: { id: string; workspaceId: string; leadId: string | null }) {
  for (const userId of [meId, project.leadId]) {
    const t = userId && await tokenFor(userId);
    if (t) return { ...t, userId: userId! };
  }
  const others = await db.githubAccount.findMany({ where: { user: projectPeople(project) }, select: { userId: true } });
  for (const { userId } of others) {
    const t = await tokenFor(userId);
    if (t) return { ...t, userId };
  }
  return null;
}

/** Cards from a different repository can't keep their numbers, or its issue #12 would land on this repository's #12. */
async function forgetOtherRepoNumbers(projectId: string, repo: string) {
  await db.issue.updateMany({
    where: { projectId, githubNumber: { not: null }, devActivity: { none: { kind: "ISSUE", repo: { equals: repo, mode: "insensitive" } } } },
    data: { githubNumber: null, githubSeenHash: null },
  });
}

/** GitHub said the token is no good (revoked, or the app was removed): forget it. */
async function dropToken(userId: string) {
  await db.githubAccount.deleteMany({ where: { userId } });
}

/** Repositories the person can add a webhook to (they need admin rights on it). */
export async function listGithubRepos(): Promise<{ repos?: { name: string; private: boolean; pushedAt: string | null }[]; error?: string; reconnect?: boolean }> {
  const me = await requireEditor();
  const t = await tokenFor(me.id);
  if (!t) return { reconnect: true, error: "Connect your GitHub account first." };
  try {
    const repos: Repo[] = [];
    for (let page = 1; page <= 5; page++) {
      const batch = await gh<Repo[]>(t.token, `/user/repos?per_page=100&page=${page}&sort=pushed&affiliation=owner,collaborator,organization_member`);
      repos.push(...batch);
      if (batch.length < 100) break;
    }
    return { repos: repos.filter((r) => r.permissions?.admin).map((r) => ({ name: r.full_name, private: r.private, pushedAt: r.pushed_at })) };
  } catch (e) {
    if (e instanceof GithubError && e.status === 401) { await dropToken(me.id); return { reconnect: true, error: "GitHub access has expired. Connect again." }; }
    return { error: e instanceof Error ? e.message : "Couldn't load your repositories" };
  }
}

/** Adds Ruvano's webhook to the repository (or updates it if one already points here) and links it to the project. */
export async function connectGithubRepo(projectId: string, repo: string): Promise<{ error?: string }> {
  const { user: me } = await requireProjectManager(projectId);
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return { error: "Pick a repository from the list" };
  const t = await tokenFor(me.id);
  if (!t) return { error: "Connect your GitHub account first." };
  // Each project gets its own secret, so no other workspace can forge deliveries for it.
  const secret = randomBytes(32).toString("hex");
  const config = { url: githubWebhookUrl(), content_type: "json", secret, insecure_ssl: "0" };
  try {
    const hooks = await gh<Hook[]>(t.token, `/repos/${repo}/hooks?per_page=100`);
    const existing = hooks.find((h) => h.config.url === config.url);
    const hook = existing
      ? await gh<Hook>(t.token, `/repos/${repo}/hooks/${existing.id}`, { method: "PATCH", body: { active: true, events: EVENTS, config } })
      : await gh<Hook>(t.token, `/repos/${repo}/hooks`, { method: "POST", body: { name: "web", active: true, events: EVENTS, config } });
    await db.project.update({ where: { id: projectId }, data: { githubRepo: repo, githubHookId: String(hook.id), githubSecret: sealToken(secret), githubLastEventAt: null, githubLastEventType: null, githubIssuesSyncedAt: null } });
    await forgetOtherRepoNumbers(projectId, repo);
    revalidatePath("/", "layout");
    return {};
  } catch (e) {
    if (e instanceof GithubError) {
      if (e.status === 401) { await dropToken(me.id); return { error: "GitHub access has expired. Connect again." }; }
      if (e.status === 404 || e.status === 403) return { error: `You need admin rights on ${repo} to add a webhook. If it's an organisation repo, the organisation may also need to approve Ruvano.` };
      if (e.status === 422) return { error: `GitHub refused the webhook: ${e.message}. Is ${githubWebhookUrl()} reachable from the internet?` };
    }
    return { error: e instanceof Error ? e.message : "Couldn't connect the repository" };
  }
}

/**
 * "Is this actually working?" Asks GitHub to send a test delivery, then reads back what GitHub
 * recorded for the webhook. Anyone who can run the project can check, as long as they've
 * authorised GitHub themselves; otherwise it reports only what Ruvano has seen.
 */
export async function checkGithubConnection(projectId: string): Promise<{ state: "ok" | "failing" | "unknown"; message: string }> {
  const { user: me, project } = await requireProjectManager(projectId);
  if (!project.githubRepo || !project.githubHookId) return { state: "unknown", message: "No repository is connected." };
  const t = await tokenFor(me.id);
  if (!t) return { state: "unknown", message: "Connect your own GitHub account to run a test." };
  const path = `/repos/${project.githubRepo}/hooks/${project.githubHookId}`;
  try {
    // Repositories connected before issues were synced need this event added.
    await gh(t.token, path, { method: "PATCH", body: { add_events: ["issues"] } }).catch(() => {});
    await gh(t.token, `${path}/pings`, { method: "POST" });
    await new Promise((r) => setTimeout(r, 2500)); // give GitHub a moment to deliver it
    const hook = await gh<{ active: boolean; last_response?: { code: number | null; status: string; message: string | null } }>(t.token, path);
    const fresh = await db.project.findUniqueOrThrow({ where: { id: projectId }, select: { githubLastEventAt: true } });
    revalidatePath("/", "layout");
    if (fresh.githubLastEventAt && Date.now() - fresh.githubLastEventAt.getTime() < 15000) return { state: "ok", message: "Working. GitHub reached Ruvano just now." };
    const code = hook.last_response?.code;
    if (code && code >= 200 && code < 300) return { state: "ok", message: "Working. GitHub reports a successful delivery." };
    if (code === 401) return { state: "failing", message: "GitHub reached Ruvano, but the secret didn't match. Disconnect and connect the repository again." };
    if (code) return { state: "failing", message: `GitHub reached Ruvano but got an error (${code}). Check the repository's Settings → Webhooks → Recent Deliveries.` };
    return { state: "failing", message: `GitHub couldn't reach ${githubWebhookUrl()}. Ruvano must be on a public address.` };
  } catch (e) {
    if (e instanceof GithubError && e.status === 404) return { state: "failing", message: "The webhook is gone from the repository. Disconnect and connect it again." };
    if (e instanceof GithubError && (e.status === 401 || e.status === 403)) return { state: "unknown", message: "Your GitHub account can't test this repository. Someone with admin rights on it can." };
    return { state: "unknown", message: "Couldn't reach GitHub to run the test. Try again." };
  }
}

/** No OAuth app on this server: link a repository by hand, with a secret made for this project. */
export async function linkRepoByHand(projectId: string, repo: string): Promise<{ error?: string; secret?: string; url?: string }> {
  await requireProjectManager(projectId);
  const name = repo.trim().replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "").replace(/\/$/, "");
  if (!/^[\w.-]+\/[\w.-]+$/.test(name)) return { error: "Enter the repository as owner/name" };
  const secret = randomBytes(32).toString("hex");
  await db.project.update({ where: { id: projectId }, data: { githubRepo: name, githubHookId: null, githubSecret: sealToken(secret), githubLastEventAt: null, githubLastEventType: null, githubIssuesSyncedAt: null } });
  await forgetOtherRepoNumbers(projectId, name);
  revalidatePath("/", "layout");
  return { secret, url: githubWebhookUrl() };
}

/** Removes Ruvano's webhook from the repository (when it can) and unlinks the project. */
export async function disconnectGithubRepo(projectId: string): Promise<{ warning?: string }> {
  const { user: me, project } = await requireProjectManager(projectId);
  let warning: string | undefined;
  if (project.githubRepo && project.githubHookId) {
    const t = await tokenFor(me.id);
    try {
      if (!t) throw new Error("no token");
      await gh(t.token, `/repos/${project.githubRepo}/hooks/${project.githubHookId}`, { method: "DELETE" });
    } catch (e) {
      if (!(e instanceof GithubError && e.status === 404)) {
        warning = `Unlinked, but Ruvano couldn't remove its webhook from ${project.githubRepo}. Remove it in the repository's Settings → Webhooks.`;
      }
    }
  }
  await db.project.update({ where: { id: projectId }, data: { githubRepo: null, githubHookId: null, githubSecret: null, githubLastEventAt: null, githubLastEventType: null, githubIssuesSyncedAt: null } });
  revalidatePath("/", "layout");
  return { warning };
}

/**
 * Pulls issues from GitHub onto the board, for when people want them now, or the webhook missed some.
 * The first run takes open issues. After that, whatever changed since the last run. One page per
 * call, oldest change first, so a big repository can carry on where the last call stopped.
 */
export async function fetchGithubIssues(projectId: string): Promise<{ added?: number; updated?: number; more?: boolean; error?: string; connect?: boolean }> {
  const me = await requireEditor();
  const project = await projectInWorkspace(me, projectId);
  if (!project.githubRepo) return { error: "No repository is connected to this project." };
  if (!project.githubIssueSync) return { error: "GitHub issues are turned off for this project." };
  const t = await tokenForProject(me.id, project);
  if (!t) return { error: "Connect a GitHub account to fetch issues.", connect: true };
  const since = project.githubIssuesSyncedAt;
  const query = since ? `state=all&since=${encodeURIComponent(since.toISOString())}` : "state=open";
  try {
    // Repositories connected before issues were synced need this event added, or new issues only arrive on a fetch.
    if (project.githubHookId) await gh(t.token, `/repos/${project.githubRepo}/hooks/${project.githubHookId}`, { method: "PATCH", body: { add_events: ["issues"] } }).catch(() => {});
    const page = await gh<GithubIssue[]>(t.token, `/repos/${project.githubRepo}/issues?${query}&sort=updated&direction=asc&per_page=${ISSUES_PER_CALL}`);
    let added = 0, updated = 0;
    for (const issue of page) {
      const result = await syncGithubIssue(project.id, issue);
      if (result === "added") added++;
      if (result === "updated") updated++;
    }
    const last = page.at(-1)?.updated_at ? new Date(page.at(-1)!.updated_at!) : null;
    // Stop if a full page didn't move time forward, or the same page would come back for ever.
    const more = page.length === ISSUES_PER_CALL && !!last && (!since || last > since);
    // A minute of overlap: anything changed while this ran is picked up next time, and repeats do no harm.
    await db.project.update({ where: { id: project.id }, data: { githubIssuesSyncedAt: more ? last : new Date(Date.now() - 60000) } });
    revalidatePath("/", "layout");
    return { added, updated, more };
  } catch (e) {
    if (e instanceof GithubError && e.status === 401) {
      await dropToken(t.userId);
      return t.userId === me.id ? { error: "GitHub access has expired. Connect again.", connect: true } : { error: "GitHub access has expired. Whoever connected it needs to connect again." };
    }
    if (e instanceof GithubError && (e.status === 403 || e.status === 404)) return { error: `GitHub won't show the issues of ${project.githubRepo} to this account.` };
    return { error: "Couldn't reach GitHub. Try again." };
  }
}

export async function setGithubIssueSync(projectId: string, on: boolean) {
  await requireProjectManager(projectId);
  await db.project.update({ where: { id: projectId }, data: { githubIssueSync: on } });
  revalidatePath("/", "layout");
}

export async function setGithubCloseOnDone(projectId: string, on: boolean) {
  await requireProjectManager(projectId);
  await db.project.update({ where: { id: projectId }, data: { githubCloseOnDone: on } });
  revalidatePath("/", "layout");
}

/** Forgets the person's GitHub authorisation (to switch to another GitHub account). */
export async function forgetGithubAccount() {
  const me = await requireUser();
  await dropToken(me.id);
  revalidatePath("/", "layout");
}
