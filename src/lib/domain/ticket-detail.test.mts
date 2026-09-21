// Ticket detail tests: protect the lifecycle view model that reconciles the
// coarse ticket status with ticket-scoped Redis keys.
import assert from "node:assert/strict";
import test from "node:test";

import { buildTicketDetailView } from "./ticket-detail.ts";
import type { TicketDetail } from "./types.ts";

test("buildTicketDetailView reconciles phase and status while preserving lifecycle records", () => {
  const detail: TicketDetail = {
    tenant: "acme",
    ticket: {
      id: "T-123",
      title: "Ship it",
      status: { type: "in_progress", worker_id: "forge-1" },
    },
    phase: { phase: "review_ready", role: "forge-1", ts: 1_700_000 },
    gates: [{ phase: "planning", payload: { approved_by: "sentinel", notes: "solid" } }],
    reviews: [{ role: "sentinel", payload: { verdict: "approve", pr_number: 42 } }],
    pr: { number: 42, head_branch: "feat/t-123" },
    handoff: { summary: "Ready for review" },
    deployment: { merged: true, sha: "abc123" },
  };

  const view = buildTicketDetailView(detail);

  assert.equal(view.workflow.phaseLabel, "review ready");
  assert.equal(view.workflow.statusLabel, "in progress");
  assert.equal(view.workflow.reconciliation, "Phase review ready with ticket status in progress");
  assert.deepEqual(
    view.lifecycle.map((section) => [section.id, section.state]),
    [
      ["gate", "available"],
      ["review", "available"],
      ["pr", "available"],
      ["handoff", "available"],
      ["deployment", "available"],
      ["escalation", "empty"],
    ],
  );
});

test("buildTicketDetailView gives graceful empty lifecycle states for missing data", () => {
  const detail: TicketDetail = {
    tenant: "acme",
    ticket: {
      id: "T-404",
      title: "Waiting",
      status: { type: "awaiting_human", worker_id: "forge-1", reason: "Need credentials" },
    },
    gates: [],
    reviews: [],
  };

  const view = buildTicketDetailView(detail);

  assert.equal(view.workflow.phaseLabel, "not reported");
  assert.equal(view.workflow.statusLabel, "awaiting human");
  assert.equal(view.workflow.reconciliation, "No phase key; using ticket status awaiting human");
  assert.equal(view.escalation, "Need credentials");
  assert.deepEqual(
    view.lifecycle.map((section) => [section.id, section.state]),
    [
      ["gate", "empty"],
      ["review", "empty"],
      ["pr", "empty"],
      ["handoff", "empty"],
      ["deployment", "empty"],
      ["escalation", "available"],
    ],
  );
});
