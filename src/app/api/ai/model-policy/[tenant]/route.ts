import { NextResponse } from "next/server";

import { fetchTenantModelPolicy, setTenantModelPolicy } from "@/lib/api/ai";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  try {
    const { tenant } = await params;
    const policy = await fetchTenantModelPolicy(tenant);
    return NextResponse.json(policy);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch tenant model policy";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  try {
    const { tenant } = await params;
    const body = await req.json();
    const updated = await setTenantModelPolicy(tenant, body);
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update tenant model policy";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
