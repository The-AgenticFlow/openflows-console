// TenantList: operator view over OpenFlows tenants discovered by the data
// layer. In real mode, `/api/fleet` enumerates tenants from Redis `ns:*` keys,
// matching OpenFlows' tenant existence contract.
"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { TenantActions } from "@/components/tenant-actions";
import { summarizeTenants, type TenantSummary } from "@/lib/domain/tenant-summary";
import type { TenantFleet } from "@/lib/domain/types";

async function fetchFleet(): Promise<TenantFleet[]> {
  const res = await fetch("/api/fleet");
  if (!res.ok) {
    throw new Error("Failed to load tenants");
  }
  return res.json();
}

export function TenantList() {
  const { data, dataUpdatedAt, isFetching, isLoading, isError, refetch } = useQuery({
    queryKey: ["fleet", "tenants"],
    queryFn: fetchFleet,
    refetchInterval: 15_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
        Loading tenants…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6">
        <p className="text-sm text-danger">Failed to load tenants.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm text-primary transition-colors hover:bg-surface-muted"
        >
          Retry
        </button>
      </div>
    );
  }

  const summaries = summarizeTenants(data ?? []);
  const totals = summarizeAllTenants(summaries);

  if (summaries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center">
        <h2 className="text-base font-semibold text-foreground">No tenants found</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
          No OpenFlows namespaces were discovered. In real mode, a tenant appears
          when the SharedStore contains at least one `ns:&lt;tenant&gt;:*` key.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted">
          {dataUpdatedAt ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}` : "Waiting"}
          {isFetching ? " · refreshing" : ""}
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Tenants" value={summaries.length} />
        <Metric
          label="Tickets"
          value={totals.ticketCount}
          detail={`${totals.activeTicketCount} active · ${totals.escalationCount} escalated`}
          tone={totals.escalationCount > 0 ? "danger" : "default"}
        />
        <Metric
          label="Workers"
          value={totals.workerCount}
          detail={`${totals.activeWorkerCount} active`}
        />
        <Metric label="Pending PRs" value={totals.pendingPrCount} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {summaries.map((summary) => (
          <TenantCard key={summary.name} summary={summary} />
        ))}
      </div>
    </div>
  );
}

function TenantCard({ summary }: Readonly<{ summary: TenantSummary }>) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-mono text-lg font-semibold text-foreground">
              {summary.name}
            </h2>
            <StatusBadge active={summary.isActive} />
          </div>
          <p className="mt-1 text-xs text-muted">
            CI {summary.ciReadiness ?? "unknown"} · {summary.ticketCount} tickets ·{" "}
            {summary.workerCount} workers
          </p>
        </div>
        <Link
          href={`/?tenant=${encodeURIComponent(summary.name)}`}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
        >
          View fleet
        </Link>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <MiniMetric label="Open" value={summary.openTicketCount} />
        <MiniMetric label="Active" value={summary.activeTicketCount} />
        <MiniMetric label="Escalated" value={summary.escalationCount} tone="danger" />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <MiniMetric label="Active workers" value={summary.activeWorkerCount} />
        <MiniMetric label="Pending PRs" value={summary.pendingPrCount} />
        <MiniMetric label="Workers" value={summary.workerCount} />
      </div>

      <TenantActions tenant={summary.name} />
    </section>
  );
}

function Metric({
  label,
  value,
  detail,
  tone = "default",
}: Readonly<{
  label: string;
  value: number;
  detail?: string;
  tone?: "default" | "danger";
}>) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs font-medium uppercase text-muted">{label}</div>
      <div
        className={
          tone === "danger"
            ? "mt-2 text-2xl font-semibold text-danger"
            : "mt-2 text-2xl font-semibold text-foreground"
        }
      >
        {value}
      </div>
      {detail ? <div className="mt-1 text-xs text-muted">{detail}</div> : null}
    </div>
  );
}

function MiniMetric({
  label,
  value,
  tone = "default",
}: Readonly<{ label: string; value: number; tone?: "default" | "danger" }>) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div
        className={
          tone === "danger" && value > 0
            ? "mt-1 text-lg font-semibold text-danger"
            : "mt-1 text-lg font-semibold text-foreground"
        }
      >
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ active }: Readonly<{ active: boolean }>) {
  return (
    <span
      className={
        active
          ? "rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
          : "rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted"
      }
    >
      {active ? "active" : "idle"}
    </span>
  );
}

function summarizeAllTenants(summaries: TenantSummary[]) {
  return summaries.reduce(
    (totals, summary) => ({
      ticketCount: totals.ticketCount + summary.ticketCount,
      activeTicketCount: totals.activeTicketCount + summary.activeTicketCount,
      escalationCount: totals.escalationCount + summary.escalationCount,
      workerCount: totals.workerCount + summary.workerCount,
      activeWorkerCount: totals.activeWorkerCount + summary.activeWorkerCount,
      pendingPrCount: totals.pendingPrCount + summary.pendingPrCount,
    }),
    {
      ticketCount: 0,
      activeTicketCount: 0,
      escalationCount: 0,
      workerCount: 0,
      activeWorkerCount: 0,
      pendingPrCount: 0,
    },
  );
}
