// Kanban reconciliation tests: pin the ADR-0004 column mapping (phase-derived
// with `Ticket.status` fallback and terminal override) to the data layer before
// the board renders it.
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBoard,
  columnForTicket,
  workerForTicket,
} from "./kanban.ts";
import type { TenantFleet, Ticket } from "./types.ts";

function makeFleet(tickets: Ticket[], phases: TenantFleet["phases"] = {}): TenantFleet {
  return {
    tenant: "acme",
    tickets,
    phases,
    workerSlots: {
      "forge-1": { id: "forge-1", status: { type: "working", ticket_id: "T-001" } },
      "forge-2": { id: "forge-2", status: { type: "idle" } },
    },
    pendingPrs: [],
  };
}

test("columnForTicket derives from phase when present", () => {
  assert.equal(columnForTicket({ id: "T-1", title: "t", status: { type: "in_progress", worker_id: "forge-1" } }, { phase: "testing" }), "testing");
  assert.equal(columnForTicket({ id: "T-2", title: "t", status: { type: "open" } }, { phase: "review_ready" }), "review");
  assert.equal(columnForTicket({ id: "T-3", title: "t", status: { type: "in_progress", worker_id: "forge-1" } }, { phase: "blocked" }), "blocked");
});

test("columnForTicket falls back to Ticket.status when phase is absent", () => {
  assert.equal(columnForTicket({ id: "T-1", title: "t", status: { type: "open" } }, undefined), "planning");
  assert.equal(columnForTicket({ id: "T-2", title: "t", status: { type: "assigned", worker_id: "forge-1" } }, undefined), "building");
  assert.equal(columnForTicket({ id: "T-3", title: "t", status: { type: "in_progress", worker_id: "forge-1" } }, undefined), "building");
});

test("columnForTicket lets terminal/escalation status override the phase", () => {
  assert.equal(columnForTicket({ id: "T-1", title: "t", status: { type: "merged", worker_id: "forge-1", pr_number: 1 } }, { phase: "testing" }), "merged");
  assert.equal(columnForTicket({ id: "T-2", title: "t", status: { type: "completed", worker_id: "forge-1" } }, { phase: "building" }), "completed");
  assert.equal(columnForTicket({ id: "T-3", title: "t", status: { type: "awaiting_human", worker_id: "forge-1" } }, { phase: "review_ready" }), "awaiting_human");
  assert.equal(columnForTicket({ id: "T-4", title: "t", status: { type: "failed", worker_id: "forge-1" } }, { phase: "planning" }), "failed");
  assert.equal(columnForTicket({ id: "T-5", title: "t", status: { type: "exhausted", worker_id: "forge-1", attempts: 3 } }, { phase: "planning" }), "exhausted");
});

test("workerForTicket prefers the assigned worker slot, falling back to status", () => {
  const fleet = makeFleet([{ id: "T-001", title: "t", status: { type: "in_progress", worker_id: "forge-1" } }]);
  assert.equal(workerForTicket(fleet, fleet.tickets[0]), "forge-1");

  const slotless = makeFleet([{ id: "T-999", title: "t", status: { type: "in_progress", worker_id: "forge-2" } }]);
  assert.equal(workerForTicket(slotless, slotless.tickets[0]), "forge-2");
});

test("buildBoard maps every ticket into a column", () => {
  const fleet = makeFleet(
    [
      { id: "T-001", title: "Merge me", priority: 1, status: { type: "merged", worker_id: "forge-1", pr_number: 9 } },
      { id: "T-002", title: "Build it", priority: 2, status: { type: "in_progress", worker_id: "forge-1" } },
      { id: "T-003", title: "Open one", priority: 0, status: { type: "open" } },
    ],
    { "T-002": { phase: "testing" } },
  );

  const board = buildBoard(fleet);
  const byId = Object.fromEntries(board.cards.map((card) => [card.ticket.id, card]));

  assert.equal(byId["T-001"].column, "merged");
  assert.equal(byId["T-002"].column, "testing");
  assert.equal(byId["T-003"].column, "planning");
  assert.equal(board.columns.length, 10);
});
