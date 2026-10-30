// Create-organisation page: first onboarding step for a new user, also
// reachable from the org switcher. Bare layout: there may be no organisation
// to show a shell for yet. Text follows the visitor's language.
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreateOrgForm } from "@/components/create-org-form";
import { OnboardingSteps } from "@/components/onboarding-steps";
import { Logo } from "@/components/ui/logo";
import { getMessages } from "@/lib/i18n/server";
import { getConsoleSession, UnauthenticatedError } from "@/lib/server/manager";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMessages();
  return { title: t.onboarding.newOrgMeta };
}

export default async function NewOrgPage() {
  let session;
  try {
    session = await getConsoleSession();
  } catch (e) {
    if (e instanceof UnauthenticatedError) redirect("/login");
    throw e;
  }
  const { t } = await getMessages();
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/[0.07] blur-3xl" />
      <div className="relative w-full max-w-md animate-enter">
        <Logo size={36} className="mb-6 rounded-lg" />
        <div className="mb-8"><OnboardingSteps current={1} /></div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.onboarding.newOrgTitle}</h1>
        <p className="mt-1.5 text-sm text-muted">{t.onboarding.newOrgLede(session.me.display_name)}</p>
        <div className="mt-6 rounded-2xl border border-border bg-surface/80 p-6 shadow-2xl shadow-shadow backdrop-blur">
          <CreateOrgForm hasOrgs={session.orgs.length > 0} />
        </div>
      </div>
    </main>
  );
}
