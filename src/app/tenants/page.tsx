import { PageHeader } from "@/components/page-header";

export default function TenantsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <PageHeader
        title="Tenants"
        description="Manage your multi-tenant workspaces and their resources."
      />
      <div className="rounded-lg border border-dashed border-border bg-surface p-12 text-center text-sm text-muted">
        Tenant management is coming soon.
      </div>
    </div>
  );
}
