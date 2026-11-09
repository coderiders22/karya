import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { appUrl } from "@/lib/appUrl";
import { GITHUB_SCOPES, githubCallbackUrl, githubOAuthConfigured } from "@/lib/githubOAuth";

/**
 * Step 1 of "Connect GitHub": send the person to GitHub to authorise Ruvano.
 * A random `state` in a short-lived cookie proves the callback answers this request.
 */
export async function GET(req: Request) {
  const project = (new URL(req.url).searchParams.get("project") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const back = `${appUrl()}/projects/${project}/github`;
  if (!(await getCurrentUser())) return NextResponse.redirect(`${appUrl()}/login`);
  if (!project) return NextResponse.redirect(`${appUrl()}/projects`);
  if (!githubOAuthConfigured()) return NextResponse.redirect(`${back}?github=not-configured`);

  const state = randomBytes(18).toString("base64url");
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID!);
  url.searchParams.set("redirect_uri", githubCallbackUrl());
  url.searchParams.set("scope", GITHUB_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("allow_signup", "false");

  const res = NextResponse.redirect(url);
  res.cookies.set("karya_gh_state", `${state}.${project}`, {
    httpOnly: true, sameSite: "lax", path: "/api/github", maxAge: 600,
    secure: appUrl().startsWith("https"),
  });
  return res;
}
