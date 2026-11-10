// Forwards /api/v1 and /auth to OpenFlows Manager. Called from src/proxy.ts.
// This is a proxy rewrite, not a next.config.ts rewrite, because rewrites are
// frozen at `next build`: a prebuilt image (GHCR) would ignore
// OPENFLOWS_MANAGER_URL set at `docker run`. getEnv() reads it on each request.
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getEnv } from "@/lib/config/env";

// Served by the Console's own route handlers (src/app/api/v1/github), so they
// must not be forwarded to Manager.
const OWN_API_PREFIXES = ["/api/v1/github"];

function isManagerPath(pathname: string): boolean {
  const forwarded = pathname.startsWith("/api/v1/") || pathname.startsWith("/auth/");
  return forwarded && !OWN_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** A rewrite to Manager for paths it owns, or null for everything else. */
export function rewriteToManager(req: NextRequest): NextResponse | null {
  const { pathname, search } = req.nextUrl;
  if (!isManagerPath(pathname)) return null;
  return NextResponse.rewrite(new URL(`${pathname}${search}`, getEnv("OPENFLOWS_MANAGER_URL")));
}
