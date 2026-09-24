import { NextRequest, NextResponse } from "next/server";

import { resolveModelForRole } from "@/lib/api/ai";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") || "forge";
    const tenant = searchParams.get("tenant") || undefined;
    const resolved = await resolveModelForRole(role, tenant);
    return NextResponse.json(resolved);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to resolve model";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
