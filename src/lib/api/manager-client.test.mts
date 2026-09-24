import assert from "node:assert/strict";
import test from "node:test";

import {
  createAiProvider,
  fetchAiModels,
  fetchAiProviders,
  fetchGlobalModelPolicy,
  fetchManagerFleet,
  fetchManagerTicketDetail,
  getManagerBaseUrl,
  listManagerTenants,
  resolveModelForRole,
  setGlobalModelPolicy,
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

test("fetchAiProviders and createAiProvider work with masked secrets", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (url, init) => {
    if (init?.method === "POST") {
      const body = JSON.parse(init.body as string);
      return new Response(
        JSON.stringify({
          id: "prov-1",
          type: body.provider_type,
          name: body.name,
          display_name: body.display_name,
          base_url: "",
          enabled: true,
          has_api_key: Boolean(body.api_key),
          created_at: "2026-09-24T10:00:00Z",
          updated_at: "2026-09-24T10:00:00Z",
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify([
        {
          id: "prov-1",
          type: "anthropic",
          name: "claude-main",
          display_name: "Claude",
          base_url: "",
          enabled: true,
          has_api_key: true,
          created_at: "2026-09-24T10:00:00Z",
          updated_at: "2026-09-24T10:00:00Z",
        },
      ]),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  const created = await createAiProvider({
    provider_type: "anthropic",
    name: "claude-main",
    display_name: "Claude",
    api_key: "sk-secret-key-12345",
  });
  assert.equal(created.id, "prov-1");
  assert.equal(created.has_api_key, true);

  const providers = await fetchAiProviders();
  assert.equal(providers.length, 1);
  assert.equal(providers[0]?.name, "claude-main");

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify([
        {
          id: "m-1",
          ai_provider_id: "prov-1",
          model: "claude-3-7-sonnet",
          display_name: "Claude 3.7",
          context_limit: 200000,
          is_default: true,
          enabled: true,
          created_at: "2026-09-24T10:00:00Z",
          updated_at: "2026-09-24T10:00:00Z",
        },
      ]),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  const models = await fetchAiModels();
  assert.equal(models.length, 1);
  assert.equal(models[0]?.model, "claude-3-7-sonnet");
});

test("model policy GET, PUT and role resolution", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (url, init) => {
    const urlStr = url.toString();
    if (urlStr.includes("/resolve")) {
      return new Response(
        JSON.stringify({
          role: "forge",
          model: "claude-3-7-sonnet",
          source: "role_policy",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (init?.method === "PUT") {
      const body = JSON.parse(init.body as string);
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({
        default_model: "gpt-4o",
        roles: { forge: "claude-3-7-sonnet" },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  const policy = await fetchGlobalModelPolicy();
  assert.equal(policy.default_model, "gpt-4o");
  assert.equal(policy.roles["forge"], "claude-3-7-sonnet");

  const updated = await setGlobalModelPolicy({
    default_model: "claude-3-7-sonnet",
    roles: {},
  });
  assert.equal(updated.default_model, "claude-3-7-sonnet");

  const resolved = await resolveModelForRole("forge");
  assert.equal(resolved.role, "forge");
  assert.equal(resolved.model, "claude-3-7-sonnet");
  assert.equal(resolved.source, "role_policy");
});
