// Tenant creation wizard page.
import type { Metadata } from "next";

import { TenantCreateWizard } from "@/components/tenant-create-wizard";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Create tenant" };

export default function NewTenantPage() {
  return (
    <>
      <PageHeader title="Create tenant" description="Bind an OpenFlows runtime to one of your repositories." />
      <TenantCreateWizard />
    </>
  );
}
