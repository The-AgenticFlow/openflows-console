// Tenant detail page (stable, shareable URL within the organisation).
import type { Metadata } from "next";

import { TenantDetail } from "@/components/tenant-detail";

export const metadata: Metadata = { title: "Tenant" };

export default async function TenantPage({ params }: Readonly<{ params: Promise<{ tenantId: string }> }>) {
  const { tenantId } = await params;
  return <TenantDetail tenantId={tenantId} />;
}
