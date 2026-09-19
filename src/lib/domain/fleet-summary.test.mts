// Fleet summary tests: pin the dashboard's derived view model to the
// OpenFlows SharedStore contracts before the UI renders it.
import assert from "node:assert/strict";
import test from "node:test";

import { summarizeFleet } from "./fleet-summary.ts";
import type { TenantFleet } from "./types.ts";

test("summarizeFleet derives operator-facing counts and escalations", () => {
  const now = 1_800_000_000_000;
  const fleet: TenantFleet = {
    tenant: "acme",
    tickets: [
      { id: "T-001", title: "Ship auth", priority: 1, status: { type: "open" } },
      {
        id: "T-002",
        title: "Fix billing",
        priority: 0,
        status: { type: "in_progress", worker_id: "forge-1" },
      },
      {
        id: "T-003",
        title: "Clarify import",
        priority: 2,
        status: {
          type: "awaiting_human",
          worker_id: "forge-2",
          reason: "ambiguous spec",
        },
      },
    ],
    workerSlots: {
      "forge-1": {
        id: "forge-1",
        status: { type: "working", ticket_id: "T-002" },
        workspace_id: "ws-forge-1",
      },
      "forge-2": {
        id: "forge-2",
        status: {
          type: "suspended",
          ticket_id: "T-003",
          reason: "awaiting human",
        },
      },
      sentinel: { id: "sentinel", status: { type: "idle" } },
    },
    pendingPrs: [
      {
        number: 42,
        ticket_id: "T-002",
        head_branch: "forge-1/T-002",
        base_branch: "main",
        mergeable: true,
      },
    ],
    heartbeats: {
      "heartbeat:forge-T-T-002": {
        ts: now - 45_000,
        ws_id: "ws-forge-1",
        status: "running",
      },
      "heartbeat:forge-T-T-003": {
        ts: now - 150_000,
        ws_id: "ws-forge-2",
        status: "running",
      },
    },
    ciReadiness: "ready",
  };

  const summary = summarizeFleet(fleet, now);

  assert.equal(summary.ticketCounts.total, 3);
  assert.equal(summary.ticketCounts.byStatus.open, 1);
  assert.equal(summary.ticketCounts.byStatus.in_progress, 1);
  assert.equal(summary.ticketCounts.byStatus.awaiting_human, 1);
  assert.equal(summary.workerCounts.total, 3);
  assert.equal(summary.workerCounts.byStatus.working, 1);
  assert.equal(summary.workerCounts.byStatus.suspended, 1);
  assert.equal(summary.workerCounts.byStatus.idle, 1);
  assert.equal(summary.heartbeatCounts.running, 1);
  assert.equal(summary.heartbeatCounts.stale, 1);
  assert.equal(summary.pendingPrCount, 1);
  assert.deepEqual(summary.escalations.map((ticket) => ticket.id), ["T-003"]);
});
