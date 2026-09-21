import { AddTenantForm } from "@/components/add-tenant-form";
import { PageHeader } from "@/components/page-header";
import { TenantList } from "@/components/tenant-list";

// Tenants route: lists OpenFlows tenants discovered by the data layer. Mutating
// tenant management actions are handled by later CLI-bridge issues.

export default function TenantsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <PageHeader
        title="Tenants"
        description="Manage your multi-tenant workspaces and their resources."
      />
      <div className="mb-6">
        <AddTenantForm />
      </div>
      <TenantList />
    </div>
  );
}
