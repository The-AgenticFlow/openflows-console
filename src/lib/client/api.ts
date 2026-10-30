// Typed browser client for OpenFlows Manager's `/api/v1` (same-origin proxy).
// Mutations carry Manager's session-bound CSRF token (fetched from
// `/auth/csrf`, refreshed once on CSRF_FAILED) and a per-action Idempotency-Key.
// Every failure becomes `ConsoleError`, the one error shape the UI renders:
// safe message, recovery hint, retryability and request ID for support. Raw
// upstream text is never shown; unknown codes fall back to a generic message.
import {
  type ApiErrorBody,
  type AuditEntry,
  type CoderIdentity,
  type ConnectStarted,
  type CursorPage,
  describeError,
  type GithubConnection,
  type InvitationCreated,
  type Member,
  type Operation,
  type OperationAccepted,
  type Organization,
  type OrgSummary,
  type PendingInvitation,
  type PlatformOverview,
  type Repository,
  type Role,
  type Tenant,
  type TenantAction,
  type TenantStatus,
} from "../manager/contract.ts";

export class ConsoleError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;
  readonly recovery?: string;
  readonly requestId: string;
  constructor(init: { code: string; message: string; status: number; retryable: boolean; recovery?: string; requestId?: string }) {
    super(init.message);
    this.name = "ConsoleError";
    this.code = init.code;
    this.status = init.status;
    this.retryable = init.retryable;
    this.recovery = init.recovery;
    this.requestId = init.requestId ?? "-";
  }
}

const API = "/api/v1";
let csrf: string | null = null;

/** Drops the cached CSRF token (call on sign-out; also used by tests). */
export function resetCsrfCache(): void {
  csrf = null;
}

async function parseError(res: Response): Promise<ConsoleError> {
  const body = (await res.json().catch(() => null)) as { error?: Partial<ApiErrorBody> } | null;
  const code = body?.error?.code ?? (res.status >= 500 ? "SERVICE_UNAVAILABLE" : "INVALID_INPUT");
  const known = describeError(code, body?.error?.message ?? "Something went wrong.");
  return new ConsoleError({
    code,
    status: res.status,
    // Prefer our copy for known codes; only fall back to Manager's sanitized message.
    message: known.message,
    recovery: known.recovery,
    retryable: body?.error?.retryable ?? res.status >= 500,
    requestId: body?.error?.request_id,
  });
}

async function csrfToken(force = false): Promise<string> {
  if (csrf && !force) return csrf;
  const res = await fetch(`${API}/auth/csrf`, { credentials: "same-origin", headers: { accept: "application/json" } });
  if (!res.ok) throw await parseError(res);
  csrf = ((await res.json()) as { csrf_token: string }).csrf_token;
  return csrf;
}

async function send(method: string, path: string, body: unknown, idempotencyKey: string | undefined, retry: boolean): Promise<Response> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (method !== "GET") {
    headers["x-csrf-token"] = await csrfToken();
    headers["idempotency-key"] = idempotencyKey ?? crypto.randomUUID();
  }
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { method, headers, credentials: "same-origin", body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ConsoleError({ code: "SERVICE_UNAVAILABLE", message: "Cannot reach OpenFlows.", status: 0, retryable: true, recovery: "Check your connection and try again." });
  }
  if (!res.ok && retry && method !== "GET") {
    const peek = await res.clone().json().catch(() => null) as { error?: { code?: string } } | null;
    if (peek?.error?.code === "CSRF_FAILED") {
      await csrfToken(true);
      return send(method, path, body, idempotencyKey, false);
    }
  }
  return res;
}

