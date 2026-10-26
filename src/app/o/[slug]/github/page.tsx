// GitHub connection page for the active organisation.
import type { Metadata } from "next";

import { GithubConnection } from "@/components/github-connection";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "GitHub" };

export default async function GithubPage({ searchParams }: Readonly<{ searchParams: Promise<{ connected?: string }> }>) {
  const { connected } = await searchParams;
  return (
    <>
      <PageHeader title="GitHub" description="Connect repositories and keep the installation healthy." />
      <div className="space-y-6">
        <GithubConnection justConnected={connected === "1"} />
      </div>
    </>
  );
}
