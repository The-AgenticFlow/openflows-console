import { getEnv } from "../config/env.ts";
import type { TenantFleet, TicketDetail } from "../domain/types.ts";

export interface ManagerErrorResponse {
  error: {
    code: string;
    message: string;
    request_id?: string;
  };
}

export function getManagerBaseUrl(): string {
  return (getEnv("OPENFLOWS_MANAGER_URL") ?? "http://127.0.0.1:3002").replace(/\/+$/, "");
}

export async function fetchManagerFleet(): Promise<TenantFleet[]> {
  const base = getManagerBaseUrl();
  const res = await fetch(`${base}/api/v1/fleet`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as ManagerErrorResponse | null;
    throw new Error(
      errBody?.error?.message ?? `Manager /api/v1/fleet failed with status ${res.status}`,
    );
  }

  const data = (await res.json()) as { tenants?: Record<string, unknown>[] };
  const tenants = Array.isArray(data?.tenants) ? data.tenants : [];

  return tenants.map((item) => ({
    tenant: typeof item.tenant === "string" ? item.tenant : "",
    tickets: Array.isArray(item.tickets) ? item.tickets : [],
    phases: (item.phases as TenantFleet["phases"]) ?? {},
    workerSlots: (item.worker_slots as TenantFleet["workerSlots"]) ?? {},
    pendingPrs: Array.isArray(item.pending_prs) ? item.pending_prs : [],
    ciReadiness: item.ci_readiness as TenantFleet["ciReadiness"],
    heartbeats: (item.heartbeats as TenantFleet["heartbeats"]) ?? {},
  }));
}

export async function fetchManagerTicketDetail(
  tenant: string,
  ticketId: string,
): Promise<TicketDetail | null> {
  const base = getManagerBaseUrl();
  const res = await fetch(
    `${base}/api/v1/tenants/${encodeURIComponent(tenant)}/tickets/${encodeURIComponent(ticketId)}`,
    {
      cache: "no-store",
      headers: { Accept: "application/json" },
    },
  );

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as ManagerErrorResponse | null;
    throw new Error(
      errBody?.error?.message ?? `Manager ticket detail failed with status ${res.status}`,
    );
  }

  const detail = (await res.json()) as Record<string, unknown>;
  return {
    tenant: typeof detail.tenant === "string" ? detail.tenant : tenant,
    ticket: {
      id: typeof detail.id === "string" ? detail.id : ticketId,
      title: typeof detail.title === "string" ? detail.title : "",
      body: typeof detail.body === "string" ? detail.body : undefined,
      priority: typeof detail.priority === "number" ? detail.priority : undefined,
      branch: typeof detail.branch === "string" ? detail.branch : undefined,
      status: (detail.raw_status as TicketDetail["ticket"]["status"]) ?? { type: "open" },
      issue_url: typeof detail.issue_url === "string" ? detail.issue_url : undefined,
      attempts: typeof detail.attempts === "number" ? detail.attempts : undefined,
    },
    phase: detail.phase as TicketDetail["phase"],
    gates: Array.isArray(detail.gates) ? (detail.gates as TicketDetail["gates"]) : [],
    reviews: Array.isArray(detail.reviews) ? (detail.reviews as TicketDetail["reviews"]) : [],
    pr: detail.pr,
    handoff: detail.handoff,
    deployment: detail.deployment,
    pendingPr: detail.pending_pr as TicketDetail["pendingPr"],
  };
}

export async function listManagerTenants(): Promise<string[]> {
  const base = getManagerBaseUrl();
  const res = await fetch(`${base}/api/v1/tenants`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as ManagerErrorResponse | null;
    throw new Error(
      errBody?.error?.message ?? `Manager list tenants failed with status ${res.status}`,
    );
  }

  const data = await res.json();
  if (Array.isArray(data)) {
    return data.map((t: { name: string }) => t.name).sort();
  }
  return [];
}

export async function createManagerTenant(input: {
  repo: string;
  name?: string | null;
  fleet?: number | null;
}): Promise<{
  ok: boolean;
  message: string;
  tenant?: string;
  workspace_id?: string;
  guidance?: string[];
}> {
  const base = getManagerBaseUrl();
  const res = await fetch(`${base}/api/v1/tenants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      repo: input.repo,
      name: input.name,
      fleet: input.fleet,
    }),
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as ManagerErrorResponse | null;
    const msg = errBody?.error?.message ?? `Manager create tenant failed with status ${res.status}`;
    const guidance: string[] = [];
    if (msg.includes("GitHub link") || msg.includes("external-auth")) {
      guidance.push("GitHub link required: Complete authorization in Coder at /external-auth/primary-github.");
    }
    if (msg.includes("did not become ready")) {
      guidance.push("The Coder workspace timed out waiting for ready status, but may still be starting in the background.");
    }
    return {
      ok: false,
      message: msg,
      guidance: guidance.length ? guidance : ["Check Coder workspace and Manager logs and try again."],
    };
  }

  const data = (await res.json()) as { tenant: string; workspace_id?: string };
  return {
    ok: true,
    message: `Tenant "${data.tenant}" successfully provisioned and active.`,
    tenant: data.tenant,
    workspace_id: data.workspace_id,
  };
}
