// Server-side reads from Manager for layouts and pages. Server Components
// cannot use the browser rewrite, so they call Manager directly and forward
// the user's own cookies; Manager validates the session and scopes every
// response to what that user may see. Mutations never go through here: they
// are made by the browser (lib/client/api.ts) with CSRF and idempotency keys.
import { cookies } from "next/headers";

import { getEnv } from "../config/env";
import type { CursorPage, InvitationPreview, Me, OrgSummary } from "../manager/contract";

export class UnauthenticatedError extends Error {}
export class NotFoundError extends Error {}

/** Manager's browser session cookie (see Manager `routes/auth.rs`). */
const SESSION_COOKIE = "of_session";

/**
 * Where to send a visitor Manager no longer recognises: the sign-in page,
 * flagged "session expired" when they still carry a session cookie (a session
 * that ran out, such as Manager's 12-hour limit), so the page can say why.
 */
export async function signInPath(): Promise<string> {
  const jar = await cookies();
  return jar.has(SESSION_COOKIE) ? "/login?expired=1" : "/login";
}

async function get<T>(path: string): Promise<T> {
  const jar = await cookies();
  const cookie = jar.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const res = await fetch(`${getEnv("OPENFLOWS_MANAGER_URL")}${path}`, {
    headers: { cookie, accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 401) throw new UnauthenticatedError();
  if (res.status === 404) throw new NotFoundError();
  if (!res.ok) throw new Error(`Manager ${path} failed with ${res.status}`);
  return (await res.json()) as T;
}

/**
 * What the signed-in visitor's invitation offers, or "unavailable" when Manager
 * says 404 (wrong account, used, revoked, expired or unknown: it deliberately
 * does not say which). Throws UnauthenticatedError when signed out.
 */
export async function getInvitationPreview(token: string): Promise<InvitationPreview | "unavailable"> {
  try {
    return await get<InvitationPreview>(`/api/v1/invitations/preview?token=${encodeURIComponent(token)}`);
  } catch (e) {
    if (e instanceof NotFoundError) return "unavailable";
    throw e;
  }
}

export interface ConsoleSession {
  me: Me;
  orgs: OrgSummary[];
}

/** The signed-in user and their organisations; throws UnauthenticatedError if signed out. */
export async function getConsoleSession(): Promise<ConsoleSession> {
  const [me, orgs] = await Promise.all([get<Me>("/api/v1/me"), get<CursorPage<OrgSummary>>("/api/v1/organizations")]);
  return { me, orgs: orgs.items };
}
