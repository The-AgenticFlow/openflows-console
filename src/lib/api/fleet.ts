// Placeholder fleet data source.
// TODO(T2): replace with the real Redis reader (tenant-namespaced) behind the
// typed data layer (ADR-0001 / ADR-0002). Defensive per ADR-0005.

import type { TenantFleet } from "@/lib/domain/types";

export async function fetchFleet(): Promise<TenantFleet[]> {
  await new Promise((resolve) => setTimeout(resolve, 400));

  return [
    {
      tenant: "acme",
      tickets: [
        { id: "T-001", title: "Add billing webhook", priority: 1, status: { type: "merged", worker_id: "forge-1", pr_number: 42 } },
        { id: "T-002", title: "Fix auth rate limit", priority: 2, status: { type: "in_progress", worker_id: "forge-1" } },
        { id: "T-003", title: "Migrate to Postgres", priority: 0, status: { type: "awaiting_human", worker_id: "forge-2", reason: "ambiguous spec" } },
        { id: "T-004", title: "Add retry on 429", priority: 3, status: { type: "open" } },
      ],
      workerSlots: {
        "forge-1": { id: "forge-1", status: { type: "working", ticket_id: "T-002" } },
        "forge-2": { id: "forge-2", status: { type: "suspended", ticket_id: "T-003", reason: "awaiting human" } },
        "sentinel": { id: "sentinel", status: { type: "idle" } },
      },
      pendingPrs: [
        { number: 42, ticket_id: "T-001", base_branch: "main", mergeable: true },
      ],
      ciReadiness: "ready",
    },
  ];
}
