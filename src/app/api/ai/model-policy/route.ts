import { NextResponse } from "next/server";

import { fetchGlobalModelPolicy, setGlobalModelPolicy } from "@/lib/api/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const policy = await fetchGlobalModelPolicy();
    return NextResponse.json(policy);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch model policy";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const updated = await setGlobalModelPolicy(body);
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update model policy";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
