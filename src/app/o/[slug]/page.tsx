// Organisation overview (dashboard). The server component supplies any
// GitHub-callback notice in the visitor's language; the greeting header and
// all data-driven content live in the client Dashboard.
import type { Metadata } from "next";

import { Dashboard } from "@/components/dashboard";
import { GithubInstallContinue } from "@/components/github-install-continue";
import { getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMessages();
  return { title: t.overview.metaTitle };
}

export default async function OrgOverview({ params, searchParams }: Readonly<{ params: Promise<{ slug: string }>; searchParams: Promise<{ connection?: string; github?: string }> }>) {
  const [{ connection, github }, { slug }, { t }] = await Promise.all([searchParams, params, getMessages()]);
  const notice = connection === "connected" ? { tone: "success", text: t.overview.githubConnected } : github ? { tone: "warning", text: t.overview.githubIncomplete } : null;
  return (
    <>
      {connection === "pending" ? <GithubInstallContinue githubHref={`/o/${slug}/github`} /> : null}
      {notice ? <p role="status" className={`mb-4 rounded-lg px-4 py-3 text-sm ${notice.tone === "success" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>{notice.text}</p> : null}
      <Dashboard />
    </>
  );
}