async function request<T>(method: string, path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
  const res = await send(method, path, body, idempotencyKey, true);
  if (!res.ok) {
    const err = await parseError(res);
    // Expired or revoked session: send the user back to sign-in instead of leaving
    // a page of failing requests. CSRF_FAILED is handled (refreshed) in `send`.
    if (err.code === "UNAUTHORIZED" && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      resetCsrfCache();
      // Deliberate full reload (not router.push): it drops every cached query and in-memory token.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login?expired=1";
    }
    throw err;
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const org = (id: string) => `/organizations/${encodeURIComponent(id)}`;

export const api = {
  // Orgs
  listOrganizations: () => request<CursorPage<OrgSummary>>("GET", "/organizations"),
  getOrganization: (id: string) => request<Organization>("GET", org(id)),
  createOrganization: (slug: string, displayName: string, key?: string) =>
    request<OperationAccepted>("POST", "/organizations", { slug, display_name: displayName }, key),
  // Operations
  getOperation: (id: string) => request<Operation>("GET", `/operations/${encodeURIComponent(id)}`),
  retryOperation: (id: string) => request<OperationAccepted>("POST", `/operations/${encodeURIComponent(id)}/retry`, {}),
  // Members & invitations
  listMembers: (orgId: string) => request<CursorPage<Member>>("GET", `${org(orgId)}/members`),
  updateMember: (orgId: string, userId: string, patch: { role?: Role; status?: string }) =>
    request<Member>("PATCH", `${org(orgId)}/members/${encodeURIComponent(userId)}`, patch),
  removeMember: (orgId: string, userId: string) => request<void>("DELETE", `${org(orgId)}/members/${encodeURIComponent(userId)}`),
  invite: (orgId: string, githubLogin: string, role: Role) =>
    request<InvitationCreated>("POST", `${org(orgId)}/invitations`, { github_login: githubLogin, role }),
  revokeInvitation: (orgId: string, id: string) => request<void>("DELETE", `${org(orgId)}/invitations/${encodeURIComponent(id)}`),
  transferOwnership: (orgId: string, newOwnerUserId: string) =>
    request<void>("POST", `${org(orgId)}/transfer-ownership`, { new_owner_user_id: newOwnerUserId }),
  // GitHub
  listConnections: (orgId: string) => request<{ items: GithubConnection[] }>("GET", `${org(orgId)}/github/connections`),
  startConnect: (orgId: string) => request<ConnectStarted>("POST", `${org(orgId)}/github/connect`, {}),
  reconcileConnection: (orgId: string, id: string) =>
    request<GithubConnection>("POST", `${org(orgId)}/github/connections/${encodeURIComponent(id)}/reconcile`, {}),
  disconnectConnection: (orgId: string, id: string) =>
    request<void>("DELETE", `${org(orgId)}/github/connections/${encodeURIComponent(id)}`),
  // Tenants
  listTenants: (orgId: string) => request<CursorPage<Tenant>>("GET", `${org(orgId)}/tenants`),
  getTenant: (orgId: string, id: string) => request<Tenant>("GET", `${org(orgId)}/tenants/${encodeURIComponent(id)}`),
  getTenantStatus: (orgId: string, id: string) => request<TenantStatus>("GET", `${org(orgId)}/tenants/${encodeURIComponent(id)}/status`),
  createTenant: (orgId: string, input: { repository_url: string; name: string; fleet: number }, key?: string) =>
    request<OperationAccepted>("POST", `${org(orgId)}/tenants`, input, key),
  tenantAction: (orgId: string, id: string, action: TenantAction) => {
    const t = `${org(orgId)}/tenants/${encodeURIComponent(id)}`;
    return action === "delete" ? request<OperationAccepted>("DELETE", t) : request<OperationAccepted>("POST", `${t}/${action}`, {});
  },
  updateOrganization: (id: string, displayName: string) => request<Organization>("PATCH", org(id), { display_name: displayName }),
  deleteOrganization: (id: string) => request<OperationAccepted | void>("DELETE", org(id)),
  // Coder-backed identity
  getCoderIdentity: () => request<CoderIdentity>("GET", "/auth/coder"),
  startCoderLink: () => request<{ authorization_url: string }>("POST", "/auth/coder/start", {}),
  // Not served by Manager yet (UI degrades via isUnsupported)
  listOperations: (orgId: string) => request<CursorPage<Operation>>("GET", `${org(orgId)}/operations`),
  listAudit: (orgId: string, after?: string) =>
    request<CursorPage<AuditEntry>>("GET", `${org(orgId)}/audit?limit=50${after ? `&after=${encodeURIComponent(after)}` : ""}`),
  listInvitations: (orgId: string) => request<{ items: PendingInvitation[] }>("GET", `${org(orgId)}/invitations`),
  listRepositories: (orgId: string, connectionId: string) =>
    request<{ items: Repository[] }>("GET", `${org(orgId)}/github/connections/${encodeURIComponent(connectionId)}/repositories`),
  getPlatformOverview: () => request<PlatformOverview>("GET", "/platform/overview"),
  signOut: async () => {
    try {
      await request<void>("POST", "/auth/logout", {});
    } finally {
      resetCsrfCache();
    }
  },
};
