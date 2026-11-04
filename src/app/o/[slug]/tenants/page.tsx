// Tenants list page.
import type { Metadata } from "next";

import { CreateTenantButton, TenantList } from "@/components/tenant-list";
import { PageHeader } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMessages();
  return { title: t.tenants.metaTitle };
}

export default async function TenantsPage() {
  const { t } = await getMessages();
  return (
    <>
      <PageHeader title={t.tenants.title} description={t.tenants.description} action={<CreateTenantButton />} />
      <TenantList />
    </>
  );
}
