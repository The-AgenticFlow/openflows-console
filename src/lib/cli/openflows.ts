import { spawn } from "node:child_process";

import { getEnv } from "@/lib/config/env";
import {
  buildTenantAddArgs,
  buildTenantCleanArgs,
  buildTenantRemoveArgs,
  normalizeTenantActionInput,
  normalizeTenantAddInput,
  type TenantActionInput,
  type TenantAddInput,
} from "@/lib/domain/tenant-add";

const MAX_CAPTURED_OUTPUT = 40_000;
const OPENFLOWS_TIMEOUT_MS = 6 * 60 * 1000;

export interface OpenFlowsCliResult {
  ok: boolean;
  command: string;
  args: string[];
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
  message: string;
  guidance: string[];
}

export async function addTenantWithOpenFlowsCli(
  input: TenantAddInput,
): Promise<OpenFlowsCliResult> {
  const normalized = normalizeTenantAddInput(input);
  const command = getEnv("OPENFLOWS_CLI_PATH") ?? "openflows";
  const args = buildTenantAddArgs(normalized);

  return runOpenFlows(command, args, tenantAddResultText);
}

export async function cleanTenantWithOpenFlowsCli(
  input: TenantActionInput,
): Promise<OpenFlowsCliResult> {
  const normalized = normalizeTenantActionInput(input);
  const command = getEnv("OPENFLOWS_CLI_PATH") ?? "openflows";
  const args = buildTenantCleanArgs(normalized);

  return runOpenFlows(command, args, tenantCleanResultText);
}

export async function removeTenantWithOpenFlowsCli(
  input: TenantActionInput,
): Promise<OpenFlowsCliResult> {
  const normalized = normalizeTenantActionInput(input);
  const command = getEnv("OPENFLOWS_CLI_PATH") ?? "openflows";
  const args = buildTenantRemoveArgs(normalized);

  return runOpenFlows(command, args, tenantRemoveResultText);
}

type ResultText = {
  message(ok: boolean, exitCode: number | null, timedOut: boolean): string;
  guidance(ok: boolean, timedOut: boolean): string[];
};

async function runOpenFlows(
  command: string,
  args: string[],
  resultText: ResultText,
): Promise<OpenFlowsCliResult> {
  let stdout = "";
  let stderr = "";
  let timedOut = false;
  let settled = false;

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, OPENFLOWS_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout = appendOutput(stdout, chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = appendOutput(stderr, chunk);
    });
    child.stdin.on("error", () => {
      // The process may fail before it consumes the non-interactive newline.
    });

    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({
        ok: false,
        command,
        args,
        stdout,
        stderr,
        exitCode: null,
        signal: null,
        message: commandStartFailure(command, error),
        guidance: [
          "Install the OpenFlows CLI on the server running the Console, or set OPENFLOWS_CLI_PATH to the binary.",
          "Then retry the add-tenant action from the Tenants page.",
        ],
      });
    });

    child.once("close", (exitCode, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const ok = exitCode === 0 && !timedOut;
      resolve({
        ok,
        command,
        args,
        stdout,
        stderr,
        exitCode,
        signal,
        message: resultText.message(ok, exitCode, timedOut),
        guidance: resultText.guidance(ok, timedOut),
      });
    });

    // Some upstream commands prompt for confirmation or OAuth progress. The
    // Console keeps the bridge non-interactive and captures the CLI transcript.
    child.stdin.end("\n");
  });
}

function appendOutput(current: string, chunk: Buffer): string {
  const next = current + chunk.toString("utf8");
  if (next.length <= MAX_CAPTURED_OUTPUT) return next;
  return `[captured output truncated to last ${MAX_CAPTURED_OUTPUT} characters]\n${next.slice(
    -MAX_CAPTURED_OUTPUT,
  )}`;
}

function commandStartFailure(command: string, error: Error): string {
  if ("code" in error && error.code === "ENOENT") {
    return `Could not start ${command}.`;
  }
  return `Could not start ${command}: ${error.message}`;
}

const tenantAddResultText: ResultText = {
  message(ok, exitCode, timedOut) {
    if (ok) return "Tenant add completed.";
    if (timedOut) return "openflows tenant add timed out while waiting for upstream setup.";
    return `openflows tenant add exited with code ${exitCode ?? "unknown"}.`;
  },
  guidance(ok, timedOut) {
    if (ok) {
      return [
        "Review the CLI transcript for the Coder dashboard and GitHub OAuth instructions.",
        "The tenants list will refresh from Redis once OpenFlows has persisted the tenant namespace.",
      ];
    }
    if (timedOut) {
      return [
        "Complete the GitHub OAuth link in Coder for the tenant user, then retry.",
        "If the CLI is waiting on Coder or Redis, verify the Console server has the same environment as the OpenFlows operator shell.",
      ];
    }
    return [
      "Check the CLI transcript for invalid repository, Coder auth, GitHub OAuth, or Redis errors.",
      "Fix the reported upstream issue, then retry the add-tenant action.",
    ];
  },
};

const tenantCleanResultText: ResultText = {
  message(ok, exitCode, timedOut) {
    if (ok) return "Tenant clean completed.";
    if (timedOut) return "openflows tenant clean timed out while resetting tenant state.";
    return `openflows tenant clean exited with code ${exitCode ?? "unknown"}.`;
  },
  guidance(ok, timedOut) {
    if (ok) {
      return [
        "Stale awaiting_human and failed tickets were reset to open, recovery counters were cleared, and worker slots were reset.",
        "The tenant fleet will refresh from Redis shortly.",
      ];
    }
    if (timedOut) {
      return [
        "Check Redis and the OpenFlows operator environment, then retry the clean action.",
      ];
    }
    return [
      "Check the CLI transcript for Redis or tenant validation errors.",
      "Fix the reported upstream issue, then retry the clean action.",
    ];
  },
};

const tenantRemoveResultText: ResultText = {
  message(ok, exitCode, timedOut) {
    if (ok) return "Tenant remove completed.";
    if (timedOut) return "openflows tenant remove --purge timed out while purging Redis.";
    return `openflows tenant remove --purge exited with code ${exitCode ?? "unknown"}.`;
  },
  guidance(ok, timedOut) {
    if (ok) {
      return [
        "The tenant Redis keyspace was purged with openflows tenant remove --purge.",
        "Coder workspaces and chats are not deleted by the upstream command; clean them up manually in Coder.",
      ];
    }
    if (timedOut) {
      return ["Check Redis connectivity and retry the remove action."];
    }
    return [
      "Check the CLI transcript for Redis or tenant validation errors.",
      "Fix the reported upstream issue, then retry the remove action.",
    ];
  },
};
