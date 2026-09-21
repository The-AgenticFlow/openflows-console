// Tenant add tests: protect the Console-to-CLI contract for
// `openflows tenant add`, including the upstream tenant name charset.
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTenantAddArgs,
  normalizeTenantAddInput,
} from "./tenant-add.ts";

test("normalizeTenantAddInput accepts owner/repo and an OpenFlows-safe tenant name", () => {
  const input = normalizeTenantAddInput({
    repo: "The-AgenticFlow/openflows-console",
    name: "trial_01.alpha-beta",
  });

  assert.deepEqual(input, {
    repo: "The-AgenticFlow/openflows-console",
    name: "trial_01.alpha-beta",
  });
});

test("normalizeTenantAddInput omits a blank optional tenant name", () => {
  const input = normalizeTenantAddInput({
    repo: "The-AgenticFlow/openflows-console",
    name: "   ",
  });

  assert.deepEqual(input, {
    repo: "The-AgenticFlow/openflows-console",
  });
});

test("normalizeTenantAddInput rejects malformed repo slugs before invoking the CLI", () => {
  assert.throws(
    () => normalizeTenantAddInput({ repo: "openflows-console", name: "" }),
    /repository must use owner\/repo/i,
  );
});

test("normalizeTenantAddInput rejects tenant names that Redis namespace operations cannot use", () => {
  assert.throws(
    () =>
      normalizeTenantAddInput({
        repo: "The-AgenticFlow/openflows-console",
        name: "trial tenant",
      }),
    /ASCII letters, numbers, '.', '_' and '-'/,
  );
});

test("buildTenantAddArgs preserves the upstream openflows tenant add argument order", () => {
  assert.deepEqual(
    buildTenantAddArgs({
      repo: "The-AgenticFlow/openflows-console",
      name: "trial_01",
    }),
    ["tenant", "add", "The-AgenticFlow/openflows-console", "--name", "trial_01"],
  );
});

test("buildTenantAddArgs leaves --name off when the operator accepts the upstream default", () => {
  assert.deepEqual(buildTenantAddArgs({ repo: "The-AgenticFlow/openflows-console" }), [
    "tenant",
    "add",
    "The-AgenticFlow/openflows-console",
  ]);
});
