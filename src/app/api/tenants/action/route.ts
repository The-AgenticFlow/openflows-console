// Tenant action route: guarded destructive write path for upstream
// `openflows tenant clean` and `openflows tenant remove --purge`.
import { NextResponse } from "next/server";

import {
  cleanTenantWithOpenFlowsCli,
  removeTenantWithOpenFlowsCli,
} from "@/lib/cli/openflows";
import { type TenantActionInput, TenantAddValidationError } from "@/lib/domain/tenant-add";

export const dynamic = "force-dynamic";

type TenantAction = "clean" | "remove";

export async function POST(request: Request) {
  try {
    const payload = await readJson(request);
    const { action, input } = readTenantActionPayload(payload);
    const result =
      action === "clean"
        ? await cleanTenantWithOpenFlowsCli(input)
        : await removeTenantWithOpenFlowsCli(input);

    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    if (err instanceof TenantAddValidationError) {
      return NextResponse.json(
        {
          ok: false,
          message: err.message,
          guidance: ["Confirm the tenant name exactly before retrying this destructive action."],
        },
        { status: 400 },
      );
    }

    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        ok: false,
        message,
        guidance: ["Retry after fixing the reported request or server-side configuration."],
      },
      { status: 500 },
    );
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new TenantAddValidationError("Request body must be valid JSON.");
  }
}

function readTenantActionPayload(payload: unknown): {
  action: TenantAction;
  input: TenantActionInput;
} {
  if (!payload || typeof payload !== "object") {
    throw new TenantAddValidationError("Request body must include an action and tenant.");
  }

  const record = payload as Record<string, unknown>;
  if (record.action !== "clean" && record.action !== "remove") {
    throw new TenantAddValidationError('Action must be "clean" or "remove".');
  }
  if (typeof record.tenant !== "string") {
    throw new TenantAddValidationError("Tenant name must be a string.");
  }

  return {
    action: record.action,
    input: { tenant: record.tenant },
  };
}
