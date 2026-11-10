// Proxy (Next 16 middleware): one cheap, optimistic job: redirect page requests
// with no Manager session cookie to /login. CSRF is NOT handled here: Manager
// issues a session-bound CSRF token (GET /api/v1/auth/csrf) that the client
// fetches and echoes. This is NOT authorisation: it only checks cookie
// presence; Manager validates the session and org/role on every call.
// /invitations is public on purpose: an invitation link must reach its page
// signed out, which then sends the visitor through GitHub sign-in and back to
// the same link (redirecting to /login here would drop the token).
// It also forwards /api/v1 and /auth to Manager. That forwarding lives here, not
// in next.config.ts rewrites, because rewrites are frozen at `next build`: a
// prebuilt image (GHCR) would ignore OPENFLOWS_MANAGER_URL set at `docker run`.
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getEnv } from "@/lib/config/env";

const PUBLIC_PREFIXES = ["/login", "/auth", "/invitations", "/mock"];

// Served by the Console's own route handlers (src/app/api/v1/github), so they
// must not be forwarded to Manager.
const OWN_API_PREFIXES = ["/api/v1/github"];

function isManagerPath(pathname: string): boolean {
  const forwarded = pathname.startsWith("/api/v1/") || pathname.startsWith("/auth/");
  return forwarded && !OWN_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isManagerPath(pathname)) {
    return NextResponse.rewrite(new URL(`${pathname}${search}`, getEnv("OPENFLOWS_MANAGER_URL")));
  }

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isApi = pathname.startsWith("/api/");

  if (!isPublic && !isApi && !req.cookies.get("of_session")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png).*)"],
};
