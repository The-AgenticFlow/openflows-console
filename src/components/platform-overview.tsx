// PlatformOverview: fleet counts, items needing attention and template-release
// status for platform operators, separate from organisation administration.
// Reads Manager's /platform/overview (operators only; others get 403, shown as
// such, and older Managers get a "not available" state). Counts and statuses
// only: no credentials, tenant names or raw infrastructure identifiers. Text
// follows the active language.
"use client";

import type { ConsoleError } from "@/lib/client/api";
import { usePlatformOverview } from "@/lib/client/queries";
import { isUnsupported } from "@/lib/manager/contract";
import { useT } from "@/lib/preferences/client";

import { Badge, Card, CardHeader, EmptyState, ErrorNotice, NotAvailable, Skeleton, StatCard } from "./ui/primitives";

const n = (m: Record<string, number> | undefined, ...keys: string[]) => keys.reduce((sum, k) => sum + (m?.[k] ?? 0), 0);

export function PlatformOverview() {
  const { data, error, isPending, refetch } = usePlatformOverview();
  const { t } = useT();
  const p = t.platform;
  if (isPending) return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>;
  if (isUnsupported(error)) return <Card><NotAvailable title={p.unavailable} description={p.unavailableBody} /></Card>;
  if ((error as ConsoleError | null)?.status === 403) return <Card><EmptyState title={p.operatorsOnly} description={p.operatorsOnlyBody} /></Card>;
  if (error) return <ErrorNotice error={error as ConsoleError} onRetry={() => void refetch()} />;

  const failedTenants = n(data.tenants.by_state, "failed", "access_blocked");
  const attention = [
    { label: p.aTenants, count: failedTenants, tone: "danger" as const },
    { label: p.aOps, count: n(data.operations.by_state, "failed", "retryable_failed"), tone: "danger" as const },
    { label: p.aProvisioning, count: n(data.organizations.by_status, "provisioning"), tone: "warning" as const },
    { label: p.aSuspended, count: n(data.organizations.by_status, "suspended"), tone: "warning" as const },
    { label: p.aGithub, count: n(data.github_connections.by_status, "suspended", "disconnected"), tone: "warning" as const },
    { label: p.aOutbox, count: data.outbox_pending, tone: "warning" as const },
  ].filter((a) => a.count > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={p.orgs} value={data.organizations.total} hint={p.ready(n(data.organizations.by_status, "ready"))} />
        <StatCard label={p.tenants} value={data.tenants.total} />
        <StatCard label={p.running} value={n(data.tenants.by_state, "running")} tone="success" />
        <StatCard label={p.failedBlocked} value={failedTenants} tone={failedTenants ? "danger" : "neutral"} />
      </div>
      <Card>
        <CardHeader title={p.attention} description={p.attentionBody} />
        {attention.length === 0 ? <EmptyState title={p.allClear} description={p.allClearBody} /> : (
          <ul className="divide-y divide-border">{attention.map((a) => <li key={a.label} className="flex items-center justify-between gap-4 px-5 py-3.5"><span className="text-sm">{a.label}</span><Badge tone={a.tone}>{a.count}</Badge></li>)}</ul>
        )}
      </Card>
      <Card>
        <CardHeader title={p.releases} />
        {data.templates.length === 0 ? <EmptyState title={p.noReleases} description={p.noReleasesBody} /> : (
          <ul className="divide-y divide-border">{data.templates.map((r) => <li key={r.version} className="flex items-center justify-between gap-4 px-5 py-3.5"><div><p className="font-mono text-sm">v{r.version}</p><p className="text-xs text-muted">{p.tenantCount(r.tenants)}</p></div><Badge tone={r.status === "approved" ? "success" : r.status === "retired" ? "neutral" : "info"}>{r.status}</Badge></li>)}</ul>
        )}
      </Card>
    </div>
  );
}
