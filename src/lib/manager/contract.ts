// Manager API v1 types as OpenFlows Manager actually serves them (snake_case
// JSON, read from `crates/openflows-manager` on the tenant-runtime-isolation
// branch). The Console talks to Manager only through `/api/v1` (proxied same
// origin, see next.config.ts). Nothing here carries a secret: GitHub tokens,
// installation credentials and Coder/Redis access never reach the browser.
//
// Note what Manager does NOT expose yet (the Console shows these as
// unavailable rather than inventing data): audit log reads, fleet/platform
// overview, an operations list, an accessible-repositories list, and listing
// pending invitations.

/** Org roles. Ownership is separate (`owner_user_id`), not a role. */
export type Role = "admin" | "developer" | "viewer";

export interface Me {
  id: string;
  display_name: string;
  status: string;
}

/** One organisation as listed for the signed-in user (`GET /organizations`). */
export interface OrgSummary {
  organization_id: string;
  slug: string;
  display_name: string;
  role: Role;
  status: string;
}

export interface Organization {
  id: string;
  slug: string;
  display_name: string;
  status: string;
  owner_user_id: string;
  /** Latest setup operation; present only while the organisation is not ready. */
  provisioning?: ProvisioningSummary | null;
}

export interface ProvisioningSummary {
  operation_id: string;
  state: string;
  current_step: string | null;
  attempt_count: number;
  /** Stable code such as `CODER_ORG_FAILED`; never an upstream error body. */
  error_code: string | null;
}

/** Product-language cause and next step for a failed organisation setup. */
export function setupFailureMessage(code: string | null): string {
  switch (code) {
    case "CODER_ORG_FAILED":
      return "OpenFlows could not create your organisation in Coder. The Coder deployment may be missing a licence feature or be unreachable.";
    case "PROVISIONER_NOT_READY":
      return "The Coder provisioner for your organisation did not come online. The Coder deployment may be missing a licence feature or be unreachable.";
    case "CODER_CAPABILITIES_UNMET":
    case "CODER_VERSION_UNMET":
      return "The connected Coder deployment does not meet OpenFlows requirements (version or licence).";
    case "RELEASE_NOT_CONFIGURED":
      return "No runtime template release is configured on this OpenFlows installation.";
    case "IMPORT_FAILED":
      return "The runtime templates could not be imported into Coder.";
    default:
      return "Setup did not finish.";
  }
}

export interface CursorPage<T> {
  items: T[];
  next_cursor: string | null;
}

export interface Member {
  user_id: string;
  display_name: string;
  role: Role;
  status: string;
}

export interface InvitationCreated {
  invitation_id: string;
  invitation_url: string | null;
  expires_in_seconds: number;
}

/** Operations are asynchronous: mutations return 202 with one of these. */
export interface OperationAccepted {
  operation_id: string;
  resource_id?: string;
  tenant_id?: string;
  status: string;
}

export interface Operation {
  id: string;
  organization_id: string;
  kind: string;
  state: string;
  current_step: string | null;
  attempt_count: number;
  error_code: string | null;
}

export interface Tenant {
  id: string;
  organization_id: string;
  slug: string;
  github_repository_id: number | string;
  desired_state: string;
  observed_state: string;
  fleet_size: number;
}

export interface TenantStatus {
  tenant_id: string;
  workspaces: { state: string; count: number }[];
  latest_operation: { id: string; state: string; error_code: string | null } | null;
}

export interface GithubConnection {
  id: string;
  organization_id: string;
  installation_id: number;
  account_type: string;
  account_login: string | null;
  status: string;
  connected_at: string | null;
  last_reconciled_at: string | null;
}

export interface ConnectStarted {
  attempt_id: string;
  authorization_url: string | null;
  setup_url: string | null;
}

export interface CoderIdentity {
  /** Whether this deployment requires/offers a Coder-backed identity. */
  configured: boolean;
  /** The linked Coder account, never any credential. */
  account: { id: string; deployment: string } | null;
}

// ── Read endpoints added for the Console ────────────────────────────────────
// Audit, pending invitations, connection repositories and the platform
// overview. Older Managers answer 404 for these; `isUnsupported` lets the UI
// show an explicit "not available" state instead of inventing data.
export interface AuditEntry {
  id: string;
  occurred_at: string;
  actor_type: string;
  actor_id: string | null;
  /** Display name of the acting user, when the actor is a user. */
  actor_name: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  result: string;
  request_id: string | null;
}

export interface PendingInvitation {
  invitation_id: string;
  invitee_github_user_id: number;
  /** Known only once the invitee has signed in to OpenFlows at least once. */
  invitee_login: string | null;
  role: Role;
  invited_by: string | null;
  created_at: string;
  expires_at: string;
  status: "pending" | "expired";
}

export interface Repository {
  id: number | string;
  full_name: string;
  last_seen_at?: string;
}

/** Platform-wide counts for operators. Keys of `by_*` maps are Manager statuses. */
export interface PlatformOverview {
  organizations: { total: number; by_status: Record<string, number> };
  tenants: { total: number; by_state: Record<string, number> };
  github_connections: { total: number; by_status: Record<string, number> };
  operations: { by_state: Record<string, number> };
  outbox_pending: number;
  templates: { version: string; status: string; tenants: number }[];
}

/** Manager's error envelope: `{ error: { code, message, request_id, retryable } }`. */
export interface ApiErrorBody {
  code: string;
  message: string;
  request_id?: string;
  retryable: boolean;
}

