// Tenant creation wizard page.
import type { Metadata } from "next";

import { TenantCreateWizard } from "@/components/tenant-create-wizard";
import { PageHeader } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMessages();
  return { title: t.wizard.metaTitle };
}

export default async function NewTenantPage() {
  const { t } = await getMessages();
  return (
    <>
      <PageHeader title={t.wizard.title} description={t.wizard.description} />
      <TenantCreateWizard />
    </>
  );
}
