import { NextResponse } from "next/server";

import { createAiModel, fetchAiModels } from "@/lib/api/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const models = await fetchAiModels();
    return NextResponse.json(models);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch models";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const created = await createAiModel(body);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create model";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
