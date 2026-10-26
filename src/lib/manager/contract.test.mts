// Contract helper tests: permission rules, tenant action availability, error
// copy and input validators mirror what Manager enforces.
import assert from "node:assert/strict";
import test from "node:test";

import {
  canAdminister,
  canOperate,
  describeError,
  isOperationActive,
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
  assert.deepEqual(tenantActions({ observed_state: "provisioning" }, "admin"), []);
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
