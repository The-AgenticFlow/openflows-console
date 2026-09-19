// Fleet summary: pure data-layer projections for the operator dashboard.
// Mirrors OpenFlows' Redis contracts while keeping UI components free of
// status-counting, heartbeat-freshness, and escalation logic.
import type {
  HeartbeatRecord,
  TenantFleet,
  Ticket,
  TicketStatus,
  WorkerSlot,
  WorkerStatus,
} from "@/lib/domain/types";

export const HEARTBEAT_STALE_AFTER_MS = 90_000;

type TicketStatusName = TicketStatus["type"];
type WorkerStatusName = WorkerStatus["type"];

export interface CountSummary<T extends string> {
  total: number;
  byStatus: Record<T, number>;
}

export interface HeartbeatHealth {
  key: string;
  record: HeartbeatRecord;
  ageMs: number;
  state: "running" | "stale" | "not_running";
}

export interface FleetSummary {
  ticketCounts: CountSummary<TicketStatusName>;
  workerCounts: CountSummary<WorkerStatusName>;
  heartbeatCounts: {
    total: number;
    running: number;
    stale: number;
    notRunning: number;
  };
  pendingPrCount: number;
  escalations: Ticket[];
  activeWorkers: WorkerSlot[];
  heartbeats: HeartbeatHealth[];
}

const TICKET_STATUS_NAMES: TicketStatusName[] = [
  "open",
  "assigned",
  "in_progress",
  "merged",
  "failed",
  "completed",
  "exhausted",
  "awaiting_human",
];

const WORKER_STATUS_NAMES: WorkerStatusName[] = [
  "idle",
  "assigned",
  "working",
  "done",
  "suspended",
];

function emptyStatusCounts<T extends string>(statuses: readonly T[]): Record<T, number> {
  return Object.fromEntries(statuses.map((status) => [status, 0])) as Record<T, number>;
}

export function summarizeFleet(fleet: TenantFleet, nowMs = Date.now()): FleetSummary {
  const ticketCounts = {
    total: fleet.tickets.length,
    byStatus: emptyStatusCounts(TICKET_STATUS_NAMES),
  };
  const workerSlots = Object.values(fleet.workerSlots);
  const workerCounts = {
    total: workerSlots.length,
    byStatus: emptyStatusCounts(WORKER_STATUS_NAMES),
  };

  for (const ticket of fleet.tickets) {
    ticketCounts.byStatus[ticket.status.type] += 1;
  }

  for (const slot of workerSlots) {
    workerCounts.byStatus[slot.status.type] += 1;
  }

  const heartbeats = Object.entries(fleet.heartbeats ?? {})
    .map(([key, record]) => toHeartbeatHealth(key, record, nowMs))
    .sort((a, b) => b.record.ts - a.record.ts);

  return {
    ticketCounts,
    workerCounts,
    heartbeatCounts: {
      total: heartbeats.length,
      running: heartbeats.filter((heartbeat) => heartbeat.state === "running").length,
      stale: heartbeats.filter((heartbeat) => heartbeat.state === "stale").length,
      notRunning: heartbeats.filter((heartbeat) => heartbeat.state === "not_running").length,
    },
    pendingPrCount: fleet.pendingPrs.length,
    escalations: fleet.tickets.filter((ticket) => ticket.status.type === "awaiting_human"),
    activeWorkers: workerSlots.filter((slot) => slot.status.type !== "idle"),
    heartbeats,
  };
}

function toHeartbeatHealth(
  key: string,
  record: HeartbeatRecord,
  nowMs: number,
): HeartbeatHealth {
  const ageMs = Math.max(0, nowMs - record.ts);
  let state: HeartbeatHealth["state"];
  if (record.status && record.status !== "running") {
    state = "not_running";
  } else if (ageMs > HEARTBEAT_STALE_AFTER_MS) {
    state = "stale";
  } else {
    state = "running";
  }

  return { key, record, ageMs, state };
}
