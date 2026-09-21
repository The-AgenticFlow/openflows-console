import type { TenantFleet } from "@/lib/domain/types";

// Bundled sample data for mock mode. Lets contributors develop without a
// live OpenFlows deployment. Replace freely with more realistic fixtures.
const now = Date.now();

export const mockFleet: TenantFleet[] = [
  {
    tenant: "acme",
    tickets: [
      {
        id: "T-001",
        title: "Add billing webhook",
        priority: 1,
        status: { type: "merged", worker_id: "forge-1", pr_number: 42 },
      },
      {
        id: "T-002",
        title: "Fix auth rate limit",
        priority: 2,
        status: { type: "in_progress", worker_id: "forge-1" },
      },
      {
        id: "T-003",
        title: "Migrate to Postgres",
        priority: 0,
        status: {
          type: "awaiting_human",
          worker_id: "forge-2",
          reason: "ambiguous spec",
        },
      },
      {
        id: "T-004",
        title: "Add retry on 429",
        priority: 3,
        status: { type: "open" },
      },
    ],
    phases: {
      "T-002": { phase: "building", role: "forge-1" },
      "T-003": { phase: "review_ready", role: "forge-2" },
    },
    workerSlots: {
      "forge-1": {
        id: "forge-1",
        status: { type: "working", ticket_id: "T-002" },
      },
      "forge-2": {
        id: "forge-2",
        status: { type: "suspended", ticket_id: "T-003", reason: "awaiting human" },
      },
      sentinel: { id: "sentinel", status: { type: "idle" } },
    },
    pendingPrs: [
      {
        number: 42,
        ticket_id: "T-001",
        title: "Add billing webhook",
        head_branch: "forge-1/T-001",
        base_branch: "main",
        mergeable: true,
        worker_id: "forge-1",
      },
    ],
    heartbeats: {
      "heartbeat:forge-T-T-002": {
        ts: now - 35_000,
        ws_id: "ws-forge-1",
        status: "running",
      },
      "heartbeat:forge-T-T-003": {
        ts: now - 135_000,
        ws_id: "ws-forge-2",
        status: "running",
      },
    },
    ciReadiness: "ready",
  },
  {
    tenant: "globex",
    tickets: [],
    workerSlots: {
      "forge-1": { id: "forge-1", status: { type: "idle" } },
      sentinel: { id: "sentinel", status: { type: "idle" } },
    },
    pendingPrs: [],
    heartbeats: {},
    ciReadiness: "missing",
  },
];
