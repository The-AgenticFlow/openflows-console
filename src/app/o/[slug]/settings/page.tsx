// Organisation settings page.
import type { Metadata } from "next";

import { SettingsPanel } from "@/components/settings-panel";
import { PageHeader } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMessages();
  return { title: t.settings.metaTitle };
}

export default async function Page() {
  const { t } = await getMessages();
  return (
    <>
      <PageHeader title={t.settings.title} description={t.settings.description} />
      <SettingsPanel />
    </>
  );
}
