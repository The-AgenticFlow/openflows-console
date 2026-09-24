import { fetchManagerFleet } from "@/lib/api/manager-client";
import { mockFleet } from "@/lib/api/mock-data";
import { listTenants, readTenantFleet } from "@/lib/api/redis-reader";
import { getEnv } from "@/lib/config/env";
import type { TenantFleet } from "@/lib/domain/types";

// Typed data source seam (ADR-0001 / ADR-0002 / ADR-0005).
// - "mock" (default): bundled fixtures, no infrastructure needed for dev.
// - "real": reads tenant-namespaced Redis keys via the typed reader.
// - "manager": queries the central OpenFlows Manager HTTP service (/api/v1).
// Defensive: missing/unparseable keys degrade to empty values, and unknown
// upstream fields are ignored (never fatal).
const DATA_SOURCE = getEnv("OPENFLOWS_DATA_SOURCE") ?? "mock";

export async function fetchFleet(): Promise<TenantFleet[]> {
  if (DATA_SOURCE === "manager") {
    return fetchManagerFleet();
  }

  if (DATA_SOURCE === "real") {
    const tenants = await listTenants();
    return Promise.all(tenants.map((tenant) => readTenantFleet(tenant)));
  }

  await new Promise((resolve) => setTimeout(resolve, 400));
  return mockFleet;
}
