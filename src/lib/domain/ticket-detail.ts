import type { TicketDetail, TicketStatus } from "@/lib/domain/types";

export type LifecycleSectionId =
  | "gate"
  | "review"
  | "pr"
  | "handoff"
  | "deployment"
  | "escalation";

export interface TicketDetailView {
  workflow: {
    phaseLabel: string;
    statusLabel: string;
    reconciliation: string;
  };
  escalation: string | null;
  lifecycle: Array<{
    id: LifecycleSectionId;
    title: string;
    state: "available" | "empty";
    detail: string;
    payload?: unknown;
  }>;
}

export function buildTicketDetailView(detail: TicketDetail): TicketDetailView {
  const statusLabel = label(detail.ticket.status.type);
  const phaseLabel = detail.phase ? label(detail.phase.phase) : "not reported";
  const escalation = escalationReason(detail.ticket.status);

  return {
    workflow: {
      phaseLabel,
      statusLabel,
      reconciliation: detail.phase
        ? `Phase ${phaseLabel} with ticket status ${statusLabel}`
        : `No phase key; using ticket status ${statusLabel}`,
    },
    escalation,
    lifecycle: [
      {
        id: "gate",
        title: "Planning Gate",
        state: detail.gates.length > 0 ? "available" : "empty",
        detail:
          detail.gates.length > 0
            ? `${detail.gates.length} gate record(s)`
            : "No gate approval has been recorded.",
        payload: detail.gates.length > 0 ? detail.gates : undefined,
      },
      {
        id: "review",
        title: "Review",
        state: detail.reviews.length > 0 ? "available" : "empty",
        detail:
          detail.reviews.length > 0
            ? `${detail.reviews.length} review record(s)`
            : "No review verdict has been recorded.",
        payload: detail.reviews.length > 0 ? detail.reviews : undefined,
      },
      {
        id: "pr",
        title: "Pull Request",
        state: detail.pr || detail.pendingPr ? "available" : "empty",
        detail:
          detail.pr || detail.pendingPr
            ? "PR metadata is available."
            : "No PR has been recorded for this ticket.",
        payload: detail.pr ?? detail.pendingPr,
      },
      {
        id: "handoff",
        title: "Handoff",
        state: detail.handoff ? "available" : "empty",
        detail: detail.handoff
          ? "Handoff contract is available."
          : "No FORGE handoff contract has been written.",
        payload: detail.handoff,
      },
      {
        id: "deployment",
        title: "Deployment",
        state: detail.deployment ? "available" : "empty",
        detail: detail.deployment
          ? "Merge/deployment result is available."
          : "No merge or deployment result has been recorded.",
        payload: detail.deployment,
      },
      {
        id: "escalation",
        title: "Escalation",
        state: escalation ? "available" : "empty",
        detail: escalation ?? "No escalation is recorded for this ticket.",
        payload: escalation ? detail.ticket.status : undefined,
      },
    ],
  };
}

function label(value: string): string {
  return value.replaceAll("_", " ");
}

function escalationReason(status: TicketStatus): string | null {
  if (
    (status.type === "awaiting_human" || status.type === "failed") &&
    "reason" in status &&
    status.reason
  ) {
    return status.reason;
  }
  if (status.type === "exhausted") {
    return `Recovery exhausted after ${status.attempts} attempt(s).`;
  }
  return null;
}
