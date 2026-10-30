// TenantDetail: one tenant's full picture. A header with name, state and the
// lifecycle actions; summary tiles (current state, target state, fleet size,
// workspaces); the latest operation (progress or failure recovery, from
// Manager's tenant status endpoint so it survives reloads); the runtime
// workspaces by state; identifiers to share with support; and a plain
// explanation of each lifecycle action. A tenant that no longer exists (e.g.
// just deleted) shows a friendly terminal state, not an error.
"use client";

import { useState } from "react";

import type { ConsoleError } from "@/lib/client/api";
import { useTenant, useTenantStatus } from "@/lib/client/queries";
import { canOperate, type TenantAction } from "@/lib/manager/contract";
import { useT } from "@/lib/preferences/client";

import { OperationProgress } from "./operation-progress";
import { useConsole } from "./shell/console-context";
import { TenantActions } from "./tenant-actions";
import { StateBadge, useStateName } from "./tenant-status";
import { LinkButton } from "./ui/button";
import { IconActivity, IconBoxes, IconCircleDot, IconInfo, IconPlay, IconTerminal } from "./ui/icons";
import { Card, CardHeader, EmptyState, ErrorNotice, Field, Skeleton, StatCard } from "./ui/primitives";

const ACTIONS: TenantAction[] = ["start", "stop", "clean", "delete"];

export function TenantDetail({ tenantId }: Readonly<{ tenantId: string }>) {
  const { org, orgId, role } = useConsole();
  const { t } = useT();
  const stateName = useStateName();
  const tenant = useTenant(orgId, tenantId);
  const status = useTenantStatus(orgId, tenantId);
  const [started, setStarted] = useState<string | null>(null);
  const listHref = `/o/${org.slug}/tenants`;

  if (tenant.isPending) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      </div>
    );
  }
  if (tenant.error) {
    const e = tenant.error as ConsoleError;
    if (e.status === 404 || e.code === "RESOURCE_NOT_FOUND") {
      return <Card><EmptyState title={t.tenant.notFound} description={t.tenant.notFoundBody} action={<LinkButton href={listHref}>{t.tenant.backToTenants}</LinkButton>} /></Card>;
    }
    return <ErrorNotice error={e} onRetry={() => void tenant.refetch()} />;
  }

  const tn = tenant.data;
  const operationId = started ?? status.data?.latest_operation?.id ?? null;
  const workspaces = status.data?.workspaces ?? [];
  const totalWorkspaces = workspaces.reduce((n, w) => n + w.count, 0);

  return (
    <div className="space-y-6">
      <section className="relative animate-enter overflow-hidden rounded-xl border border-border bg-surface p-6 shadow-sm shadow-shadow">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-muted text-accent"><IconBoxes size={22} /></span>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">{tn.slug}</h1>
                <StateBadge tenant={tn} />
              </div>
              <p className="mt-1 text-sm text-muted">{org.display_name} · <span className="font-mono text-xs">{tn.id.slice(0, 8)}</span></p>
            </div>
          </div>
          <TenantActions tenant={tn} onStarted={(id) => setStarted(id)} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t.tenant.observed} value={<span className="text-lg">{stateName(tn.observed_state)}</span>} icon={<IconCircleDot size={15} />} tone={tn.observed_state === "running" ? "success" : tn.observed_state === "failed" ? "danger" : "info"} />
        <StatCard label={t.tenant.desired} value={<span className="text-lg">{stateName(tn.desired_state)}</span>} icon={<IconPlay size={14} />} />
        <StatCard label={t.tenant.fleetSize} value={tn.fleet_size} icon={<IconBoxes size={15} />} />
        <StatCard label={t.tenant.workspaces} value={status.isPending ? <Skeleton className="h-7 w-10" /> : totalWorkspaces} icon={<IconTerminal size={15} />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          {operationId ? (
            <Card>
              <CardHeader title={t.tenant.latestOperation} description={t.tenant.latestOperationBody} icon={<IconActivity size={15} />} />
              <div className="p-5"><OperationProgress key={operationId} operationId={operationId} canRetry={canOperate(role)} /></div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title={t.tenant.runtime} description={t.tenant.runtimeBody} icon={<IconTerminal size={15} />} />
            {workspaces.length === 0 ? (
              <EmptyState title={t.tenant.noWorkspaces} description={t.tenant.noWorkspacesBody} />
            ) : (
              <ul className="divide-y divide-border">
                {workspaces.map((w) => (
                  <li key={w.state} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span>{stateName(w.state)}</span>
                    <span className="rounded-md bg-surface-muted px-2 py-0.5 font-mono text-xs tabular-nums">{w.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t.tenant.details} description={t.tenant.detailsBody} icon={<IconInfo size={15} />} />
            <dl className="divide-y divide-border px-5 py-4">
              <Field label={t.tenant.tenantId} copy={tn.id} mono>{tn.id.slice(0, 13)}…</Field>
              <Field label={t.tenant.repositoryId} copy={String(tn.github_repository_id)} mono>{String(tn.github_repository_id)}</Field>
              <Field label={t.tenant.organisation}>{org.display_name}</Field>
            </dl>
          </Card>

          <Card>
            <CardHeader title={t.tenant.lifecycle} description={t.tenant.lifecycleBody} />
            <dl className="divide-y divide-border">
              {ACTIONS.map((a) => (
                <div key={a} className="px-5 py-3">
                  <dt className={`text-sm font-medium ${a === "delete" ? "text-danger" : ""}`}>{t.tenant.actions[a].label}</dt>
                  <dd className="mt-0.5 text-[13px] leading-relaxed text-muted">{t.tenant.actions[a].effect}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
