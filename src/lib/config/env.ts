// Runtime environment access and startup validation for server-side OpenFlows
// integrations. This is the only module that reads process.env.
export interface EnvSchema {
  REDIS_URL: string;
  OPENFLOWS_TENANT: string;
  CODER_URL: string;
  CODER_SESSION_TOKEN: string;
  OPENFLOWS_DATA_SOURCE: "mock" | "real";
}

type EnvName = keyof EnvSchema;

const requiredInRealMode: EnvName[] = [
  "REDIS_URL",
  "OPENFLOWS_TENANT",
  "CODER_URL",
  "CODER_SESSION_TOKEN",
];

export function getEnv<Name extends EnvName>(name: Name): EnvSchema[Name] | undefined {
  const dataSource = process.env.OPENFLOWS_DATA_SOURCE;
  if (dataSource && dataSource !== "mock" && dataSource !== "real") {
    throw new Error('OPENFLOWS_DATA_SOURCE must be "mock" or "real".');
  }
  return process.env[name] as EnvSchema[Name] | undefined;
}

export function validateEnv(): void {
  const dataSource = getEnv("OPENFLOWS_DATA_SOURCE") ?? "mock";
  if (dataSource === "mock") return;

  const missing = requiredInRealMode.filter((required) => !getEnv(required));
  if (missing.length) {
    throw new Error(
      `Missing required environment variables for real mode:\n- ${missing.join("\n- ")}\nSet them in .env.local.`,
    );
  }
}
