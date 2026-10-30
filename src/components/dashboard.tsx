// Dashboard: the organisation overview. A greeting header; the setup
// checklist (until setup is complete); stat tiles for fleet health and the
// GitHub connection; the tenants list and a recent-activity feed; and quick
// links to the most common next actions. Manager has no operations-list
// endpoint, so activity is derived from each tenant's latest operation (via the
// tenant status endpoint) rather than faked. Text follows the active language.
"use client";

import Link from "next/link";

import type { ConsoleError } from "@/lib/client/api";
import { useConnections, useTenantActivity, useTenants } from "@/lib/client/queries";
import { canAdminister, canOperate, isOperationActive, tenantStateLabel } from "@/lib/manager/contract";
import { useT } from "@/lib/preferences/client";

import { OnboardingChecklist } from "./onboarding-checklist";
import { useConsole } from "./shell/console-context";
import { StateBadge } from "./tenant-status";
import { LinkButton } from "./ui/button";
import { IconActivity, IconAlert, IconArrowRight, IconBook, IconBoxes, IconGithub, IconPlay, IconPlus, IconShield, IconUsers } from "./ui/icons";
import { Badge, Card, CardHeader, EmptyState, ErrorNotice, PageHeader, Skeleton, StatCard } from "./ui/primitives";

export function Dashboard() {
  const { org, orgId, role, user } = useConsole();
  const { t } = useT();
  const tenants = useTenants(orgId);
  const conns = useConnections(orgId);
  const items = tenants.data?.items ?? [];
  const activity = useTenantActivity(orgId, items.slice(0, 6).map((x) => x.id));

  const running = items.filter((x) => x.observed_state === "running").length;
  const attention = items.filter((x) => tenantStateLabel(x).tone === "danger").length;
  const busy = items.filter((x) => ["provisioning", "deleting"].includes(x.observed_state)).length;
  const active = conns.data?.items.find((c) => c.status === "active");
  const ghLabel = conns.isPending ? "…" : active ? t.overview.connected : conns.data?.items.length ? t.overview.needsAttention : t.overview.notConnected;

  const feed = activity.flatMap((q, i) => (q.data?.latest_operation ? [{ tenant: items[i], op: q.data.latest_operation }] : []));
  const base = `/o/${org.slug}`;
  const quick = [
    canAdminister(role) ? { href: `${base}/members`, label: t.overview.qaInvite, icon: IconUsers } : null,
    canAdminister(role) ? { href: `${base}/github`, label: t.overview.qaGithub, icon: IconGithub } : null,
    canAdminister(role) ? { href: `${base}/activity`, label: t.overview.qaActivity, icon: IconShield } : null,
    { href: `${base}/help`, label: t.overview.qaHelp, icon: IconBook },
  ].filter((q): q is { href: string; label: string; icon: typeof IconBook } => !!q);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={org.display_name}
        title={t.overview.greeting(user.display_name)}
        description={t.overview.description}
      />

      <OnboardingChecklist />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t.overview.statTenants} icon={<IconBoxes size={15} />} value={tenants.isPending ? <Skeleton className="h-7 w-10" /> : items.length} hint={busy ? t.overview.inProgress(busy) : t.overview.statTenantsHint} />
        <StatCard label={t.overview.statRunning} icon={<IconPlay size={14} />} value={tenants.isPending ? <Skeleton className="h-7 w-10" /> : running} tone={running ? "success" : "neutral"} hint={t.overview.statRunningHint} />
        <StatCard label={t.overview.statAttention} icon={<IconAlert size={15} />} value={tenants.isPending ? <Skeleton className="h-7 w-10" /> : attention} tone={attention ? "danger" : "neutral"} hint={attention ? t.overview.statAttentionHint : t.overview.allClear} />
        <StatCard label={t.overview.statGithub} icon={<IconGithub size={15} />} value={<span className="text-lg">{ghLabel}</span>} tone={active ? "success" : conns.data?.items.length ? "warning" : "neutral"} hint={active?.account_login ?? undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            title={t.overview.tenantsTitle}
            description={t.overview.tenantsBody}
            action={<Link href={`${base}/tenants`} className="group inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground">{t.common.viewAll} <IconArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" /></Link>}
          />
          {tenants.error ? (
            <div className="p-5"><ErrorNotice error={tenants.error as ConsoleError} onRetry={() => void tenants.refetch()} /></div>
          ) : tenants.isPending ? (
            <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-5" />)}</div>
          ) : items.length === 0 ? (
            <EmptyState icon={<IconBoxes size={18} />} title={t.overview.noTenants} description={t.overview.noTenantsBody} action={canOperate(role) ? <LinkButton href={`${base}/tenants/new`} variant="primary"><IconPlus size={15} /> {t.overview.createTenant}</LinkButton> : undefined} />
          ) : (
            <ul className="stagger divide-y divide-border">
              {items.slice(0, 6).map((x, i) => (
                <li key={x.id} style={{ "--i": i } as React.CSSProperties}>
                  <Link href={`${base}/tenants/${x.id}`} className="group flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-hover">
                    <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-raised text-subtle transition-colors group-hover:text-accent"><IconBoxes size={15} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{x.slug}</span><span className="block text-xs text-muted">{t.overview.fleetSize(x.fleet_size)}</span></span>
                    <StateBadge tenant={x} />
                    <IconArrowRight size={14} className="-ml-1 text-subtle opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t.overview.activityTitle} description={t.overview.activityBody} />
            {feed.length === 0 ? (
              <EmptyState icon={<IconActivity size={18} />} title={t.overview.nothingYet} description={t.overview.nothingYetBody} />
            ) : (
              <ol className="stagger divide-y divide-border">
                {feed.map(({ tenant, op }, i) => (
                  <li key={op.id} style={{ "--i": i } as React.CSSProperties} className="flex items-center gap-3 px-5 py-3.5">
                    <span aria-hidden className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${op.state === "succeeded" ? "bg-success-soft text-success" : isOperationActive(op.state) ? "bg-info-soft text-info" : "bg-danger-soft text-danger"}`}><IconActivity size={14} /></span>
                    <div className="min-w-0 flex-1">
                      <Link href={`${base}/operations/${op.id}`} className="block truncate text-sm font-medium hover:underline">{tenant.slug}</Link>
                      <p className="text-xs text-muted">{isOperationActive(op.state) ? t.overview.inProgressShort : op.state === "succeeded" ? t.overview.completed : t.overview.failed}</p>
                    </div>
                    <Badge dot live={isOperationActive(op.state)} tone={op.state === "succeeded" ? "success" : isOperationActive(op.state) ? "info" : "danger"}>{t.states[op.state] ?? op.state}</Badge>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card>
            <CardHeader title={t.overview.quickActions} />
            <ul className="divide-y divide-border">
              {quick.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link href={href} className="group flex h-full items-center gap-3 px-5 py-3.5 text-sm transition-colors hover:bg-hover">
                    <Icon size={15} className="text-subtle transition-colors group-hover:text-accent" />
                    <span className="flex-1">{label}</span>
                    <IconArrowRight size={13} className="text-subtle opacity-0 transition-all group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
