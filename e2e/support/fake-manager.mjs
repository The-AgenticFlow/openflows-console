// Fake OpenFlows Manager for the end-to-end tests.
//
// The Console talks only to Manager's /api/v1 (ADR-0006), so the browser tests
// run the real Console against this small stand-in instead of a full stack
// (Manager, Coder, Postgres, GitHub). That keeps them hermetic and fast and
// lets them exercise states that are hard to reach for real, such as an agent
// failing on an AI usage limit.
//
// Contract with the tests:
// - A request is "signed in" when it carries the `of_session=e2e-session`
//   cookie; anything else on a protected route is 401, as Manager does.
// - Fixtures are static. The invitation token `good-token` is valid and
//   `POST /api/v1/invitations/accept` with it succeeds; any other token is a
//   404, which is how Manager reports an unusable invitation (it does not say
//   why). The fake keeps no state, so a test can be retried or run in any order.
// - Unknown routes return 404 JSON, so a Console page that asks for something
//   this fake does not model degrades the way it would on an older Manager.
// This is test tooling. It never listens in production and holds no secrets.
import http from "node:http";

const PORT = Number(process.env.FAKE_MANAGER_PORT ?? 3999);
const ORG = "11111111-1111-4111-8111-111111111111";
const TENANT = "22222222-2222-4222-8222-222222222222";
const CONNECTION = "33333333-3333-4333-8333-333333333333";
const now = () => new Date().toISOString();

const org = { organization_id: ORG, slug: "e2e", display_name: "E2E Org", role: "admin", status: "ready" };
const tenant = { id: TENANT, organization_id: ORG, slug: "finewa", github_repository_id: 4242, desired_state: "running", observed_state: "running", fleet_size: 1 };
const chat = (over) => ({ ticket_id: "T-1", role: "forge", status: "running", error_code: null, retryable: null, started_at: now(), updated_at: now(), ...over });

const routes = [
  ["GET", /^\/api\/v1\/auth\/csrf$/, () => ({ csrf_token: "e2e-csrf" }), false],
  ["GET", /^\/api\/v1\/me$/, () => ({ id: "u1", display_name: "e2e-user", status: "active" })],
  ["GET", /^\/api\/v1\/organizations$/, () => ({ items: [org], next_cursor: null })],
  ["GET", new RegExp(`^/api/v1/organizations/${ORG}/tenants$`), () => ({ items: [tenant], next_cursor: null })],
  ["GET", new RegExp(`^/api/v1/organizations/${ORG}/tenants/${TENANT}$`), () => tenant],
  [
    "GET",
    new RegExp(`^/api/v1/organizations/${ORG}/tenants/${TENANT}/status$`),
    () => ({ tenant_id: TENANT, workspaces: [{ state: "running", count: 2 }], latest_operation: null, runtime: { health: "healthy", registered_at: now(), last_heartbeat_at: now() } }),
  ],
  [
    "GET",
    new RegExp(`^/api/v1/organizations/${ORG}/tenants/${TENANT}/agent-activity$`),
    () => ({
      chats: [
        chat({ ticket_id: "T-CI-001", status: "error", error_code: "AI_USAGE_LIMIT", retryable: false }),
        chat({ ticket_id: "T-API-002", role: "sentinel", status: "running" }),
      ],
    }),
  ],
  ["GET", new RegExp(`^/api/v1/organizations/${ORG}/github/connections$`), () => ({ items: [{ id: CONNECTION, organization_id: ORG, installation_id: 1, account_type: "User", account_login: "e2e-user", status: "active", connected_at: now(), last_reconciled_at: now() }] })],
  ["GET", new RegExp(`^/api/v1/organizations/${ORG}/github/connections/${CONNECTION}/repositories$`), () => ({ items: [{ id: 4242, full_name: "e2e-user/finewa" }] })],
  ["GET", new RegExp(`^/api/v1/organizations/${ORG}/invitations$`), () => ({ items: [] })],
  ["GET", /^\/auth\/github\/start$/, () => "sign-in", false],
];

function send(res, status, body) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "content-type": typeof body === "string" ? "text/plain" : "application/json" });
  res.end(text);
}

const signedIn = (req) => /(?:^|;\s*)of_session=e2e-session(?:;|$)/.test(req.headers.cookie ?? "");

http
  .createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    if (url.pathname === "/__health") return send(res, 200, "ok");

    if (url.pathname === "/api/v1/invitations/preview" && req.method === "GET") {
      if (!signedIn(req)) return send(res, 401, { code: "UNAUTHENTICATED" });
      if (url.searchParams.get("token") !== "good-token") return send(res, 404, { code: "RESOURCE_NOT_FOUND" });
      return send(res, 200, { organization: { slug: "e2e", display_name: "E2E Org" }, role: "developer", invited_by: "an-admin", expires_at: new Date(Date.now() + 6 * 864e5).toISOString() });
    }
    if (url.pathname === "/api/v1/invitations/accept" && req.method === "POST") {
      if (!signedIn(req)) return send(res, 401, { code: "UNAUTHENTICATED" });
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        if (JSON.parse(raw || "{}").token !== "good-token") return send(res, 404, { code: "RESOURCE_NOT_FOUND" });
        send(res, 200, { organization_id: ORG });
      });
      return;
    }

    const hit = routes.find(([m, re]) => m === req.method && re.test(url.pathname));
    if (!hit) return send(res, 404, { code: "RESOURCE_NOT_FOUND" });
    const [, , handler, protectedRoute = true] = hit;
    if (protectedRoute && !signedIn(req)) return send(res, 401, { code: "UNAUTHENTICATED" });
    send(res, 200, handler());
  })
  .listen(PORT, "127.0.0.1", () => console.log(`fake manager on ${PORT}`));
