// Typed domain models mirroring the OpenFlows Redis SharedStore schema.
// Defensive per ADR-0005: fields are tolerant to upstream additions — unknown
// fields are ignored, optional fields degrade gracefully, never fatal.

export type TenantId = string;
export type TicketId = string;
export type RoleId = string; // "forge" | "sentinel" | "vessel" | "lore" | "nexus"
export type WorkerId = string; // e.g. "forge-1"

// ── TicketStatus (terminal / escalation enum from `tickets[i].status`) ──────
export type TicketStatus =
  | { type: "open" }
  | { type: "assigned"; worker_id: string }
  | { type: "in_progress"; worker_id: string }
  | { type: "merged"; worker_id: string; pr_number: number }
  | { type: "failed"; worker_id: string; reason?: string; attempts?: number }
  | { type: "completed"; worker_id: string; outcome?: string }
  | { type: "exhausted"; worker_id: string; attempts: number }
  | { type: "awaiting_human"; worker_id: string; reason?: string; attempts?: number };

export interface Ticket {
  id: TicketId;
  title: string;
  body?: string;
  priority?: number;
  branch?: string | null;
  status: TicketStatus;
  issue_url?: string | null;
  attempts?: number;
}

// ── WorkerSlot / WorkerStatus ──────────────────────────────────────────────
export type WorkerStatus =
  | { type: "idle" }
  | { type: "assigned"; ticket_id?: string; issue_url?: string | null }
  | { type: "working"; ticket_id?: string; issue_url?: string | null }
  | { type: "done"; ticket_id?: string; outcome?: string }
  | { type: "suspended"; ticket_id?: string; reason?: string; issue_url?: string | null };

export interface WorkerSlot {
  id: WorkerId;
  status: WorkerStatus;
  workspace_id?: string | null;
}

// ── Fine-grained phase object (`ticket:{id}:status`) ───────────────────────
export type WorkflowPhase =
  | "planning"
  | "building"
  | "testing"
  | "review_ready"
  | "blocked";

export interface PhaseStatus {
  phase: WorkflowPhase;
  role?: RoleId;
  ts?: number;
}

// ── Heartbeat ─────────────────────────────────────────────────────────────
export interface HeartbeatRecord {
  ts: number;
  ws_id?: string;
  status?: string;
}

// ── Pending PR (CI / merge lane) ──────────────────────────────────────────
export interface PendingPr {
  number: number;
  ticket_id?: TicketId;
  head_sha?: string;
  head_branch?: string;
  base_branch?: string;
  title?: string;
  mergeable?: boolean;
  has_conflicts?: boolean;
  worker_id?: WorkerId;
}

// ── CI readiness ──────────────────────────────────────────────────────────
export type CiReadiness = "ready" | "missing" | "setup_in_progress";

// ── Gate / Review / Deployment detail ─────────────────────────────────────
export interface GateApproval {
  phase: WorkflowPhase;
  approved_by?: string;
  ts?: number;
  notes?: string;
}

export interface ReviewPayload {
  verdict: "approve" | "reject";
  report?: string;
  pr_number?: number;
}

export interface MergePayload {
  pr_number: number;
  sha?: string;
  merged?: boolean;
}

// ── Aggregated fleet snapshot (what the dashboard renders) ────────────────
export interface TenantFleet {
  tenant: TenantId;
  tickets: Ticket[];
  workerSlots: Record<WorkerId, WorkerSlot>;
  pendingPrs: PendingPr[];
  ciReadiness?: CiReadiness;
  heartbeats?: Record<string, HeartbeatRecord>;
}
