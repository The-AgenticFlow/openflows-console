// ActivityView: operations and audit history for the organisation, in tabs.
// The audit log reads Manager's paged audit endpoint (admins only, newest
// first). Manager has no operations list yet, so operations fall back to the
// latest operation per tenant (real data from the tenant status endpoint);
// an older Manager without audit reads shows an explicit "not available" state
// rather than invented entries. Text and times follow the active language.
"use client";

import Link from "next/link";
import { useState } from "react";

import type { ConsoleError } from "@/lib/client/api";
import { useAudit, useOperations, useTenantActivity, useTenants } from "@/lib/client/queries";
import { formatDateTime, relativeTime } from "@/lib/i18n";
import { canAdminister, isOperationActive, isUnsupported } from "@/lib/manager/contract";
import { useT } from "@/lib/preferences/client";

import { useConsole } from "./shell/console-context";
import { Button } from "./ui/button";
import { IconActivity, IconShield } from "./ui/icons";
import { Badge, Card, EmptyState, ErrorNotice, NotAvailable, Skeleton } from "./ui/primitives";

const TONE = (s: string) => (s === "succeeded" ? "success" : isOperationActive(s) ? "info" : "danger") as "success" | "info" | "danger";

function OperationsTab() {
  const { org, orgId } = useConsole();
  const { t } = useT();
  const a = t.activity;
  const ops = useOperations(orgId);
  const tenants = useTenants(orgId);
  const list = isUnsupported(ops.error);
  const items = tenants.data?.items ?? [];
  const derived = useTenantActivity(orgId, list ? items.map((t) => t.id) : []);

  if (ops.isPending) return <Card><div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-5" />)}</div></Card>;
  if (ops.error && !list) return <ErrorNotice error={ops.error as ConsoleError} onRetry={() => void ops.refetch()} />;

  if (!list && ops.data) {
    return (
      <Card>
        {ops.data.items.length === 0 ? <EmptyState icon={<IconActivity size={18} />} title={a.noOperations} description={a.noOperationsBody} /> : (
          <ol className="divide-y divide-border">
            {ops.data.items.map((op) => (
              <li key={op.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1"><Link href={`/o/${org.slug}/operations/${op.id}`} className="text-sm font-medium capitalize hover:underline">{op.kind.replace(/[._]/g, " ")}</Link><p className="text-xs text-muted">{op.current_step?.replace(/_/g, " ") ?? ""}</p></div>
                <Badge dot live={isOperationActive(op.state)} tone={TONE(op.state)}>{t.states[op.state] ?? op.state}</Badge>
              </li>
            ))}
          </ol>
        )}
      </Card>
    );
  }

  const feed = derived.flatMap((q, i) => (q.data?.latest_operation ? [{ tenant: items[i], op: q.data.latest_operation }] : []));
  return (
    <Card>
      <p className="border-b border-border bg-surface-muted/50 px-5 py-3 text-xs text-muted">{a.derivedNote}</p>
      {feed.length === 0 ? <EmptyState icon={<IconActivity size={18} />} title={a.noOperations} description={a.noOperationsTenant} /> : (
        <ol className="divide-y divide-border">
          {feed.map(({ tenant, op }) => (
            <li key={op.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="min-w-0 flex-1"><Link href={`/o/${org.slug}/operations/${op.id}`} className="text-sm font-medium hover:underline">{tenant.slug}</Link><p className="text-xs text-muted">{op.error_code ? a.failedCode(op.error_code) : isOperationActive(op.state) ? a.inProgress : a.completed}</p></div>
              <Badge dot live={isOperationActive(op.state)} tone={TONE(op.state)}>{t.states[op.state] ?? op.state}</Badge>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function AuditTab() {
  const { orgId, role } = useConsole();
  const { t, locale } = useT();
  const a = t.activity;
  const allowed = canAdminister(role);
  const audit = useAudit(orgId);
  if (!allowed) return <Card><EmptyState icon={<IconShield size={18} />} title={a.adminsOnly} description={a.adminsOnlyBody} /></Card>;
  if (audit.isPending) return <Card><div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-5" />)}</div></Card>;
  if (isUnsupported(audit.error)) return <Card><NotAvailable title={a.auditUnavailable} description={a.auditUnavailableBody} /></Card>;
  if (audit.error) return <ErrorNotice error={audit.error as ConsoleError} onRetry={() => void audit.refetch()} />;
  const entries = audit.data.pages.flatMap((p) => p.items);
  if (entries.length === 0) return <Card><EmptyState icon={<IconShield size={18} />} title={a.noAudit} description={a.noAuditBody} /></Card>;
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-muted/50 text-xs uppercase tracking-wide text-muted"><tr><th className="px-5 py-3 font-medium">{a.when}</th><th className="px-3 py-3 font-medium">{a.actor}</th><th className="px-3 py-3 font-medium">{a.action}</th><th className="px-3 py-3 font-medium">{a.target}</th><th className="px-3 py-3 font-medium">{a.result}</th><th className="px-5 py-3 font-medium">{a.request}</th></tr></thead>
          <tbody className="divide-y divide-border">
            {entries.map((e) => (
              <tr key={e.id} className="transition-colors hover:bg-hover">
                <td className="whitespace-nowrap px-5 py-3 text-muted" title={formatDateTime(e.occurred_at, locale)}>{relativeTime(e.occurred_at, locale, t)}</td>
                <td className="px-3 py-3">{e.actor_name ?? (e.actor_type === "user" ? a.unknownUser : e.actor_type)}</td>
                <td className="px-3 py-3 font-mono text-xs">{e.action}</td>
                <td className="px-3 py-3">{e.resource_type ? <>{e.resource_type}{e.resource_id ? <span className="ml-1 font-mono text-xs text-muted" title={e.resource_id}>{e.resource_id.slice(0, 8)}</span> : null}</> : <span className="text-muted">—</span>}</td>
                <td className="px-3 py-3"><Badge dot tone={e.result === "success" ? "success" : "danger"}>{e.result}</Badge></td>
                <td className="px-5 py-3 font-mono text-xs text-muted" title={e.request_id ?? undefined}>{e.request_id ? `${e.request_id.slice(0, 12)}…` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {audit.hasNextPage ? (
        <div className="border-t border-border p-3 text-center">
          <Button loading={audit.isFetchingNextPage} onClick={() => void audit.fetchNextPage()}>{a.loadOlder}</Button>
        </div>
      ) : null}
    </Card>
  );
}

export function ActivityView() {
  const { t } = useT();
  const [tab, setTab] = useState<"operations" | "audit">("operations");
  const tabs = [["operations", t.activity.tabOperations, IconActivity], ["audit", t.activity.tabAudit, IconShield]] as const;
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label={t.activity.title} className="flex gap-1 border-b border-border">
        {tabs.map(([id, label, Icon]) => (
          <button key={id} role="tab" type="button" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} onClick={() => setTab(id)}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${tab === id ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"}`}><Icon size={14} /> {label}</button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>{tab === "operations" ? <OperationsTab /> : <AuditTab />}</div>
    </div>
  );
}
