// Runtime environment access and startup validation for server-side OpenFlows
// integrations. This is the only module that reads process.env (next.config.ts
// is the single documented exception: rewrites resolve before app code runs).
export interface EnvSchema {
  // Base URL of OpenFlows Manager. The Console reaches only its /api/v1 (and
  // the login pages under /auth), same-origin through a Next rewrite.
  OPENFLOWS_MANAGER_URL: string;
  // Optional links shown in the sign-in page footer. Each is rendered only when
  // set, so the Console never links to a page an operator does not have.
  // OPENFLOWS_SUPPORT_URL may be a mailto: address ("Need help signing in?").
  OPENFLOWS_DOCS_URL?: string;
  OPENFLOWS_STATUS_URL?: string;
  OPENFLOWS_PRIVACY_URL?: string;
  OPENFLOWS_TERMS_URL?: string;
  OPENFLOWS_SUPPORT_URL?: string;
}

type EnvName = keyof EnvSchema;

const DEFAULTS: Partial<EnvSchema> = { OPENFLOWS_MANAGER_URL: "http://127.0.0.1:3002" };

export function getEnv<Name extends EnvName>(name: Name): EnvSchema[Name] {
  return ((process.env[name] as EnvSchema[Name] | undefined) ?? DEFAULTS[name]) as EnvSchema[Name];
}

export function validateEnv(): void {
  const url = getEnv("OPENFLOWS_MANAGER_URL");
  try {
    new URL(url);
  } catch {
    throw new Error(`OPENFLOWS_MANAGER_URL is not a valid URL: ${url}`);
  }
}

type LinkName = "OPENFLOWS_DOCS_URL" | "OPENFLOWS_STATUS_URL" | "OPENFLOWS_PRIVACY_URL" | "OPENFLOWS_TERMS_URL" | "OPENFLOWS_SUPPORT_URL";

/**
 * An operator-configured footer link, or undefined when unset or unsafe. Only
 * absolute http(s) URLs and mailto: are accepted, so a misconfigured value can
 * never become a javascript: link.
 */
export function getLink(name: LinkName): string | undefined {
  const raw = getEnv(name)?.trim();
  if (!raw) return undefined;
  try {
    return ["http:", "https:", "mailto:"].includes(new URL(raw).protocol) ? raw : undefined;
  } catch {
    return undefined;
  }
}
