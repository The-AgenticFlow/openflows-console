// Platform administration: fleet capacity, template releases and system
// health. Separate from organisation administration; Manager decides who may
// see it (this page only requires a session). Signed-out users go to /login.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PlatformOverview } from "@/components/platform-overview";
import { Logo } from "@/components/ui/logo";
import { PageHeader } from "@/components/ui/primitives";
import { getConsoleSession, UnauthenticatedError } from "@/lib/server/manager";

export const metadata: Metadata = { title: "Platform" };

export default async function PlatformPage() {
  let session;
  try {
    session = await getConsoleSession();
  } catch (e) {
    if (e instanceof UnauthenticatedError) redirect("/login");
    throw e;
  }
  const first = session.orgs[0];
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
      <div className="mb-6 flex items-center gap-3 text-sm">
        <Logo size={28} className="rounded-lg" />
        <span className="rounded-md border border-border-strong px-2 py-0.5 text-xs font-medium">Platform</span>
        {first ? <Link href={`/o/${first.slug}`} className="ml-auto text-muted hover:text-foreground">Back to Console</Link> : null}
      </div>
      <PageHeader title="Platform" description="Fleet capacity, template releases and system health." />
      <PlatformOverview />
    </main>
  );
}
