// Create-organisation page: first onboarding step for a new user, also
// reachable from the org switcher. Bare layout: there may be no organisation
// to show a shell for yet.
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreateOrgForm } from "@/components/create-org-form";
import { OnboardingSteps } from "@/components/onboarding-steps";
import { Logo } from "@/components/ui/logo";
import { getConsoleSession, UnauthenticatedError } from "@/lib/server/manager";

export const metadata: Metadata = { title: "Create organisation" };

export default async function NewOrgPage() {
  let session;
  try {
    session = await getConsoleSession();
  } catch (e) {
    if (e instanceof UnauthenticatedError) redirect("/login");
    throw e;
  }
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Logo size={36} className="mb-6 rounded-lg" />
        <div className="mb-8"><OnboardingSteps current={1} /></div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your organisation</h1>
        <p className="mt-1.5 text-sm text-muted">
          Welcome, {session.me.display_name}. An organisation groups your members, GitHub connection and tenants. It takes about a minute to get your first tenant running.
        </p>
        <div className="mt-6 rounded-xl border border-border bg-surface p-6">
          <CreateOrgForm hasOrgs={session.orgs.length > 0} />
        </div>
      </div>
    </main>
  );
}
