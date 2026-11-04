// Account page: the signed-in person's profile, preferences (theme,
// language), Coder account link, organisations and session.
import type { Metadata } from "next";

import { AccountPanel } from "@/components/account-panel";
import { PageHeader } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMessages();
  return { title: t.account.metaTitle };
}

export default async function Page() {
  const { t } = await getMessages();
  return (
    <>
      <PageHeader title={t.account.title} description={t.account.description} />
      <AccountPanel />
    </>
  );
}
