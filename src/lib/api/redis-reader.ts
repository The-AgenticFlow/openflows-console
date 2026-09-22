// Redis reader: the "real" data source (ADR-0002 / ADR-0005). Reads the
// tenant-namespaced Redis SharedStore keys and maps them onto the typed domain
// models. Defensive: missing or unparseable JSON degrades to empty values.
import type { RedisClientType } from "redis";

import type {
  CiReadiness,
  HeartbeatRecord,
  PendingPr,
  PhaseStatus,
  TenantFleet,
  Ticket,
  TicketDetail,
  TicketGateRecord,
  TicketReviewRecord,
  WorkerSlot,
  WorkflowPhase,
} from "@/lib/domain/types";
import { getRedis, tenantKey } from "@/lib/redis/client";

export async function listTenants(): Promise<string[]> {
  const r = await getRedis();
  const keys = await r.keys("ns:*");
  const tenants = new Set<string>();
  for (const key of keys) {
    const rest = key.startsWith("ns:") ? key.slice(3) : key;
    const tenant = rest.split(":")[0];
    if (tenant) tenants.add(tenant);
  }
  return [...tenants].sort((a, b) => a.localeCompare(b));
}

export async function readTenantFleet(tenant: string): Promise<TenantFleet> {
  const r = await getRedis();
  const tickets = await readJson<Ticket[]>(r, tenantKey(tenant, "tickets"));
  const [workerSlots, pendingPrs, ciRaw, heartbeats, phases] = await Promise.all([
    readJson<Record<string, WorkerSlot>>(r, tenantKey(tenant, "worker_slots")),
    readJson<PendingPr[]>(r, tenantKey(tenant, "pending_prs")),
    readJson<{ type?: string }>(r, tenantKey(tenant, "ci_readiness")),
    readHeartbeats(r, tenant),
    readPhases(r, tenant, tickets ?? []),
  ]);

  return {
    tenant,
    tickets: tickets ?? [],
    phases,
    workerSlots: workerSlots ?? {},
    pendingPrs: pendingPrs ?? [],
    ciReadiness: ciRaw?.type as CiReadiness | undefined,
    heartbeats,
  };
}

export async function readTenantTicketDetail(
  tenant: string,
  ticketId: string,
): Promise<TicketDetail | null> {
  const r = await getRedis();
  const fleet = await readTenantFleet(tenant);
  const ticket = fleet.tickets.find((item) => item.id === ticketId);
  if (!ticket) return null;

  const [gates, reviews, pr, handoff, deployment] = await Promise.all([
    readGateRecords(r, tenant, ticketId),
    readReviewRecords(r, tenant, ticketId),
    readJson<unknown>(r, tenantKey(tenant, `ticket:${ticketId}:pr`)),
    readJson<unknown>(r, tenantKey(tenant, `ticket:${ticketId}:handoff`)),
    readJson<unknown>(r, tenantKey(tenant, `ticket:${ticketId}:deployment`)),
  ]);

  return {
    tenant,
    ticket,
    phase: fleet.phases?.[ticketId],
    gates,
    reviews,
    pr: pr ?? undefined,
    handoff: handoff ?? undefined,
    deployment: deployment ?? undefined,
    pendingPr: fleet.pendingPrs.find((pending) => pending.ticket_id === ticketId),
  };
}

async function readJson<T>(r: RedisClientType, key: string): Promise<T | null> {
  const raw = await r.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readHeartbeats(
  r: RedisClientType,
  tenant: string,
): Promise<Record<string, HeartbeatRecord>> {
  const prefix = `ns:${tenant}:`;
  const keys = await r.keys(tenantKey(tenant, "heartbeat:*"));
  const pairs = await Promise.all(
    keys.map(async (key) => {
      const record = await readJson<HeartbeatRecord>(r, key);
      return [key.startsWith(prefix) ? key.slice(prefix.length) : key, record] as const;
    }),
  );

  return Object.fromEntries(
    pairs.filter((pair): pair is readonly [string, HeartbeatRecord] => pair[1] !== null),
  );
}

// Reads the fine-grained phase object for each ticket (`ticket:{id}:status`).
// Missing, unparseable, or malformed phases degrade to empty (ADR-0005); the
// Kanban then falls back to `Ticket.status` (ADR-0004). We validate the shape
// so a stray value upstream (e.g. a plain string) can never surface as a phase.
async function readPhases(
  r: RedisClientType,
  tenant: string,
  tickets: Ticket[],
): Promise<Record<string, PhaseStatus>> {
  const entries = await Promise.all(
    tickets.map(async (ticket) => {
      const raw = await r.get(tenantKey(tenant, `ticket:${ticket.id}:status`));
      if (!raw) return [ticket.id, null] as const;
      try {
        const parsed = JSON.parse(raw) as unknown;
        return [ticket.id, isPhaseStatus(parsed) ? parsed : null] as const;
      } catch {
        return [ticket.id, null] as const;
      }
    }),
  );

  return Object.fromEntries(
    entries.filter((entry): entry is readonly [string, PhaseStatus] => entry[1] !== null),
  );
}

// The phase values the harness writes (crates/config/src/state.rs).
const VALID_PHASES = new Set(["planning", "building", "testing", "review_ready", "blocked"]);

function isPhaseStatus(value: unknown): value is PhaseStatus {
  if (typeof value !== "object" || value === null) return false;
  const phase = (value as { phase?: unknown }).phase;
  return typeof phase === "string" && VALID_PHASES.has(phase);
}

const GATE_PHASES: WorkflowPhase[] = [
  "planning",
  "building",
  "testing",
  "review_ready",
  "blocked",
];

async function readGateRecords(
  r: RedisClientType,
  tenant: string,
  ticketId: string,
): Promise<TicketGateRecord[]> {
  const entries: Array<TicketGateRecord | null> = await Promise.all(
    GATE_PHASES.map(async (phase) => {
      const payload = await readJson<unknown>(
        r,
        tenantKey(tenant, `ticket:${ticketId}:gate:${phase}`),
      );
      return payload ? { phase, payload } : null;
    }),
  );

  return entries.filter((entry): entry is TicketGateRecord => entry !== null);
}

async function readReviewRecords(
  r: RedisClientType,
  tenant: string,
  ticketId: string,
): Promise<TicketReviewRecord[]> {
  const prefix = `ns:${tenant}:ticket:${ticketId}:review:`;
  const keys = await r.keys(tenantKey(tenant, `ticket:${ticketId}:review:*`));
  const entries: Array<TicketReviewRecord | null> = await Promise.all(
    keys.map(async (key) => {
      const payload = await readJson<unknown>(r, key);
      if (!payload) return null;
      return {
        role: key.startsWith(prefix) ? key.slice(prefix.length) : key.split(":").at(-1) ?? "unknown",
        payload,
      };
    }),
  );

  return entries.filter((entry): entry is TicketReviewRecord => entry !== null);
}
