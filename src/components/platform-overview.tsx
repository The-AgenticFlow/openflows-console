// PlatformOverview: fleet capacity, template-release status and system health
// for platform operators, separate from organisation administration. Manager
// does not serve /platform/overview yet, and answers `forbidden` to non
// operators; both are shown honestly (never faked data). Product-language
// summaries only: no credentials or raw infrastructure identifiers.
"use client";

import type { ConsoleError } from "@/lib/client/api";
import { usePlatformOverview } from "@/lib/client/queries";
import { isUnsupported } from "@/lib/manager/contract";

import { Badge, Card, CardHeader, EmptyState, ErrorNotice, NotAvailable, Skeleton, StatCard } from "./ui/primitives";

const HEALTH = { healthy: "success", degraded: "warning", down: "danger" } as const;

export function PlatformOverview() {
  const { data, error, isPending, refetch } = usePlatformOverview();
  if (isPending) return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>;
  if (isUnsupported(error)) return <Card><NotAvailable title="Platform overview" description="Fleet capacity, template releases and system health appear here once Manager exposes the platform overview." /></Card>;
  if ((error as ConsoleError | null)?.status === 403) return <Card><EmptyState title="Platform operators only" description="This area is separate from organisation administration." /></Card>;
  if (error) return <ErrorNotice error={error as ConsoleError} onRetry={() => void refetch()} />;
  const f = data.fleet;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Tenants" value={f.tenants_total} />
        <StatCard label="Running" value={f.running} tone="success" />
        <StatCard label="Failed" value={f.failed} tone={f.failed ? "danger" : "neutral"} />
        <StatCard label="Capacity" value={`${f.capacity_used}/${f.capacity_total}`} hint={`${Math.round((f.capacity_used / Math.max(1, f.capacity_total)) * 100)}% used`} />
      </div>
      <Card>
        <CardHeader title="System health" />
        <ul className="divide-y divide-border">{data.components.map((c) => <li key={c.name} className="flex items-center justify-between gap-4 px-5 py-3.5"><div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted">{c.detail}</p></div><Badge tone={HEALTH[c.status]}>{c.status}</Badge></li>)}</ul>
      </Card>
      <Card>
        <CardHeader title="Template releases" />
        <ul className="divide-y divide-border">{data.templates.map((t) => <li key={t.name} className="flex items-center justify-between gap-4 px-5 py-3.5"><div><p className="font-mono text-sm">{t.name}</p><p className="text-xs text-muted">v{t.version} · {t.tenants} tenants</p></div><Badge tone={t.status === "current" ? "success" : "info"}>{t.status.replace(/_/g, " ")}</Badge></li>)}</ul>
      </Card>
    </div>
  );
}
