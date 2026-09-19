// Redis client: lazy singleton connection to the OpenFlows SharedStore, plus
// helpers for the tenant-namespaced key scheme (`ns:<tenant>:<key>`).
import { createClient, type RedisClientType } from "redis";

import { getEnv } from "@/lib/config/env";

let client: RedisClientType | null = null;

export function redisUrl(): string {
  const url = getEnv("REDIS_URL");
  if (!url) {
    throw new Error(
      "REDIS_URL is not set. Set it to read live OpenFlows state, or keep OPENFLOWS_DATA_SOURCE=mock for development.",
    );
  }
  return url;
}

export async function getRedis(): Promise<RedisClientType> {
  if (!client) {
    const c = createClient({ url: redisUrl() });
    c.on("error", (err) => console.error("Redis client error:", err.message));
    await c.connect();
    client = c;
  }
  return client;
}

export function tenantKey(tenant: string, key: string): string {
  return `ns:${tenant}:${key}`;
}
