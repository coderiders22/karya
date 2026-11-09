import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "crypto";
import { appUrl } from "./appUrl";

/**
 * One-click GitHub connection (OAuth App). A person authorises Ruvano once; Ruvano then lists the
 * repositories they administer and adds its webhook to the one they pick.
 *
 * Needs GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET. The OAuth App's callback URL must be
 * <APP_URL>/api/github/callback.
 */

export const githubOAuthConfigured = () => !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
export const githubCallbackUrl = () => `${appUrl()}/api/github/callback`;
export const githubWebhookUrl = () => `${appUrl()}/api/integrations/github`;

/** `repo` to see private repositories, `admin:repo_hook` to add and remove Ruvano's webhook. */
export const GITHUB_SCOPES = "repo admin:repo_hook";

/**
 * The secret GitHub signs webhook deliveries with. GITHUB_WEBHOOK_SECRET if set; otherwise derived
 * from AUTH_SECRET, so one-click connections work with no extra setting.
 */
export function githubWebhookSecret() {
  if (process.env.GITHUB_WEBHOOK_SECRET) return process.env.GITHUB_WEBHOOK_SECRET;
  if (!process.env.AUTH_SECRET) return "";
  return createHmac("sha256", process.env.AUTH_SECRET).update("karya:github-webhook").digest("hex");
}

// Access tokens are stored encrypted (AES-256-GCM) with a key derived from AUTH_SECRET.
const key = () => createHash("sha256").update(`${process.env.AUTH_SECRET ?? ""}:github-token`).digest();

export function sealToken(token: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(token, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function openToken(sealed: string): string | null {
  try {
    const [iv, tag, data] = sealed.split(".").map((p) => Buffer.from(p, "base64url"));
    const d = createDecipheriv("aes-256-gcm", key(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(data), d.final()]).toString("utf8");
  } catch {
    return null; // AUTH_SECRET changed, or the value was tampered with: treat as not connected
  }
}

export class GithubError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Calls the GitHub REST API as the connected person. */
export async function gh<T = unknown>(token: string, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  // GITHUB_API_URL is for GitHub Enterprise servers, and for testing without calling GitHub.
  const res = await fetch(`${process.env.GITHUB_API_URL ?? "https://api.github.com"}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Ruvano",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new GithubError(res.status, (json as { message?: string }).message ?? `GitHub returned ${res.status}`);
  return json as T;
}

/** Swaps the one-time code GitHub sends back for an access token. */
export async function exchangeCode(code: string) {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: githubCallbackUrl(),
    }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; scope?: string; error_description?: string };
  if (!json.access_token) throw new Error(json.error_description ?? "GitHub didn't return an access token");
  return { token: json.access_token, scope: json.scope ?? "" };
}
