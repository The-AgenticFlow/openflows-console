import type { RedisClientType } from "redis";
import type {
  CiReadiness,
  PendingPr,
  TenantFleet,
  Ticket,
  WorkerSlot,
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
  return [...tenants].sort();
}

export async function readTenantFleet(tenant: string): Promise<TenantFleet> {
  const r = await getRedis();
  const [tickets, workerSlots, pendingPrs, ciRaw] = await Promise.all([
    readJson<Ticket[]>(r, tenantKey(tenant, "tickets")),
    readJson<Record<string, WorkerSlot>>(r, tenantKey(tenant, "worker_slots")),
    readJson<PendingPr[]>(r, tenantKey(tenant, "pending_prs")),
    readJson<{ type?: string }>(r, tenantKey(tenant, "ci_readiness")),
  ]);

  return {
    tenant,
    tickets: tickets ?? [],
    workerSlots: workerSlots ?? {},
    pendingPrs: pendingPrs ?? [],
    ciReadiness: ciRaw?.type as CiReadiness | undefined,
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
