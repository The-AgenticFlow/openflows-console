// Members, invitations and ownership page.
import type { Metadata } from "next";

import { MembersPanel } from "@/components/members-panel";
import { PageHeader } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMessages();
  return { title: t.members.metaTitle };
}

export default async function Page() {
  const { t } = await getMessages();
  return (
    <>
      <PageHeader title={t.members.title} description={t.members.description} />
      <MembersPanel />
    </>
  );
}
