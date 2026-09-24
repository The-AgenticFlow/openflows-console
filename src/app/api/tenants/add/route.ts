// Tenant add route: trusted ADR-0001 write path that maps the UI action to the
// upstream `openflows tenant add` command or Manager API based on data source.
import { NextResponse } from "next/server";

import { createManagerTenant } from "@/lib/api/manager-client";
import { addTenantWithOpenFlowsCli } from "@/lib/cli/openflows";
import { getEnv } from "@/lib/config/env";
import { type TenantAddInput, TenantAddValidationError } from "@/lib/domain/tenant-add";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = readTenantAddPayload(await readJson(request));
    const dataSource = getEnv("OPENFLOWS_DATA_SOURCE") ?? "mock";

    if (dataSource === "manager") {
      const result = await createManagerTenant(input);
      return NextResponse.json(result, { status: result.ok ? 200 : 502 });
    }

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

  let fleet: number | undefined;
  if (record.fleet !== undefined && record.fleet !== null) {
    const parsed = Number(record.fleet);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new TenantAddValidationError("Fleet size must be an integer greater than or equal to 1.");
    }
    fleet = parsed;
  }

  return {
    repo: record.repo,
    name: (record.name as string | undefined) ?? undefined,
    fleet,
  };
}
