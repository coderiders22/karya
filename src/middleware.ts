import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const PUBLIC = ["/login", "/signup", "/forgot", "/join/", "/register", "/setup", "/reset", "/api/integrations/"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // The landing page plays the walkthrough with the sound off, so those files stay public.
  if (pathname === "/" || pathname.startsWith("/icon") || pathname.startsWith("/guide/videos/walkthrough.") || PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();
  const userId = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!userId) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
