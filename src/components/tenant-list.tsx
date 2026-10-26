// TenantList: the org's tenants with state and a link to each detail page.
// Polls while any tenant is provisioning/deleting. Operators (admin/developer)
// get the "Create tenant" entry point; viewers see the list read-only.
"use client";

import Link from "next/link";

import type { ConsoleError } from "@/lib/client/api";
import { useTenants } from "@/lib/client/queries";
import { canOperate } from "@/lib/manager/contract";

import { useConsole } from "./shell/console-context";
import { StateBadge } from "./tenant-status";
import { LinkButton } from "./ui/button";
import { Card, EmptyState, ErrorNotice } from "./ui/primitives";

export function TenantList() {
  const { org, orgId, role } = useConsole();
  const { data, error, isPending, refetch } = useTenants(orgId);

  if (isPending) {
    return <Card><div className="space-y-4 p-5" aria-busy="true" aria-label="Loading tenants">{[0, 1, 2].map((i) => <div key={i} className="h-5 animate-pulse rounded bg-surface-muted" />)}</div></Card>;
  }
  if (error) return <ErrorNotice error={error as ConsoleError} onRetry={() => void refetch()} />;

  return (
    <Card>
      {data.items.length === 0 ? (
        <EmptyState
          title="No tenants yet"
          description="A tenant is an OpenFlows runtime bound to one GitHub repository."
          action={canOperate(role) ? <LinkButton href={`/o/${org.slug}/tenants/new`} variant="primary">Create tenant</LinkButton> : undefined}
        />
      ) : (
        <ul className="divide-y divide-border">
          {data.items.map((t) => (
            <li key={t.id}>
              <Link href={`/o/${org.slug}/tenants/${t.id}`} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-4 hover:bg-surface-muted">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{t.slug}</span>
                  <span className="block text-xs text-muted">Fleet size {t.fleet_size}</span>
                </span>
                <StateBadge tenant={t} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Header action: admins and developers only (Manager enforces). */
export function CreateTenantButton() {
  const { org, role } = useConsole();
  return canOperate(role) ? <LinkButton href={`/o/${org.slug}/tenants/new`} variant="primary">Create tenant</LinkButton> : null;
}
