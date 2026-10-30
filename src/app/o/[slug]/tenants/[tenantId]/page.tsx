// Tenant detail page (stable, shareable URL within the organisation).
import type { Metadata } from "next";

import { TenantDetail } from "@/components/tenant-detail";
import { getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMessages();
  return { title: t.tenant.metaTitle };
}

export default async function TenantPage({ params }: Readonly<{ params: Promise<{ tenantId: string }> }>) {
  const { tenantId } = await params;
  return <TenantDetail tenantId={tenantId} />;
}
