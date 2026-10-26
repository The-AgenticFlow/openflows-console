// Organisation shell layout. Resolves `[slug]` against the caller's own
// organisations from Manager (`GET /organizations`). A slug the user does not
// belong to is a plain 404, never "forbidden", so other organisations'
// existence is not confirmed. Signed-out users go to /login.
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ConsoleProvider } from "@/components/shell/console-context";
import { ConsoleShell } from "@/components/shell/console-shell";
import { getConsoleSession, UnauthenticatedError } from "@/lib/server/manager";

export default async function OrgLayout({
  children,
  params,
}: Readonly<{ children: ReactNode; params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  let session;
  try {
    session = await getConsoleSession();
  } catch (e) {
    if (e instanceof UnauthenticatedError) redirect("/login");
    throw e;
  }
  const org = session.orgs.find((o) => o.slug === slug);
  if (!org) notFound();

  return (
    <ConsoleProvider value={{ user: session.me, orgs: session.orgs, org }}>
      <ConsoleShell>{children}</ConsoleShell>
    </ConsoleProvider>
  );
}
