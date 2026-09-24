export interface TenantAddInput {
  repo: string;
  name?: string | null;
  fleet?: number | null;
}

export interface NormalizedTenantAddInput {
  repo: string;
  name?: string;
  fleet?: number;
}

export interface TenantActionInput {
  tenant: string;
}

const REPO_PART_PATTERN = /^[A-Za-z0-9_.-]+$/;
const TENANT_NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;

export class TenantAddValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantAddValidationError";
  }
}

export function normalizeTenantAddInput(input: TenantAddInput): NormalizedTenantAddInput {
  const repo = input.repo.trim();
  const name = input.name?.trim();
  const fleet = input.fleet ? Math.max(1, Math.floor(input.fleet)) : undefined;

  validateRepositorySlug(repo);
  if (name) validateTenantName(name);

  const res: NormalizedTenantAddInput = { repo };
  if (name) res.name = name;
  if (fleet) res.fleet = fleet;
  return res;
}

export function buildTenantAddArgs(input: NormalizedTenantAddInput): string[] {
  const args = ["tenant", "add", input.repo];
  if (input.name) {
    args.push("--name", input.name);
  }
  if (input.fleet) {
    args.push("--fleet", String(input.fleet));
  }
  return args;
}

export function normalizeTenantActionInput(input: TenantActionInput): TenantActionInput {
  const tenant = input.tenant.trim();
  validateTenantName(tenant);
  return { tenant };
}

export function buildTenantCleanArgs(input: TenantActionInput): string[] {
  return ["tenant", "clean", input.tenant];
}

export function buildTenantRemoveArgs(input: TenantActionInput): string[] {
  return ["tenant", "remove", input.tenant, "--purge"];
}

export function validateTenantName(name: string): void {
  if (!name) {
    throw new TenantAddValidationError("Tenant name must not be empty.");
  }
  if (!TENANT_NAME_PATTERN.test(name)) {
    throw new TenantAddValidationError(
      `Tenant name "${name}" contains characters that are not allowed in Redis namespace operations; use only ASCII letters, numbers, '.', '_' and '-'.`,
    );
  }
}

function validateRepositorySlug(repo: string): void {
  const parts = repo.split("/");
  if (
    parts.length !== 2 ||
    !parts[0] ||
    !parts[1] ||
    !parts.every((part) => REPO_PART_PATTERN.test(part))
  ) {
    throw new TenantAddValidationError(
      "Repository must use owner/repo with only ASCII letters, numbers, '.', '_' and '-'.",
    );
  }
}
