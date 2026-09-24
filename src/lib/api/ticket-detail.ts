import { fetchManagerTicketDetail } from "@/lib/api/manager-client";
import { mockFleet } from "@/lib/api/mock-data";
import { readTenantTicketDetail } from "@/lib/api/redis-reader";
import { getEnv } from "@/lib/config/env";
import type { TenantFleet, TicketDetail } from "@/lib/domain/types";

export async function fetchTicketDetail(
  tenant: string,
  ticketId: string,
): Promise<TicketDetail | null> {
  const dataSource = getEnv("OPENFLOWS_DATA_SOURCE") ?? "mock";

  if (dataSource === "manager") {
    return fetchManagerTicketDetail(tenant, ticketId);
  }

  if (dataSource === "real") {
    try {
      return await fetchManagerTicketDetail(tenant, ticketId);
    } catch {
      return readTenantTicketDetail(tenant, ticketId);
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 150));
  return readMockTicketDetail(mockFleet, tenant, ticketId);
}

function readMockTicketDetail(
  fleets: TenantFleet[],
  tenant: string,
  ticketId: string,
): TicketDetail | null {
  const fleet = fleets.find((item) => item.tenant === tenant);
  const ticket = fleet?.tickets.find((item) => item.id === ticketId);
  if (!fleet || !ticket) return null;

  const pendingPr = fleet.pendingPrs.find((pr) => pr.ticket_id === ticket.id);
  const mergedPr =
    ticket.status.type === "merged" ? { number: ticket.status.pr_number } : undefined;

  return {
    tenant,
    ticket,
    phase: fleet.phases?.[ticket.id],
    gates:
      ticket.id === "T-002"
        ? [
            {
              phase: "planning",
              payload: {
                approved_by: "sentinel",
                notes: "Plan approved in mock mode.",
              },
            },
          ]
        : [],
    reviews:
      ticket.id === "T-003"
        ? [
            {
              role: "sentinel",
              payload: {
                verdict: "approve",
                report: "Mock review is ready for operator inspection.",
              },
            },
          ]
        : [],
    pr: pendingPr ?? mergedPr,
    pendingPr,
    handoff:
      ticket.id === "T-003"
        ? { contract: "Mock handoff contract: implementation ready for review." }
        : undefined,
    deployment:
      ticket.status.type === "merged"
        ? { pr_number: ticket.status.pr_number, merged: true }
        : undefined,
  };
}
