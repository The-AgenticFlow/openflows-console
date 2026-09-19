// FleetOverview: operator dashboard for live OpenFlows fleet state. Polls the
// typed /api/fleet data source and renders ticket, worker, heartbeat, PR, and
// escalation summaries derived in the domain layer.
"use client";

import { useQuery } from "@tanstack/react-query";

import {
  type FleetSummary,
  HEARTBEAT_STALE_AFTER_MS,
  summarizeFleet,
} from "@/lib/domain/fleet-summary";
import type {
  HeartbeatRecord,
  PendingPr,
  TenantFleet,
  Ticket,
  WorkerSlot,
} from "@/lib/domain/types";

async function fetchFleet(): Promise<TenantFleet[]> {
  const res = await fetch("/api/fleet");
  if (!res.ok) {
    throw new Error("Failed to load fleet");
  }
  return res.json();
}

export function FleetOverview() {
  const { data, dataUpdatedAt, isFetching, isLoading, isError, refetch } = useQuery({
    queryKey: ["fleet"],
    queryFn: fetchFleet,
    refetchInterval: 15_000,
  });

  if (isLoading)
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
        Loading fleet…
      </div>
    );

  if (isError)
    return (
      <div className="rounded-lg border border-border bg-surface p-6">
        <p className="text-sm text-danger">Failed to load fleet.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm text-primary transition-colors hover:bg-surface-muted"
        >
          Retry
        </button>
      </div>
    );

  const nowMs = dataUpdatedAt || 0;
  const fleets = data ?? [];
  const summaries = fleets.map((fleet) => ({
    fleet,
    summary: summarizeFleet(fleet, nowMs),
  }));
  const totals = summarizeAll(summaries.map(({ summary }) => summary));
  const escalations = summaries.flatMap(({ fleet, summary }) =>
    summary.escalations.map((ticket) => ({ tenant: fleet.tenant, ticket })),
  );

  if (fleets.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <h2 className="text-base font-semibold text-foreground">No tenants found</h2>
        <p className="mt-1 text-sm text-muted">
          Connect the console to an OpenFlows SharedStore or keep using mock data.
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
        <Metric label="Tenants" value={fleets.length} />
        <Metric
          label="Tickets"
          value={totals.tickets}
          detail={`${totals.openTickets} open · ${totals.activeTickets} active`}
        />
        <Metric
          label="Workers"
          value={totals.workers}
          detail={`${totals.activeWorkers} active · ${totals.idleWorkers} idle`}
        />
        <Metric
          label="Heartbeats"
          value={totals.heartbeats}
          detail={`${totals.runningHeartbeats} running · ${totals.staleHeartbeats} stale`}
          tone={totals.staleHeartbeats > 0 ? "warning" : "default"}
        />
      </div>

      {escalations.length > 0 ? (
        <section className="rounded-lg border border-danger/40 bg-danger/10 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">
              Awaiting Human
            </h2>
            <span className="rounded-full bg-danger/15 px-2 py-1 text-xs font-medium text-danger">
              {escalations.length}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {escalations.map(({ tenant, ticket }) => (
              <TicketRow key={`${tenant}-${ticket.id}`} ticket={ticket} tenant={tenant} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="space-y-4">
        {summaries.map(({ fleet, summary }) => (
          <TenantPanel key={fleet.tenant} fleet={fleet} nowMs={nowMs} summary={summary} />
        ))}
      </div>
    </div>
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
  tone?: "default" | "warning";
}>) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs font-medium uppercase text-muted">{label}</div>
      <div className={tone === "warning" ? "mt-2 text-2xl font-semibold text-warning" : "mt-2 text-2xl font-semibold text-foreground"}>
        {value}
      </div>
      {detail ? <div className="mt-1 text-xs text-muted">{detail}</div> : null}
    </div>
  );
}

function TenantPanel({
  fleet,
  nowMs,
  summary,
}: Readonly<{ fleet: TenantFleet; nowMs: number; summary: FleetSummary }>) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">{fleet.tenant}</h2>
          <p className="mt-1 text-xs text-muted">
            CI {fleet.ciReadiness ?? "unknown"} · {summary.ticketCounts.total} tickets ·{" "}
            {summary.workerCounts.total} workers
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <StatusPill label="Pending PRs" value={summary.pendingPrCount} />
          <StatusPill label="Escalations" value={summary.escalations.length} tone={summary.escalations.length > 0 ? "danger" : "default"} />
        </div>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <SummaryStrip summary={summary} />
          <TicketList tickets={fleet.tickets} tenant={fleet.tenant} />
        </div>
        <div className="space-y-5">
          <WorkerList workers={Object.values(fleet.workerSlots)} />
          <HeartbeatList heartbeats={fleet.heartbeats ?? {}} nowMs={nowMs} />
          <PendingPrList pendingPrs={fleet.pendingPrs} />
        </div>
      </div>
    </section>
  );
}

