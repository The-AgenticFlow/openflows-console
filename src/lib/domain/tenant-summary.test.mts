// Tenant summary tests: keep the Tenants page derived model aligned with the
// OpenFlows tenant namespace contract (`ns:{tenant}:*`).
import assert from "node:assert/strict";
import test from "node:test";

import { summarizeTenants } from "./tenant-summary.ts";
import type { TenantFleet } from "./types.ts";

test("summarizeTenants derives per-tenant state counts and activity", () => {
  const fleet: TenantFleet[] = [
    {
      tenant: "acme",
      tickets: [
        { id: "T-001", title: "Open", status: { type: "open" } },
        {
          id: "T-002",
          title: "Active",
          status: { type: "in_progress", worker_id: "forge-1" },
        },
        {
          id: "T-003",
          title: "Needs human",
          status: { type: "awaiting_human", worker_id: "forge-2" },
        },
      ],
      workerSlots: {
        "forge-1": { id: "forge-1", status: { type: "working", ticket_id: "T-002" } },
        sentinel: { id: "sentinel", status: { type: "idle" } },
      },
      pendingPrs: [{ number: 42, ticket_id: "T-001" }],
      ciReadiness: "ready",
    },
    {
      tenant: "globex",
      tickets: [],
      workerSlots: {},
      pendingPrs: [],
      ciReadiness: "missing",
    },
  ];

  const summaries = summarizeTenants(fleet);

  assert.deepEqual(
    summaries.map((summary) => summary.name),
    ["acme", "globex"],
  );
  assert.equal(summaries[0].ticketCount, 3);
  assert.equal(summaries[0].activeTicketCount, 1);
  assert.equal(summaries[0].escalationCount, 1);
  assert.equal(summaries[0].workerCount, 2);
  assert.equal(summaries[0].activeWorkerCount, 1);
  assert.equal(summaries[0].pendingPrCount, 1);
  assert.equal(summaries[0].isActive, true);
  assert.equal(summaries[1].isActive, false);
});