// ── Permissions (mirrors Manager policy; Manager is the authority) ──────────
/** Admin-only: members, invitations, GitHub connections, delete/clean. */
export const canAdminister = (r: Role) => r === "admin";
/** Admin or developer: create / start / stop tenants. */
export const canOperate = (r: Role) => r === "admin" || r === "developer";

export const ROLE_LABEL: Record<Role, string> = { admin: "Admin", developer: "Developer", viewer: "Viewer" };

// ── Operations ──────────────────────────────────────────────────────────────
export const isOperationActive = (state: string) => state === "queued" || state === "running";

/** Safe, product-language text for Manager's stable error codes. */
const ERROR_COPY: Record<string, { message: string; recovery?: string }> = {
  UNAUTHORIZED: { message: "Your session has expired.", recovery: "Sign in again." },
  CSRF_FAILED: { message: "Your page is out of date.", recovery: "Reload the page and try again." },
  FORBIDDEN: { message: "You do not have permission to do this.", recovery: "Ask an organisation admin." },
  ORG_ADMIN_REQUIRED: { message: "Only organisation admins can do this.", recovery: "Ask an admin to do it, or to change your role." },
  OWNER_REQUIRED: { message: "Only the organisation owner can do this." },
  RESOURCE_NOT_FOUND: { message: "That item could not be found." },
  CONFLICT: { message: "That conflicts with the current state.", recovery: "Refresh and try again." },
  INVALID_INPUT: { message: "Some of the details are not valid." },
  RATE_LIMITED: { message: "Too many attempts.", recovery: "Wait a moment and try again." },
  TENANT_LIMIT_REACHED: { message: "Your organisation has reached its tenant limit.", recovery: "Delete a tenant or contact your platform operator." },
  WORKER_LIMIT_REACHED: { message: "Your organisation has reached its worker limit." },
  SERVICE_UNAVAILABLE: { message: "OpenFlows is temporarily unavailable.", recovery: "Try again in a moment." },
  GITHUB_UNAVAILABLE: { message: "GitHub is temporarily unavailable.", recovery: "Try again in a moment." },
  CONNECTION_UNAVAILABLE: { message: "The GitHub connection is not usable.", recovery: "Reconcile or reconnect GitHub." },
  REPOSITORY_UNAVAILABLE: { message: "That repository is not accessible to the OpenFlows GitHub App.", recovery: "Grant the app access on GitHub, then reconcile the connection." },
  INSTALLATION_ALREADY_BOUND: { message: "That GitHub installation is already connected to another organisation." },
  REAUTH_REQUIRED: { message: "Please sign in again to confirm this action." },
};

export function describeError(code: string | null | undefined, fallback = "Something went wrong."): { message: string; recovery?: string } {
  return (code && ERROR_COPY[code]) || { message: fallback };
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function validateOrgName(name: string): string | null {
  const t = name.trim();
  if (t.length < 2) return "Name must be at least 2 characters.";
  if (t.length > 60) return "Name must be at most 60 characters.";
  if (!slugify(t)) return "Name must contain letters or numbers.";
  return null;
}

const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
export const validateGithubLogin = (login: string): string | null =>
  LOGIN.test(login.trim()) ? null : "Enter a valid GitHub username.";

/** Manager accepts only canonical `https://github.com/owner/repo` URLs. */
export function validateRepositoryUrl(url: string): string | null {
  return /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?(\.git)?\/?$/.test(url.trim())
    ? null
    : "Use a repository URL like https://github.com/owner/repo.";
}

/**
 * Tenant states in product language. `key` names the normalised state so the
 * UI can show it in the active language (`label` is the English fallback);
 * it is null for states Manager may add later.
 */
export type TenantStateKey = "running" | "provisioning" | "stopped" | "deleting" | "failed";
export function tenantStateLabel(t: Pick<Tenant, "observed_state" | "desired_state">): { label: string; key: TenantStateKey | null; tone: "neutral" | "info" | "success" | "warning" | "danger" } {
  const s = t.observed_state;
  if (s === "running") return { label: "Running", key: "running", tone: "success" };
  if (s === "provisioning" || s === "pending") return { label: "Provisioning", key: "provisioning", tone: "info" };
  if (s === "paused" || s === "stopped") return { label: "Stopped", key: "stopped", tone: "neutral" };
  if (s === "deleting") return { label: "Deleting", key: "deleting", tone: "warning" };
  if (s === "failed" || s === "error") return { label: "Failed", key: "failed", tone: "danger" };
  return { label: s.replace(/_/g, " "), key: null, tone: "neutral" };
}

export type TenantAction = "start" | "stop" | "clean" | "delete";

/** Which actions to offer for a tenant state and role (Manager still decides). */
export function tenantActions(t: Pick<Tenant, "observed_state">, role: Role): TenantAction[] {
  const out: TenantAction[] = [];
  const s = t.observed_state;
  if (canOperate(role)) {
    if (s === "paused" || s === "stopped" || s === "failed") out.push("start");
    if (s === "running") out.push("stop");
  }
  // Delete stays available while provisioning (Manager accepts it), so a
  // tenant stuck mid-setup can always be removed and created again.
  if (canAdminister(role) && s !== "provisioning" && s !== "deleting") out.push("clean");
  if (canAdminister(role) && s !== "deleting") out.push("delete");
  return out;
}

/** True when an error means "this Manager does not offer that endpoint yet". */
export function isUnsupported(e: unknown): boolean {
  const x = e as { status?: number; code?: string } | null;
  return !!x && (x.status === 404 || x.status === 405) && (x.code === "RESOURCE_NOT_FOUND" || x.code === "NOT_FOUND" || x.status === 405);
}

/** Relative time in product language ("3 minutes ago"). */
export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}
