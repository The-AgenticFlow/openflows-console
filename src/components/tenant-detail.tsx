// TenantDetail: one tenant's state, runtime workspaces, configuration,
// lifecycle actions, and the latest operation (progress or failure recovery).
// The latest operation comes from Manager's tenant status endpoint, so it
// survives reloads. A tenant that no longer exists (e.g. just deleted) shows a
// friendly terminal state, not an error.
"use client";

import { useState } from "react";

import type { ConsoleError } from "@/lib/client/api";
import { useTenant, useTenantStatus } from "@/lib/client/queries";
import { canOperate } from "@/lib/manager/contract";

import { OperationProgress } from "./operation-progress";
import { useConsole } from "./shell/console-context";
import { TenantActions } from "./tenant-actions";
import { StateBadge } from "./tenant-status";
import { LinkButton } from "./ui/button";
import { Card, CardHeader, EmptyState, ErrorNotice } from "./ui/primitives";

export function TenantDetail({ tenantId }: Readonly<{ tenantId: string }>) {
  const { org, orgId, role } = useConsole();
  const tenant = useTenant(orgId, tenantId);
  const status = useTenantStatus(orgId, tenantId);
  const [started, setStarted] = useState<string | null>(null);
  const listHref = `/o/${org.slug}/tenants`;

  if (tenant.isPending) return <Card><div className="h-32 animate-pulse p-5" aria-busy="true" /></Card>;
  if (tenant.error) {
    const e = tenant.error as ConsoleError;
    if (e.status === 404 || e.code === "RESOURCE_NOT_FOUND") {
      return <Card><EmptyState title="Tenant not found" description="It may have been deleted, or it belongs to another organisation." action={<LinkButton href={listHref}>Back to tenants</LinkButton>} /></Card>;
    }
    return <ErrorNotice error={e} onRetry={() => void tenant.refetch()} />;
  }

  const t = tenant.data;
  const operationId = started ?? status.data?.latest_operation?.id ?? null;
  const workspaces = status.data?.workspaces ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{t.slug}</h1>
              <StateBadge tenant={t} />
            </div>
            <p className="mt-1 text-sm text-muted">Fleet size {t.fleet_size}</p>
          </div>
          <TenantActions tenant={t} onStarted={(id) => setStarted(id)} />
        </div>
      </Card>

      {operationId ? (
        <Card>
          <CardHeader title="Latest operation" description="Progress is refreshed automatically." />
          <div className="p-5"><OperationProgress key={operationId} operationId={operationId} canRetry={canOperate(role)} /></div>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Runtime" description="Workspaces backing this tenant." />
        {workspaces.length === 0 ? (
          <EmptyState title="No workspaces yet" description="Workspaces appear once provisioning has started." />
        ) : (
          <ul className="divide-y divide-border">
            {workspaces.map((w) => (
              <li key={w.state} className="flex justify-between px-5 py-3 text-sm"><span className="capitalize">{w.state.replace(/_/g, " ")}</span><span className="text-muted">{w.count}</span></li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
