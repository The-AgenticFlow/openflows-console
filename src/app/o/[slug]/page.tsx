// Organisation overview (dashboard). Server component supplies the header and
// any GitHub-callback notice; the data-driven dashboard is a client component.
import type { Metadata } from "next";

import { Dashboard } from "@/components/dashboard";
import { GithubInstallContinue } from "@/components/github-install-continue";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Overview" };

export default async function OrgOverview({ params, searchParams }: Readonly<{ params: Promise<{ slug: string }>; searchParams: Promise<{ connection?: string; github?: string }> }>) {
  const { connection, github } = await searchParams;
  const notice = connection === "connected" ? { tone: "success", text: "GitHub connected." } : github ? { tone: "warning", text: "The GitHub connection was not completed. You can start it again from the GitHub page." } : null;
  const { slug } = await params;
  return (
    <>
      <PageHeader title="Overview" description="Fleet health, setup progress and recent activity." />
      {connection === "pending" ? <GithubInstallContinue githubHref={`/o/${slug}/github`} /> : null}
      {notice ? <p role="status" className={`mb-4 rounded-lg px-4 py-3 text-sm ${notice.tone === "success" ? "bg-success-soft text-success" : notice.tone === "info" ? "bg-info-soft text-info" : "bg-warning-soft text-warning"}`}>{notice.text}</p> : null}
      <Dashboard />
    </>
  );
}
