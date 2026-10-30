// GitHub connection page for the active organisation.
import type { Metadata } from "next";

import { GithubConnection } from "@/components/github-connection";
import { PageHeader } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMessages();
  return { title: t.github.metaTitle };
}

export default async function GithubPage({ searchParams }: Readonly<{ searchParams: Promise<{ connected?: string }> }>) {
  const [{ connected }, { t }] = await Promise.all([searchParams, getMessages()]);
  return (
    <>
      <PageHeader title={t.github.title} description={t.github.description} />
      <div className="space-y-6">
        <GithubConnection justConnected={connected === "1"} />
      </div>
    </>
  );
}
