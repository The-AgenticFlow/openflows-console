// Tenant add route: trusted ADR-0001 write path that maps the UI action to the
// upstream `openflows tenant add` command through a server-side CLI bridge.
import { NextResponse } from "next/server";

import { addTenantWithOpenFlowsCli } from "@/lib/cli/openflows";
import { type TenantAddInput, TenantAddValidationError } from "@/lib/domain/tenant-add";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = readTenantAddPayload(await readJson(request));
    const result = await addTenantWithOpenFlowsCli(input);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    if (err instanceof TenantAddValidationError) {
      return NextResponse.json(
        {
          ok: false,
          message: err.message,
          guidance: ["Use repository format owner/repo and an OpenFlows-safe tenant name."],
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

function readTenantAddPayload(payload: unknown): TenantAddInput {
  if (!payload || typeof payload !== "object") {
    throw new TenantAddValidationError("Request body must include a repository.");
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.repo !== "string") {
    throw new TenantAddValidationError("Repository must use owner/repo.");
  }
  if (record.name !== undefined && record.name !== null && typeof record.name !== "string") {
    throw new TenantAddValidationError("Tenant name must be a string when provided.");
  }

  return {
    repo: record.repo,
    name: record.name ?? undefined,
  };
}
