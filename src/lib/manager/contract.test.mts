// Contract helper tests: permission rules, tenant action availability, error
// copy and input validators mirror what Manager enforces.
import assert from "node:assert/strict";
import test from "node:test";

import {
  AGENT_ERROR_CODES,
  AGENT_STATUSES,
  canAdminister,
  canOperate,
  describeError,
  failedAgentChats,
  isOperationActive,
  runtimeNeedsAttention,
  setupFailureMessage,
  slugify,
  tenantActions,
  tenantStateLabel,
  validateGithubLogin,
  validateOrgName,
  validateRepositoryUrl,
} from "./contract.ts";

test("roles: admin administers, admin+developer operate, viewer neither", () => {
  assert.deepEqual([canAdminister("admin"), canAdminister("developer"), canAdminister("viewer")], [true, false, false]);
  assert.deepEqual([canOperate("admin"), canOperate("developer"), canOperate("viewer")], [true, true, false]);
});

test("tenant actions follow state and role", () => {
  assert.deepEqual(tenantActions({ observed_state: "running" }, "admin"), ["stop", "clean", "delete"]);
  assert.deepEqual(tenantActions({ observed_state: "running" }, "developer"), ["stop"]);
  assert.deepEqual(tenantActions({ observed_state: "paused" }, "developer"), ["start"]);
  assert.deepEqual(tenantActions({ observed_state: "failed" }, "admin"), ["start", "clean", "delete"]);
  assert.deepEqual(tenantActions({ observed_state: "provisioning" }, "admin"), ["delete"]);
  assert.deepEqual(tenantActions({ observed_state: "provisioning" }, "developer"), []);
  assert.deepEqual(tenantActions({ observed_state: "deleting" }, "admin"), []);
  assert.deepEqual(tenantActions({ observed_state: "running" }, "viewer"), []);
});

test("tenant state labels are product language", () => {
  assert.equal(tenantStateLabel({ observed_state: "paused", desired_state: "paused" }).label, "Stopped");
  assert.equal(tenantStateLabel({ observed_state: "running", desired_state: "running" }).tone, "success");
});

test("operation activity and error copy", () => {
  assert.equal(isOperationActive("queued"), true);
  assert.equal(isOperationActive("succeeded"), false);
  assert.match(describeError("ORG_ADMIN_REQUIRED").message, /admin/i);
  assert.equal(describeError("SOMETHING_NEW", "fallback").message, "fallback");
});

test("validators", () => {
  assert.equal(slugify("Acme Eng!"), "acme-eng");
  assert.ok(validateOrgName("a"));
  assert.equal(validateOrgName("Acme"), null);
  assert.equal(validateGithubLogin("octo-cat"), null);
  assert.ok(validateGithubLogin("-bad-"));
  assert.equal(validateRepositoryUrl("https://github.com/acme/api"), null);
  assert.equal(validateRepositoryUrl("https://github.com/acme/api.git"), null);
  assert.ok(validateRepositoryUrl("http://github.com/acme/api"));
  assert.ok(validateRepositoryUrl("https://evil.example/acme/api"));
});

test("setup failures explain the cause in product language and never echo raw codes", () => {
  assert.match(setupFailureMessage("CODER_ORG_FAILED"), /Coder/);
  assert.match(setupFailureMessage("PROVISIONER_NOT_READY"), /provisioner/i);
  assert.equal(setupFailureMessage(null), "Setup did not finish.");
  assert.equal(setupFailureMessage("SOMETHING_NEW"), "Setup did not finish.");
});

test("runtime attention: only a silent runtime needs the operator", () => {
  const at = (health: "inactive" | "starting" | "healthy" | "unresponsive" | "restart_required") => ({ health, registered_at: null, last_heartbeat_at: null });
  assert.equal(runtimeNeedsAttention(at("unresponsive")), true);
  assert.equal(runtimeNeedsAttention(at("restart_required")), true);
  for (const ok of ["healthy", "starting", "inactive"] as const) assert.equal(runtimeNeedsAttention(at(ok)), false, ok);
  // An older Manager sends no runtime block at all: never alert on absence.
  assert.equal(runtimeNeedsAttention(undefined), false);
  assert.equal(runtimeNeedsAttention(null), false);
});

test("failed agent chats: only chats in error count, absence is empty", () => {
  const chat = (status: string, ticket_id: string) => ({ ticket_id, role: "forge", status, error_code: null, retryable: null, started_at: "2026-11-03T00:00:00Z", updated_at: null });
  const out = failedAgentChats([chat("running", "A"), chat("error", "B"), chat("completed", "C"), chat("error", "D")]);
  assert.deepEqual(out.map((c) => c.ticket_id), ["B", "D"]);
  assert.deepEqual(failedAgentChats([]), []);
  assert.deepEqual(failedAgentChats(undefined), []);
  assert.ok(AGENT_ERROR_CODES.length > 0 && AGENT_STATUSES.includes("error"));
});
