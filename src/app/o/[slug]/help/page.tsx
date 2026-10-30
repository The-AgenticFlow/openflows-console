// Help page: guide, concepts, roles and permissions, troubleshooting,
// keyboard tips and support links. The searchable body is a client component
// (HelpCenter); this server page supplies the localised header and the
// operator-configured docs/support links (only those that are set).
import type { Metadata } from "next";

import { TourButton } from "@/components/guided-tour";
import { HelpCenter } from "@/components/help-center";
import { PageHeader } from "@/components/ui/primitives";
import { getLink } from "@/lib/config/env";
import { getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMessages();
  return { title: t.help.metaTitle };
}

export default async function HelpPage() {
  const { t } = await getMessages();
  return (
    <>
      <PageHeader title={t.help.title} description={t.help.description} action={<TourButton />} />
      <HelpCenter docsUrl={getLink("OPENFLOWS_DOCS_URL")} supportUrl={getLink("OPENFLOWS_SUPPORT_URL")} />
    </>
  );
}
