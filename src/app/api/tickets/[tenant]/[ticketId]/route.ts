// Ticket detail API route: exposes ticket-scoped lifecycle facts from Redis or
// mock fixtures without letting the browser touch the SharedStore.
import { NextResponse } from "next/server";

import { fetchTicketDetail } from "@/lib/api/ticket-detail";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenant: string; ticketId: string }> },
) {
  const { tenant, ticketId } = await params;

  try {
    const detail = await fetchTicketDetail(
      decodeURIComponent(tenant),
      decodeURIComponent(ticketId),
    );
    if (!detail) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
