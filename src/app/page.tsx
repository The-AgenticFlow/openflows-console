// Root: chooses where a signed-in user lands. No organisation yet → create
// one; otherwise → their first organisation. Query params are forwarded.
import { redirect } from "next/navigation";

import { getConsoleSession, UnauthenticatedError } from "@/lib/server/manager";

export default async function Home({ searchParams }: Readonly<{ searchParams: Promise<Record<string, string>> }>) {
  let orgs;
  try {
    orgs = (await getConsoleSession()).orgs;
  } catch (e) {
    if (e instanceof UnauthenticatedError) redirect("/login");
    throw e;
  }
  if (orgs.length === 0) redirect("/orgs/new");
  const qs = new URLSearchParams(await searchParams).toString();
  redirect(`/o/${orgs[0].slug}${qs ? `?${qs}` : ""}`);
}
