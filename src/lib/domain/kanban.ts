// Kanban reconciliation: the single pure mapping from ticket → board column
// (ADR-0004). The board derives its columns from the fine-grained phase object
// (`ticket:{id}:status`) when present, falls back to `Ticket.status` when the
// phase key is absent, and lets terminal/escalation states (`merged`, `failed`,
// `completed`, `exhausted`, `awaiting_human`) override into a terminal lane.
//
// All column logic lives here — components stay dumb and only render what
// `buildBoard` produces. If upstream ever unifies the two status models, only
// this file changes.
import type { PhaseStatus, TenantFleet, Ticket, TicketStatus, WorkerSlot } from "@/lib/domain/types";

export type KanbanColumnId =
  | "planning"
  | "building"
  | "testing"
  | "review"
  | "blocked"
  | "merged"
  | "completed"
  | "failed"
  | "exhausted"
  | "awaiting_human";

export interface KanbanColumn {
  id: KanbanColumnId;
  label: string;
  tone: "default" | "success" | "warning" | "danger";
}

export interface KanbanCard {
  ticket: Ticket;
  phase: PhaseStatus | undefined;
  column: KanbanColumnId;
  worker: string | undefined;
}

export interface KanbanBoard {
  columns: readonly KanbanColumn[];
  cards: KanbanCard[];
}

// The unambiguous column set from ADR-0004: Planning → Building → Testing →
// Review, then the Blocked escalation lane and the terminal/escalation lanes.
export const KANBAN_COLUMNS: readonly KanbanColumn[] = [
  { id: "planning", label: "Planning", tone: "default" },
  { id: "building", label: "Building", tone: "default" },
  { id: "testing", label: "Testing", tone: "default" },
  { id: "review", label: "Review", tone: "default" },
  { id: "blocked", label: "Blocked", tone: "danger" },
  { id: "merged", label: "Merged", tone: "success" },
  { id: "completed", label: "Done", tone: "success" },
  { id: "failed", label: "Failed", tone: "danger" },
  { id: "exhausted", label: "Exhausted", tone: "danger" },
  { id: "awaiting_human", label: "Awaiting Human", tone: "warning" },
];

// Terminal/escalation `Ticket.status` states override the phase and park the
// card in a fixed lane. The remaining (non-terminal) statuses fall through to
// phase- or status-derived flow columns.
const TERMINAL_COLUMN: Partial<Record<TicketStatus["type"], KanbanColumnId>> = {
  merged: "merged",
  completed: "completed",
  failed: "failed",
  exhausted: "exhausted",
  awaiting_human: "awaiting_human",
};

const FLOW_STATUS_COLUMN: Partial<Record<TicketStatus["type"], KanbanColumnId>> = {
  open: "planning",
  assigned: "building",
  in_progress: "building",
};

export function columnForTicket(
  ticket: Ticket,
  phase: PhaseStatus | undefined,
): KanbanColumnId {
  const terminal = TERMINAL_COLUMN[ticket.status.type];
  if (terminal) return terminal;

  if (phase) {
    switch (phase.phase) {
      case "planning":
        return "planning";
      case "building":
        return "building";
      case "testing":
        return "testing";
      case "review_ready":
        return "review";
      case "blocked":
        return "blocked";
    }
  }

  return FLOW_STATUS_COLUMN[ticket.status.type] ?? "planning";
}

function workerIdFromStatus(status: TicketStatus): string | undefined {
  return "worker_id" in status ? status.worker_id : undefined;
}

export function workerForTicket(fleet: TenantFleet, ticket: Ticket): string | undefined {
  const slot = Object.values(fleet.workerSlots).find(
    (slot: WorkerSlot) => "ticket_id" in slot.status && slot.status.ticket_id === ticket.id,
  );
  return slot?.id ?? workerIdFromStatus(ticket.status);
}

export function buildBoard(fleet: TenantFleet): KanbanBoard {
  const cards: KanbanCard[] = fleet.tickets.map((ticket) => {
    const phase = fleet.phases?.[ticket.id];
    return {
      ticket,
      phase,
      column: columnForTicket(ticket, phase),
      worker: workerForTicket(fleet, ticket),
    };
  });

  return { columns: KANBAN_COLUMNS, cards };
}
