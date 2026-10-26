// Tenants list page.
import type { Metadata } from "next";

import { CreateTenantButton, TenantList } from "@/components/tenant-list";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Tenants" };

export default function TenantsPage() {
  return (
    <>
      <PageHeader
        title="Tenants"
        description="OpenFlows runtimes, one per GitHub repository."
        action={<CreateTenantButton />}
      />
      <TenantList />
    </>
  );
}
