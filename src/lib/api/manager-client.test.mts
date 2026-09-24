import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchManagerFleet,
  fetchManagerTicketDetail,
  getManagerBaseUrl,
  listManagerTenants,
} from "./manager-client.ts";

test("getManagerBaseUrl defaults to localhost:3002 without trailing slashes", () => {
  const url = getManagerBaseUrl();
  assert.equal(url, "http://127.0.0.1:3002");
});

test("fetchManagerFleet maps manager fleet JSON into TenantFleet[]", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        total_tenants: 1,
        tenants: [
          {
            tenant: "acme",
            repository: "acme/repo",
            ticket_counts: { total: 1, open: 1 },
            tickets: [{ id: "T-001", title: "Test ticket", status: { type: "open" } }],
            phases: { "T-001": { phase: "planning" } },
            worker_slots: {},
            pending_prs: [],
            ci_readiness: "ready",
            heartbeats: {},
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  const fleets = await fetchManagerFleet();
  assert.equal(fleets.length, 1);
  assert.equal(fleets[0]?.tenant, "acme");
  assert.equal(fleets[0]?.tickets.length, 1);
  assert.equal(fleets[0]?.phases?.["T-001"]?.phase, "planning");
  assert.equal(fleets[0]?.ciReadiness, "ready");
});

test("fetchManagerTicketDetail maps ticket detail or returns null on 404", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  // Test 404
  globalThis.fetch = async () => new Response("Not found", { status: 404 });
  const missing = await fetchManagerTicketDetail("acme", "T-404");
  assert.equal(missing, null);

  // Test 200 OK
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        id: "T-001",
        title: "Test ticket",
        priority: 1,
        raw_status: { type: "open" },
        status_type: "open",
        stage: "open",
        stage_label: "Open",
        tenant: "acme",
        pr: { number: 42 },
        gates: [{ phase: "planning", payload: { approved_by: "sentinel" } }],
        reviews: [],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  const detail = await fetchManagerTicketDetail("acme", "T-001");
  assert.notEqual(detail, null);
  assert.equal(detail?.ticket.id, "T-001");
  assert.equal(detail?.tenant, "acme");
  assert.equal((detail?.pr as { number: number })?.number, 42);
  assert.equal(detail?.gates.length, 1);
});

test("listManagerTenants returns sorted tenant names", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify([
        { name: "beta", repository: "org/beta" },
        { name: "alpha", repository: "org/alpha" },
      ]),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  const tenants = await listManagerTenants();
  assert.deepEqual(tenants, ["alpha", "beta"]);
});
