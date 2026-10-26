// Proxy (Next 16 middleware): one cheap, optimistic job: redirect page requests
// with no Manager session cookie to /login. CSRF is NOT handled here: Manager
// issues a session-bound CSRF token (GET /api/v1/auth/csrf) that the client
// fetches and echoes. This is NOT authorisation: it only checks cookie
// presence; Manager validates the session and org/role on every call.
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PREFIXES = ["/login", "/auth", "/mock"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
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
