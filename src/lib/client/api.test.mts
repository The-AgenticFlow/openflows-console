// API client tests with a stubbed fetch: Manager's CSRF token is fetched and
// sent on mutations, every mutation carries an Idempotency-Key, a CSRF_FAILED
// is retried once with a fresh token, and Manager's error envelope becomes a
// safe ConsoleError (known codes use our copy, never raw upstream text).
import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";

import { api, ConsoleError, resetCsrfCache } from "./api.ts";

type Call = { url: string; init: RequestInit };
let calls: Call[] = [];
let script: Array<() => Response> = [];

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => {
  resetCsrfCache();
  calls = [];
  script = [];
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const next = script.shift();
    if (!next) throw new Error(`unexpected fetch ${init.method ?? "GET"} ${url}`);
    return next();
  }) as typeof fetch;
});

test("mutations fetch CSRF, send it with an idempotency key", async () => {
  script = [() => json({ csrf_token: "tok1" }), () => json({ operation_id: "op1", status: "queued" }, 202)];
  const r = await api.createOrganization("acme", "Acme", "key-123456");
  assert.equal(r.operation_id, "op1");
  const post = calls[1];
  assert.equal(post.url, "/api/v1/organizations");
  const h = post.init.headers as Record<string, string>;
  assert.equal(h["x-csrf-token"], "tok1");
  assert.equal(h["idempotency-key"], "key-123456");
  assert.deepEqual(JSON.parse(post.init.body as string), { slug: "acme", display_name: "Acme" });
});

test("GET sends neither CSRF nor idempotency key", async () => {
  script = [() => json({ items: [], next_cursor: null })];
  await api.listOrganizations();
  const h = calls[0].init.headers as Record<string, string>;
  assert.equal(h["x-csrf-token"], undefined);
  assert.equal(h["idempotency-key"], undefined);
});

test("CSRF_FAILED triggers one refresh and retry", async () => {
  script = [
    () => json({ csrf_token: "old" }),
    () => json({ error: { code: "CSRF_FAILED", message: "x", retryable: false } }, 401),
    () => json({ csrf_token: "new" }),
    () => json({ operation_id: "op2", status: "queued" }, 202),
  ];
  const r = await api.tenantAction("org1", "t1", "stop");
  assert.equal(r.operation_id, "op2");
  assert.equal((calls[3].init.headers as Record<string, string>)["x-csrf-token"], "new");
});

test("errors become safe ConsoleError with product copy", async () => {
  script = [
    () => json({ csrf_token: "t" }),
    () => json({ error: { code: "ORG_ADMIN_REQUIRED", message: "SELECT * FROM secrets", request_id: "rid-1", retryable: false } }, 403),
  ];
  await assert.rejects(api.removeMember("o", "u"), (e: unknown) => {
    assert.ok(e instanceof ConsoleError);
    assert.equal(e.code, "ORG_ADMIN_REQUIRED");
    assert.equal(e.requestId, "rid-1");
    assert.doesNotMatch(e.message, /SELECT/);
    assert.ok(e.recovery);
    return true;
  });
});

test("network failure is a retryable ConsoleError", async () => {
  globalThis.fetch = (async () => { throw new TypeError("fetch failed"); }) as typeof fetch;
  await assert.rejects(api.listTenants("o"), (e: unknown) => e instanceof ConsoleError && e.retryable && e.status === 0);
});

test("agent activity is a plain GET on the tenant, with no CSRF", async () => {
  script = [() => json({ chats: [{ ticket_id: "T-1", role: "forge", status: "error", error_code: "AI_USAGE_LIMIT", retryable: false, started_at: "2026-11-03T00:00:00Z", updated_at: null }] })];
  const r = await api.getAgentActivity("org 1", "ten/1");
  assert.equal(calls[0].url, "/api/v1/organizations/org%201/tenants/ten%2F1/agent-activity");
  assert.equal(r.chats[0].error_code, "AI_USAGE_LIMIT");
  assert.equal((calls[0].init.headers as Record<string, string>)["x-csrf-token"], undefined);
});

test("operation history pages with the cursor Manager returned", async () => {
  script = [() => json({ items: [], next_cursor: null }), () => json({ items: [], next_cursor: null })];
  await api.listOperations("o1");
  await api.listOperations("o1", "cur sor");
  assert.equal(calls[0].url, "/api/v1/organizations/o1/operations?limit=50");
  assert.equal(calls[1].url, "/api/v1/organizations/o1/operations?limit=50&after=cur%20sor");
});

test("accepting an invitation sends the token with CSRF and an idempotency key", async () => {
  script = [() => json({ csrf_token: "t" }), () => json({ organization_id: "o1" })];
  const r = await api.acceptInvitation("secret-token");
  assert.equal(r.organization_id, "o1");
  assert.deepEqual(JSON.parse(calls[1].init.body as string), { token: "secret-token" });
  assert.ok((calls[1].init.headers as Record<string, string>)["idempotency-key"]);
});
