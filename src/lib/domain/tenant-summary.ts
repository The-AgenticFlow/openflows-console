// Tenant summary: pure projections for the Tenants page. A tenant is supplied
// by the data layer only after OpenFlows discovers its Redis namespace
// (`ns:{tenant}:*`), so this module only derives display state from that fleet.
import type { TenantFleet, TicketStatus, WorkerStatus } from "@/lib/domain/types";

export interface TenantSummary {
  name: string;
  ticketCount: number;
  openTicketCount: number;
  activeTicketCount: number;
  escalationCount: number;
  workerCount: number;
  activeWorkerCount: number;
  pendingPrCount: number;
  ciReadiness: TenantFleet["ciReadiness"];
  isActive: boolean;
}

export function summarizeTenants(fleet: TenantFleet[]): TenantSummary[] {
  return fleet
    .map((tenantFleet) => {
      const activeTicketCount = tenantFleet.tickets.filter(isActiveTicket).length;
      const escalationCount = tenantFleet.tickets.filter(isEscalatedTicket).length;
      const workers = Object.values(tenantFleet.workerSlots);
      const activeWorkerCount = workers.filter(isActiveWorker).length;
      const pendingPrCount = tenantFleet.pendingPrs.length;

      return {
        name: tenantFleet.tenant,
        ticketCount: tenantFleet.tickets.length,
        openTicketCount: tenantFleet.tickets.filter((ticket) => ticket.status.type === "open")
          .length,
        activeTicketCount,
        escalationCount,
        workerCount: workers.length,
        activeWorkerCount,
        pendingPrCount,
        ciReadiness: tenantFleet.ciReadiness,
        isActive: activeTicketCount > 0 || activeWorkerCount > 0 || pendingPrCount > 0,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function isActiveTicket(ticket: { status: TicketStatus }): boolean {
  return ticket.status.type === "assigned" || ticket.status.type === "in_progress";
}

function isEscalatedTicket(ticket: { status: TicketStatus }): boolean {
  return (
    ticket.status.type === "awaiting_human" ||
    ticket.status.type === "failed" ||
    ticket.status.type === "exhausted"
  );
}

function isActiveWorker(worker: { status: WorkerStatus }): boolean {
  return worker.status.type === "assigned" || worker.status.type === "working";
}
