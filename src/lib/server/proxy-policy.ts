// Policy behind src/proxy.ts (Next 16 middleware): one cheap, optimistic job: redirect page requests
// with no Manager session cookie to /login. CSRF is NOT handled here: Manager
// issues a session-bound CSRF token (GET /api/v1/auth/csrf) that the client
// fetches and echoes. This is NOT authorisation: it only checks cookie
// presence; Manager validates the session and org/role on every call.
// /invitations is public on purpose: an invitation link must reach its page
// signed out, which then sends the visitor through GitHub sign-in and back to
// the same link (redirecting to /login here would drop the token).
// It also forwards /api/v1 and /auth to Manager (see rewriteToManager).
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { rewriteToManager } from "@/lib/server/manager-proxy";

const PUBLIC_PREFIXES = ["/login", "/auth", "/invitations", "/mock"];

export function routeRequest(req: NextRequest) {
  const rewrite = rewriteToManager(req);
  if (rewrite) return rewrite;

  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isApi = pathname.startsWith("/api/");

  if (!isPublic && !isApi && !req.cookies.get("of_session")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}
