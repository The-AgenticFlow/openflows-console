// TenantList: the org's tenants as a table (name, status, target state, fleet
// size) with a name filter and a status filter, each row linking to the
// tenant's detail page. Polls while any tenant is provisioning/deleting.
// Operators (admin/developer) get the "Create tenant" entry point; viewers see
// the list read-only. All text follows the active language.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ConsoleError } from "@/lib/client/api";
import { useTenants } from "@/lib/client/queries";
import { canOperate, tenantStateLabel } from "@/lib/manager/contract";
import { useT } from "@/lib/preferences/client";

import { useConsole } from "./shell/console-context";
import { StateBadge, useStateName } from "./tenant-status";
import { LinkButton } from "./ui/button";
import { IconArrowRight, IconBoxes, IconPlus } from "./ui/icons";
import { Card, EmptyState, ErrorNotice, SearchInput, Skeleton } from "./ui/primitives";

const FILTERS = ["all", "running", "provisioning", "stopped", "failed"] as const;
type Filter = (typeof FILTERS)[number];

export function TenantList() {
  const { org, orgId, role } = useConsole();
  const { t } = useT();
  const router = useRouter();
  const stateName = useStateName();
  const { data, error, isPending, refetch } = useTenants(orgId);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  if (isPending) {
    return <Card><div className="space-y-3 p-5" aria-busy="true" aria-label={t.tenants.loading}>{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div></Card>;
  }
  if (error) return <ErrorNotice error={error as ConsoleError} onRetry={() => void refetch()} />;

  if (data.items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<IconBoxes size={18} />}
          title={t.tenants.empty}
          description={t.tenants.emptyBody}
          action={canOperate(role) ? <LinkButton href={`/o/${org.slug}/tenants/new`} variant="primary"><IconPlus size={15} /> {t.tenants.create}</LinkButton> : undefined}
        />
      </Card>
    );
  }

  const counts = Object.fromEntries(FILTERS.map((f) => [f, f === "all" ? data.items.length : data.items.filter((x) => tenantStateLabel(x).key === f).length])) as Record<Filter, number>;
  const rows = data.items
    .filter((x) => filter === "all" || tenantStateLabel(x).key === filter)
    .filter((x) => x.slug.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex animate-enter flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label={t.tenants.filter} className="flex flex-wrap gap-1">
          {FILTERS.filter((f) => f === "all" || counts[f] > 0).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors ${filter === f ? "bg-hover-strong text-foreground" : "text-muted hover:bg-hover hover:text-foreground"}`}
            >
              {f === "all" ? t.tenants.all : t.states[f]}
              <span className="rounded bg-surface-muted px-1.5 text-[11px] tabular-nums text-muted">{counts[f]}</span>
            </button>
          ))}
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder={t.tenants.filterPlaceholder} label={t.tenants.filter} />
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? <p className="px-5 py-10 text-center text-sm text-muted">{t.tenants.noMatch}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/50 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">{t.tenants.colName}</th>
                  <th className="px-3 py-3 font-medium">{t.tenants.colStatus}</th>
                  <th className="hidden px-3 py-3 font-medium md:table-cell">{t.tenants.colTarget}</th>
                  <th className="px-3 py-3 text-right font-medium">{t.tenants.colFleet}</th>
                  <th className="hidden px-3 py-3 font-medium lg:table-cell">{t.tenants.colRepo}</th>
                  <th className="w-10 px-5 py-3"><span className="sr-only">{t.common.viewAll}</span></th>
                </tr>
              </thead>
              <tbody className="stagger divide-y divide-border">
                {rows.map((x, i) => {
                  const href = `/o/${org.slug}/tenants/${x.id}`;
                  return (
                    <tr key={x.id} style={{ "--i": Math.min(i, 12) } as React.CSSProperties} onClick={() => router.push(href)} className="group cursor-pointer transition-colors hover:bg-hover">
                      <td className="px-5 py-3.5">
                        <Link href={href} className="flex items-center gap-3 font-medium focus:outline-none" onClick={(e) => e.stopPropagation()}>
                          <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-raised text-subtle transition-colors group-hover:text-accent"><IconBoxes size={15} /></span>
                          {x.slug}
                        </Link>
                      </td>
                      <td className="px-3 py-3.5"><StateBadge tenant={x} /></td>
                      <td className="hidden px-3 py-3.5 text-muted md:table-cell">{stateName(x.desired_state)}</td>
                      <td className="px-3 py-3.5 text-right tabular-nums">{x.fleet_size}</td>
                      <td className="hidden px-3 py-3.5 font-mono text-xs text-muted lg:table-cell">{String(x.github_repository_id)}</td>
                      <td className="px-5 py-3.5"><IconArrowRight size={14} className="text-subtle opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-border px-5 py-2.5 text-xs text-muted">{t.tenants.count(rows.length)}</div>
      </Card>
    </div>
  );
}

/** Header action: admins and developers only (Manager enforces). */
export function CreateTenantButton() {
  const { org, role } = useConsole();
  const { t } = useT();
  return canOperate(role) ? <LinkButton href={`/o/${org.slug}/tenants/new`} variant="primary"><IconPlus size={15} /> {t.tenants.create}</LinkButton> : null;
}
