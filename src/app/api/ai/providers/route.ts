import { NextResponse } from "next/server";

import { createAiProvider, fetchAiProviders } from "@/lib/api/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const providers = await fetchAiProviders();
    return NextResponse.json(providers);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch providers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const created = await createAiProvider(body);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create provider";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
