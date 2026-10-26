// Runtime environment access and startup validation for server-side OpenFlows
// integrations. This is the only module that reads process.env (next.config.ts
// is the single documented exception: rewrites resolve before app code runs).
export interface EnvSchema {
  // Base URL of OpenFlows Manager. The Console reaches only its /api/v1 (and
  // the login pages under /auth), same-origin through a Next rewrite.
  OPENFLOWS_MANAGER_URL: string;
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
