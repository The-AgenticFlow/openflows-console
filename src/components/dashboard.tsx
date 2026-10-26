// Dashboard: the organisation overview. Stat cards summarise fleet health and
// the GitHub connection; below, the tenants table and a recent-activity feed.
// Manager has no operations-list endpoint, so activity is derived from each
// tenant's latest operation (via the tenant status endpoint) rather than faked.
"use client";

import Link from "next/link";

import type { ConsoleError } from "@/lib/client/api";
import { useConnections, useTenantActivity, useTenants } from "@/lib/client/queries";
import { canOperate, isOperationActive, tenantStateLabel } from "@/lib/manager/contract";

import { OnboardingChecklist } from "./onboarding-checklist";
import { useConsole } from "./shell/console-context";
import { StateBadge } from "./tenant-status";
import { LinkButton } from "./ui/button";
import { Badge, Card, CardHeader, EmptyState, ErrorNotice, Skeleton, StatCard } from "./ui/primitives";

export function Dashboard() {
  const { org, orgId, role } = useConsole();
  const tenants = useTenants(orgId);
  const conns = useConnections(orgId);
  const items = tenants.data?.items ?? [];
  const activity = useTenantActivity(orgId, items.slice(0, 6).map((t) => t.id));

  const running = items.filter((t) => t.observed_state === "running").length;
  const attention = items.filter((t) => tenantStateLabel(t).tone === "danger").length;
  const busy = items.filter((t) => ["provisioning", "deleting"].includes(t.observed_state)).length;
  const active = conns.data?.items.find((c) => c.status === "active");
  const ghLabel = conns.isPending ? "…" : active ? "Connected" : conns.data?.items.length ? "Needs attention" : "Not connected";

  const feed = activity.flatMap((q, i) => (q.data?.latest_operation ? [{ tenant: items[i], op: q.data.latest_operation }] : []));

  return (
    <div className="space-y-6">
      <OnboardingChecklist />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Tenants" value={tenants.isPending ? <Skeleton className="h-7 w-10" /> : items.length} hint={busy ? `${busy} in progress` : undefined} />
        <StatCard label="Running" value={tenants.isPending ? <Skeleton className="h-7 w-10" /> : running} tone={running ? "success" : "neutral"} />
        <StatCard label="Needs attention" value={tenants.isPending ? <Skeleton className="h-7 w-10" /> : attention} tone={attention ? "danger" : "neutral"} />
        <StatCard label="GitHub" value={<span className="text-lg">{ghLabel}</span>} tone={active ? "success" : conns.data?.items.length ? "warning" : "neutral"} hint={active?.account_login ?? undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Tenants" description="Your OpenFlows runtimes." action={<Link href={`/o/${org.slug}/tenants`} className="text-sm text-muted hover:text-foreground">View all</Link>} />
          {tenants.error ? (
            <div className="p-5"><ErrorNotice error={tenants.error as ConsoleError} onRetry={() => void tenants.refetch()} /></div>
          ) : tenants.isPending ? (
            <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-5" />)}</div>
          ) : items.length === 0 ? (
            <EmptyState title="No tenants yet" description="Create a tenant to bind an OpenFlows runtime to a GitHub repository." action={canOperate(role) ? <LinkButton href={`/o/${org.slug}/tenants/new`} variant="primary">Create tenant</LinkButton> : undefined} />
          ) : (
            <ul className="divide-y divide-border">
              {items.slice(0, 6).map((t) => (
                <li key={t.id}>
                  <Link href={`/o/${org.slug}/tenants/${t.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-muted/60">
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{t.slug}</span><span className="block text-xs text-muted">Fleet size {t.fleet_size}</span></span>
                    <StateBadge tenant={t} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent activity" description="Latest operation per tenant." />
          {feed.length === 0 ? (
            <EmptyState title="Nothing yet" description="Operations like provisioning and lifecycle actions appear here." />
          ) : (
            <ol className="divide-y divide-border">
              {feed.map(({ tenant, op }) => (
                <li key={op.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <Link href={`/o/${org.slug}/operations/${op.id}`} className="block truncate text-sm font-medium hover:underline">{tenant.slug}</Link>
                    <p className="text-xs text-muted">{isOperationActive(op.state) ? "In progress" : op.state === "succeeded" ? "Completed" : "Failed"}</p>
                  </div>
                  <Badge tone={op.state === "succeeded" ? "success" : isOperationActive(op.state) ? "info" : "danger"}>{op.state}</Badge>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
