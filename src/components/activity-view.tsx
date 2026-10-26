// ActivityView: operations and audit history for the organisation, in tabs.
// Both depend on Manager list endpoints that do not exist yet. Operations fall
// back to the latest operation per tenant (real data from the tenant status
// endpoint); the audit log shows an explicit "not available yet" state rather
// than invented entries. When Manager ships the endpoints these light up
// without UI changes.
"use client";

import Link from "next/link";
import { useState } from "react";

import type { ConsoleError } from "@/lib/client/api";
import { useAudit, useOperations, useTenantActivity, useTenants } from "@/lib/client/queries";
import { canAdminister, isOperationActive, isUnsupported, timeAgo } from "@/lib/manager/contract";

import { useConsole } from "./shell/console-context";
import { Badge, Card, EmptyState, ErrorNotice, NotAvailable, Skeleton } from "./ui/primitives";

const TONE = (s: string) => (s === "succeeded" ? "success" : isOperationActive(s) ? "info" : "danger") as "success" | "info" | "danger";

function OperationsTab() {
  const { org, orgId } = useConsole();
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
        {ops.data.items.length === 0 ? <EmptyState title="No operations" description="Provisioning and lifecycle actions will appear here." /> : (
          <ol className="divide-y divide-border">
            {ops.data.items.map((op) => (
              <li key={op.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1"><Link href={`/o/${org.slug}/operations/${op.id}`} className="text-sm font-medium hover:underline">{op.kind.replace(/[._]/g, " ")}</Link><p className="text-xs text-muted">{op.current_step?.replace(/_/g, " ") ?? ""}</p></div>
                <Badge tone={TONE(op.state)}>{op.state}</Badge>
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
      <p className="border-b border-border px-5 py-3 text-xs text-muted">Showing the latest operation for each tenant. A full operation history needs a Manager endpoint that is not available yet.</p>
      {feed.length === 0 ? <EmptyState title="No operations" description="Create a tenant to see provisioning activity here." /> : (
        <ol className="divide-y divide-border">
          {feed.map(({ tenant, op }) => (
            <li key={op.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="min-w-0 flex-1"><Link href={`/o/${org.slug}/operations/${op.id}`} className="text-sm font-medium hover:underline">{tenant.slug}</Link><p className="text-xs text-muted">{op.error_code ? `Failed · ${op.error_code}` : isOperationActive(op.state) ? "In progress" : "Completed"}</p></div>
              <Badge tone={TONE(op.state)}>{op.state}</Badge>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function AuditTab() {
  const { orgId, role } = useConsole();
  const allowed = canAdminister(role);
  const audit = useAudit(orgId);
  if (!allowed) return <Card><EmptyState title="Admins only" description="Ask an organisation admin for audit history." /></Card>;
  if (audit.isPending) return <Card><div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-5" />)}</div></Card>;
  if (isUnsupported(audit.error)) return <Card><NotAvailable title="Audit history" description="Actor, action, target, time, request ID and outcome will be listed here once Manager exposes audit reads." /></Card>;
  if (audit.error) return <ErrorNotice error={audit.error as ConsoleError} onRetry={() => void audit.refetch()} />;
  if (audit.data.items.length === 0) return <Card><EmptyState title="No audit entries" description="Privileged actions will be recorded here." /></Card>;
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted"><tr><th className="px-5 py-3 font-medium">When</th><th className="px-3 py-3 font-medium">Actor</th><th className="px-3 py-3 font-medium">Action</th><th className="px-3 py-3 font-medium">Target</th><th className="px-3 py-3 font-medium">Result</th><th className="px-5 py-3 font-medium">Request</th></tr></thead>
          <tbody className="divide-y divide-border">
            {audit.data.items.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap px-5 py-3 text-muted" title={e.occurred_at}>{timeAgo(e.occurred_at)}</td>
                <td className="px-3 py-3">{e.actor}</td>
                <td className="px-3 py-3 font-mono text-xs">{e.action}</td>
                <td className="px-3 py-3">{e.target}</td>
                <td className="px-3 py-3"><Badge tone={e.result === "success" ? "success" : "danger"}>{e.result}</Badge></td>
                <td className="px-5 py-3 font-mono text-xs text-muted">{e.request_id.slice(0, 12)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function ActivityView() {
  const [tab, setTab] = useState<"operations" | "audit">("operations");
  const tabs = [["operations", "Operations"], ["audit", "Audit log"]] as const;
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Activity" className="flex gap-1 border-b border-border">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" type="button" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} onClick={() => setTab(id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === id ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"}`}>{label}</button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>{tab === "operations" ? <OperationsTab /> : <AuditTab />}</div>
    </div>
  );
}
