import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { appUrl } from "@/lib/appUrl";
import { exchangeCode, gh, githubOAuthConfigured, sealToken } from "@/lib/githubOAuth";

/**
 * Step 2 of "Connect GitHub": GitHub sends the person back here with a one-time code.
 * Check the state, swap the code for a token, store it encrypted, and return to the
 * project's settings where they pick a repository.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const jar = await cookies();
  const saved = jar.get("karya_gh_state")?.value ?? "";
  const [state, project = ""] = saved.split(".");
  const back = (status: string) => {
    const res = NextResponse.redirect(`${appUrl()}/${project ? `projects/${project}/settings` : "projects"}?github=${status}#github`);
    res.cookies.delete({ name: "karya_gh_state", path: "/api/github" });
    return res;
  };

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(`${appUrl()}/login`);
  if (!githubOAuthConfigured()) return back("not-configured");
  if (params.get("error")) return back(params.get("error") === "access_denied" ? "cancelled" : "error");

  const given = params.get("state") ?? "";
  const ok = !!state && given.length === state.length && timingSafeEqual(Buffer.from(given), Buffer.from(state));
  if (!ok || !params.get("code")) return back("expired");

  try {
    const { token, scope } = await exchangeCode(params.get("code")!);
    const me = await gh<{ login: string }>(token, "/user");
    await db.githubAccount.upsert({
      where: { userId: user.id },
      create: { userId: user.id, login: me.login, token: sealToken(token), scope },
      update: { login: me.login, token: sealToken(token), scope },
    });
    return back("authorised");
  } catch (e) {
    console.error("GitHub connect failed:", e);
    return back("error");
  }
}
