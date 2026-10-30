// Platform administration: fleet capacity, template releases and system
// health. Separate from organisation administration; Manager decides who may
// see it (this page only requires a session). Signed-out users go to /login.
// Text follows the visitor's language.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PlatformOverview } from "@/components/platform-overview";
import { Logo } from "@/components/ui/logo";
import { PageHeader } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n/server";
import { getConsoleSession, UnauthenticatedError } from "@/lib/server/manager";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMessages();
  return { title: t.platform.metaTitle };
}

export default async function PlatformPage() {
  let session;
  try {
    session = await getConsoleSession();
  } catch (e) {
    if (e instanceof UnauthenticatedError) redirect("/login");
    throw e;
  }
  const first = session.orgs[0];
  const { t } = await getMessages();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
      <div className="mb-6 flex items-center gap-3 text-sm">
        <Logo size={28} className="rounded-lg" />
        <span className="rounded-md border border-border-strong px-2 py-0.5 text-xs font-medium">{t.platform.badge}</span>
        {first ? <Link href={`/o/${first.slug}`} className="ml-auto text-muted hover:text-foreground">{t.platform.backConsole}</Link> : null}
      </div>
      <PageHeader title={t.platform.title} description={t.platform.description} />
      <PlatformOverview />
    </main>
  );
}
