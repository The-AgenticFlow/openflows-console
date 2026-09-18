import type { TenantFleet } from "@/lib/domain/types";
import { mockFleet } from "@/lib/api/mock-data";

// Typed data source seam (ADR-0001 / ADR-0002).
// Mock mode returns bundled fixtures so the app runs standalone.
// TODO(T2): implement the real Redis reader behind this seam and route on
// OPENFLOWS_DATA_SOURCE === "real" (defensive per ADR-0005).

const DATA_SOURCE = process.env.OPENFLOWS_DATA_SOURCE ?? "mock";

export async function fetchFleet(): Promise<TenantFleet[]> {
  await new Promise((resolve) => setTimeout(resolve, 400));

  if (DATA_SOURCE === "real") {
    throw new Error("Real data source not implemented yet (T2). Keep OPENFLOWS_DATA_SOURCE=mock for development.");
  }

  return mockFleet;
}
