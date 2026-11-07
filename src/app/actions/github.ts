"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { GithubError, gh, githubWebhookSecret, githubWebhookUrl, openToken } from "@/lib/githubOAuth";

type Repo = { full_name: string; private: boolean; pushed_at: string | null; permissions?: { admin?: boolean } };
type Hook = { id: number; config: { url?: string } };

const EVENTS = ["push", "pull_request", "create"];

/** The signed-in person's GitHub token, or null if they haven't connected (or it no longer works). */
async function tokenFor(userId: string) {
  const acct = await db.githubAccount.findUnique({ where: { userId } });
  const token = acct && openToken(acct.token);
  return token ? { token, login: acct!.login } : null;
}

/** GitHub said the token is no good (revoked, or the app was removed): forget it. */
async function dropToken(userId: string) {
  await db.githubAccount.deleteMany({ where: { userId } });
}

/** Repositories the person can add a webhook to (they need admin rights on it). */
export async function listGithubRepos(): Promise<{ repos?: { name: string; private: boolean; pushedAt: string | null }[]; error?: string; reconnect?: boolean }> {
  const me = await requireUser();
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

/** Adds Karya's webhook to the repository (or updates it if one already points here) and links it to the project. */
export async function connectGithubRepo(projectId: string, repo: string): Promise<{ error?: string }> {
  const me = await requireUser();
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return { error: "Pick a repository from the list" };
  const t = await tokenFor(me.id);
  if (!t) return { error: "Connect your GitHub account first." };
  const secret = githubWebhookSecret();
  if (!secret) return { error: "The server needs AUTH_SECRET set before GitHub can be connected." };
  const config = { url: githubWebhookUrl(), content_type: "json", secret, insecure_ssl: "0" };
  try {
    const hooks = await gh<Hook[]>(t.token, `/repos/${repo}/hooks?per_page=100`);
    const existing = hooks.find((h) => h.config.url === config.url);
    const hook = existing
      ? await gh<Hook>(t.token, `/repos/${repo}/hooks/${existing.id}`, { method: "PATCH", body: { active: true, events: EVENTS, config } })
      : await gh<Hook>(t.token, `/repos/${repo}/hooks`, { method: "POST", body: { name: "web", active: true, events: EVENTS, config } });
    await db.project.update({ where: { id: projectId }, data: { githubRepo: repo, githubHookId: String(hook.id) } });
    revalidatePath("/", "layout");
    return {};
  } catch (e) {
    if (e instanceof GithubError) {
      if (e.status === 401) { await dropToken(me.id); return { error: "GitHub access has expired. Connect again." }; }
      if (e.status === 404 || e.status === 403) return { error: `You need admin rights on ${repo} to add a webhook. If it's an organisation repo, the organisation may also need to approve Karya.` };
      if (e.status === 422) return { error: `GitHub refused the webhook: ${e.message}. Is ${githubWebhookUrl()} reachable from the internet?` };
    }
    return { error: e instanceof Error ? e.message : "Couldn't connect the repository" };
  }
}

/** Removes Karya's webhook from the repository (when it can) and unlinks the project. */
export async function disconnectGithubRepo(projectId: string): Promise<{ warning?: string }> {
  const me = await requireUser();
  const project = await db.project.findUniqueOrThrow({ where: { id: projectId }, select: { githubRepo: true, githubHookId: true } });
  let warning: string | undefined;
  if (project.githubRepo && project.githubHookId) {
    const t = await tokenFor(me.id);
    try {
      if (!t) throw new Error("no token");
      await gh(t.token, `/repos/${project.githubRepo}/hooks/${project.githubHookId}`, { method: "DELETE" });
    } catch (e) {
      if (!(e instanceof GithubError && e.status === 404)) {
        warning = `Unlinked, but Karya couldn't remove its webhook from ${project.githubRepo}. Remove it in the repository's Settings → Webhooks.`;
      }
    }
  }
  await db.project.update({ where: { id: projectId }, data: { githubRepo: null, githubHookId: null } });
  revalidatePath("/", "layout");
  return { warning };
}

/** Forgets the person's GitHub authorisation (to switch to another GitHub account). */
export async function forgetGithubAccount() {
  const me = await requireUser();
  await dropToken(me.id);
  revalidatePath("/", "layout");
}