function SummaryStrip({ summary }: Readonly<{ summary: FleetSummary }>) {
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      <MiniMetric label="Open" value={summary.ticketCounts.byStatus.open} />
      <MiniMetric label="In progress" value={summary.ticketCounts.byStatus.in_progress} />
      <MiniMetric label="Merged" value={summary.ticketCounts.byStatus.merged} />
      <MiniMetric label="Blocked" value={summary.ticketCounts.byStatus.awaiting_human + summary.ticketCounts.byStatus.failed + summary.ticketCounts.byStatus.exhausted} />
    </div>
  );
}

function MiniMetric({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}

function TicketList({
  tickets,
  tenant,
}: Readonly<{ tickets: Ticket[]; tenant: string }>) {
  if (tickets.length === 0) {
    return <EmptyBlock title="No tickets" detail="This tenant has no tracked work." />;
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Tickets</h3>
      <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
        {tickets.map((ticket) => (
          <TicketRow key={ticket.id} ticket={ticket} tenant={tenant} />
        ))}
      </div>
    </div>
  );
}

function TicketRow({
  ticket,
  tenant,
}: Readonly<{ ticket: Ticket; tenant: string }>) {
  return (
    <div className="flex items-start justify-between gap-3 bg-background px-3 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted">{ticket.id}</span>
          <span className="text-xs text-muted">{tenant}</span>
          <StatusBadge status={ticket.status.type} />
        </div>
        <div className="mt-1 truncate text-sm font-medium text-foreground">
          {ticket.title}
        </div>
        {"reason" in ticket.status && ticket.status.reason ? (
          <div className="mt-1 text-xs text-danger">{ticket.status.reason}</div>
        ) : null}
      </div>
      {typeof ticket.priority === "number" ? (
        <span className="shrink-0 rounded-md bg-surface-muted px-2 py-1 text-xs text-muted">
          P{ticket.priority}
        </span>
      ) : null}
    </div>
  );
}

function WorkerList({ workers }: Readonly<{ workers: WorkerSlot[] }>) {
  if (workers.length === 0) {
    return <EmptyBlock title="No workers" detail="No worker slots are registered." />;
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Workers</h3>
      <div className="space-y-2">
        {workers.map((worker) => (
          <div key={worker.id} className="rounded-md border border-border bg-background px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-foreground">{worker.id}</span>
              <StatusBadge status={worker.status.type} />
            </div>
            {"ticket_id" in worker.status && worker.status.ticket_id ? (
              <div className="mt-1 text-xs text-muted">{worker.status.ticket_id}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function HeartbeatList({
  heartbeats,
  nowMs,
}: Readonly<{ heartbeats: Record<string, HeartbeatRecord>; nowMs: number }>) {
  const rows = Object.entries(heartbeats)
    .map(([key, heartbeat]) => ({ key, heartbeat, ageMs: nowMs - heartbeat.ts }))
    .sort((a, b) => b.heartbeat.ts - a.heartbeat.ts);

  if (rows.length === 0) {
    return <EmptyBlock title="No heartbeats" detail="No live workspace beacons found." />;
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Heartbeats</h3>
      <div className="space-y-2">
        {rows.map(({ key, heartbeat, ageMs }) => {
          const stale = ageMs > HEARTBEAT_STALE_AFTER_MS;
          return (
            <div key={key} className="rounded-md border border-border bg-background px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-mono text-xs text-foreground">{key}</span>
                <StatusBadge status={stale ? "stale" : heartbeat.status ?? "running"} />
              </div>
              <div className="mt-1 text-xs text-muted">
                {formatAge(ageMs)} · {heartbeat.ws_id ?? "workspace unknown"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PendingPrList({ pendingPrs }: Readonly<{ pendingPrs: PendingPr[] }>) {
  if (pendingPrs.length === 0) {
    return <EmptyBlock title="No pending PRs" detail="Nothing is waiting in the merge lane." />;
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Pending PRs</h3>
      <div className="space-y-2">
        {pendingPrs.map((pr) => (
          <div key={pr.number} className="rounded-md border border-border bg-background px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">PR #{pr.number}</span>
              <StatusBadge status={pr.mergeable === false || pr.has_conflicts ? "blocked" : "ready"} />
            </div>
            <div className="mt-1 text-xs text-muted">
              {pr.ticket_id ?? "ticket unknown"} · {pr.head_branch ?? "branch unknown"} →{" "}
              {pr.base_branch ?? "base unknown"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyBlock({ title, detail }: Readonly<{ title: string; detail: string }>) {
  return (
    <div className="rounded-md border border-dashed border-border bg-background px-3 py-4">
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="mt-1 text-xs text-muted">{detail}</div>
    </div>
  );
}

function StatusPill({
  label,
  value,
  tone = "default",
}: Readonly<{ label: string; value: number; tone?: "default" | "danger" }>) {
  return (
    <span className={tone === "danger" ? "rounded-full bg-danger/15 px-2 py-1 font-medium text-danger" : "rounded-full bg-surface-muted px-2 py-1 font-medium text-muted"}>
      {label}: {value}
    </span>
  );
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
  const tone = statusTone(status);
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function statusTone(status: string): string {
  if (["awaiting_human", "failed", "exhausted", "blocked", "stale"].includes(status)) {
    return "bg-danger/15 text-danger";
  }
  if (["working", "in_progress", "assigned", "ready", "running"].includes(status)) {
    return "bg-primary/15 text-primary";
  }
  if (["merged", "completed", "done", "idle"].includes(status)) {
    return "bg-success/15 text-success";
  }
  return "bg-surface-muted text-muted";
}

function formatAge(ageMs: number): string {
  const seconds = Math.max(0, Math.round(ageMs / 1_000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

function summarizeAll(summaries: FleetSummary[]) {
  return summaries.reduce(
    (totals, summary) => ({
      tickets: totals.tickets + summary.ticketCounts.total,
      openTickets: totals.openTickets + summary.ticketCounts.byStatus.open,
      activeTickets:
        totals.activeTickets +
        summary.ticketCounts.byStatus.assigned +
        summary.ticketCounts.byStatus.in_progress,
      workers: totals.workers + summary.workerCounts.total,
      activeWorkers:
        totals.activeWorkers +
        summary.workerCounts.byStatus.assigned +
        summary.workerCounts.byStatus.working,
      idleWorkers: totals.idleWorkers + summary.workerCounts.byStatus.idle,
      heartbeats: totals.heartbeats + summary.heartbeatCounts.total,
      runningHeartbeats: totals.runningHeartbeats + summary.heartbeatCounts.running,
      staleHeartbeats: totals.staleHeartbeats + summary.heartbeatCounts.stale,
    }),
    {
      tickets: 0,
      openTickets: 0,
      activeTickets: 0,
      workers: 0,
      activeWorkers: 0,
      idleWorkers: 0,
      heartbeats: 0,
      runningHeartbeats: 0,
      staleHeartbeats: 0,
    },
  );
}
