// Server-side reads from Manager for layouts and pages. Server Components
// cannot use the browser rewrite, so they call Manager directly and forward
// the user's own cookies; Manager validates the session and scopes every
// response to what that user may see. Mutations never go through here: they
// are made by the browser (lib/client/api.ts) with CSRF and idempotency keys.
import { cookies } from "next/headers";

import { getEnv } from "../config/env";
import type { CursorPage, Me, OrgSummary } from "../manager/contract";

export class UnauthenticatedError extends Error {}

async function get<T>(path: string): Promise<T> {
  const jar = await cookies();
  const cookie = jar.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const res = await fetch(`${getEnv("OPENFLOWS_MANAGER_URL")}${path}`, {
    headers: { cookie, accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 401) throw new UnauthenticatedError();
  if (!res.ok) throw new Error(`Manager ${path} failed with ${res.status}`);
  return (await res.json()) as T;
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
