// Shared handler for Manager's GitHub connection callbacks. GitHub redirects
// the browser to /api/v1/github/{oauth/callback,setup}; Manager completes the
// leg and answers with a redirect to `/api/v1/me?connection=…`, which would
// land the user on raw JSON. We run the leg server-side (forwarding the
// user's own cookies, no redirect following), then send the browser to the
// Console overview with the outcome. Manager remains the authority: we only
// translate where the user lands, never the result.
import { NextResponse } from "next/server";

import { getEnv } from "../config/env";

export async function completeGithubLeg(req: Request, managerPath: string): Promise<NextResponse> {
  const url = new URL(req.url);
  const res = await fetch(`${getEnv("OPENFLOWS_MANAGER_URL")}${managerPath}${url.search}`, {
    headers: { cookie: req.headers.get("cookie") ?? "", accept: "application/json" },
    redirect: "manual",
    cache: "no-store",
  }).catch(() => null);

  const location = res?.headers.get("location") ?? "";
  const outcome = /[?&]connection=(connected|pending)/.exec(location)?.[1];
  if (outcome) return NextResponse.redirect(new URL(`/?connection=${outcome}`, url));
  // Manager answers AUTH_FAILED with 401 for bad callback params too, so only a
  // missing session cookie means "sign in again".
  if (!/(?:^|;\s*)of_session=/.test(req.headers.get("cookie") ?? "")) return NextResponse.redirect(new URL("/login", url));
  return NextResponse.redirect(new URL("/?github=failed", url));
}
