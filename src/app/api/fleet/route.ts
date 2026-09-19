// Fleet API route: exposes the aggregated fleet snapshot as JSON for the
// dashboard client. Forced dynamic so it reflects live state (never cached).
import { NextResponse } from "next/server";

import { fetchFleet } from "@/lib/api/fleet";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const fleet = await fetchFleet();
    return NextResponse.json(fleet);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
