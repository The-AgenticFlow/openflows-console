// Activity page: operations and audit history.
import type { Metadata } from "next";

import { ActivityView } from "@/components/activity-view";
import { PageHeader } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMessages();
  return { title: t.activity.metaTitle };
}

export default async function Page() {
  const { t } = await getMessages();
  return (
    <>
      <PageHeader title={t.activity.title} description={t.activity.description} />
      <ActivityView />
    </>
  );
}
