// Typed data source seam for AI Providers, Models, and Policy (Issue #290).
// - "manager" / "real": queries the central OpenFlows Manager HTTP service (/api/v1/ai).
// - "mock": in-memory fixtures, no live Coder or Manager needed for local dev.

import {
  createAiModel as managerCreateAiModel,
  createAiProvider as managerCreateAiProvider,
  deleteAiModel as managerDeleteAiModel,
  deleteAiProvider as managerDeleteAiProvider,
  fetchAiModels as managerFetchAiModels,
  fetchAiProviders as managerFetchAiProviders,
  fetchGlobalModelPolicy as managerFetchGlobalModelPolicy,
  fetchTenantModelPolicy as managerFetchTenantModelPolicy,
  resolveModelForRole as managerResolveModelForRole,
  setGlobalModelPolicy as managerSetGlobalModelPolicy,
  setTenantModelPolicy as managerSetTenantModelPolicy,
  updateAiModel as managerUpdateAiModel,
  updateAiProvider as managerUpdateAiProvider,
} from "@/lib/api/manager-client";
import { mockAiModels, mockAiProviders, mockModelPolicy } from "@/lib/api/mock-data";
import { getEnv } from "@/lib/config/env";
import type {
  AiModelCreateInput,
  AiModelSummary,
  AiModelUpdateInput,
  AiProviderCreateInput,
  AiProviderSummary,
  AiProviderUpdateInput,
  ModelPolicy,
  ResolvedModel,
} from "@/lib/domain/types";

function getDataSource(): string {
  return getEnv("OPENFLOWS_DATA_SOURCE") ?? "mock";
}

// In-memory mock stores for local development
let localProviders: AiProviderSummary[] = [...mockAiProviders];
let localModels: AiModelSummary[] = [...mockAiModels];
let localGlobalPolicy: ModelPolicy = { ...mockModelPolicy };
const localTenantPolicies: Record<string, ModelPolicy> = {};

// ── Providers ─────────────────────────────────────────────────────────────

export async function fetchAiProviders(): Promise<AiProviderSummary[]> {
  if (getDataSource() === "manager") {
    return managerFetchAiProviders();
  }
  return localProviders;
}

export async function createAiProvider(
  input: AiProviderCreateInput,
): Promise<AiProviderSummary> {
  if (getDataSource() === "manager") {
    return managerCreateAiProvider(input);
  }
  const id = `prov-${Date.now()}`;
  const now = new Date().toISOString();
  const provider: AiProviderSummary = {
    id,
    type: input.provider_type,
    name: input.name,
    display_name: input.display_name || input.name,
    base_url: input.base_url || "",
    enabled: input.enabled ?? true,
    has_api_key: Boolean(input.api_key),
    created_at: now,
    updated_at: now,
  };
  localProviders.push(provider);
  return provider;
}

export async function updateAiProvider(
  id: string,
  input: AiProviderUpdateInput,
): Promise<AiProviderSummary> {
  if (getDataSource() === "manager") {
    return managerUpdateAiProvider(id, input);
  }
  const p = localProviders.find((x) => x.id === id);
  if (!p) throw new Error(`Provider not found: ${id}`);
  if (input.display_name !== undefined) p.display_name = input.display_name;
  if (input.base_url !== undefined) p.base_url = input.base_url;
  if (input.enabled !== undefined) p.enabled = input.enabled;
  if (input.api_key) p.has_api_key = true;
  p.updated_at = new Date().toISOString();
  return p;
}

export async function deleteAiProvider(id: string): Promise<void> {
  if (getDataSource() === "manager") {
    return managerDeleteAiProvider(id);
  }
  localProviders = localProviders.filter((x) => x.id !== id);
}

// ── Models ────────────────────────────────────────────────────────────────

export async function fetchAiModels(): Promise<AiModelSummary[]> {
  if (getDataSource() === "manager") {
    return managerFetchAiModels();
  }
  return localModels;
}

export async function createAiModel(input: AiModelCreateInput): Promise<AiModelSummary> {
  if (getDataSource() === "manager") {
    return managerCreateAiModel(input);
  }
  const id = `model-${Date.now()}`;
  const now = new Date().toISOString();
  const model: AiModelSummary = {
    id,
    ai_provider_id: input.ai_provider_id,
    model: input.model,
    display_name: input.display_name || input.model,
    enabled: input.enabled ?? true,
    is_default: input.is_default ?? false,
    context_limit: input.context_limit ?? 128000,
    compression_threshold: input.compression_threshold,
    created_at: now,
    updated_at: now,
  };
  if (model.is_default) {
    for (const m of localModels) {
      m.is_default = false;
    }
  }
  localModels.push(model);
  return model;
}

export async function updateAiModel(
  id: string,
  input: AiModelUpdateInput,
): Promise<AiModelSummary> {
  if (getDataSource() === "manager") {
    return managerUpdateAiModel(id, input);
  }
  const m = localModels.find((x) => x.id === id);
  if (!m) throw new Error(`Model not found: ${id}`);
  if (input.display_name !== undefined) m.display_name = input.display_name;
  if (input.context_limit !== undefined) m.context_limit = input.context_limit;
  if (input.compression_threshold !== undefined)
    m.compression_threshold = input.compression_threshold;
  if (input.enabled !== undefined) m.enabled = input.enabled;
  if (input.is_default) {
    for (const other of localModels) {
      other.is_default = false;
    }
    m.is_default = true;
  }
  m.updated_at = new Date().toISOString();
  return m;
}

export async function deleteAiModel(id: string): Promise<void> {
  if (getDataSource() === "manager") {
    return managerDeleteAiModel(id);
  }
  localModels = localModels.filter((x) => x.id !== id);
}

// ── Policy ────────────────────────────────────────────────────────────────

export async function fetchGlobalModelPolicy(): Promise<ModelPolicy> {
  if (getDataSource() === "manager") {
    return managerFetchGlobalModelPolicy();
  }
  return localGlobalPolicy;
}

export async function setGlobalModelPolicy(policy: ModelPolicy): Promise<ModelPolicy> {
  if (getDataSource() === "manager") {
    return managerSetGlobalModelPolicy(policy);
  }
  localGlobalPolicy = { ...policy };
  return localGlobalPolicy;
}

export async function fetchTenantModelPolicy(tenant: string): Promise<ModelPolicy> {
  if (getDataSource() === "manager") {
    return managerFetchTenantModelPolicy(tenant);
  }
  return localTenantPolicies[tenant] ?? { roles: {} };
}

export async function setTenantModelPolicy(
  tenant: string,
  policy: ModelPolicy,
): Promise<ModelPolicy> {
  if (getDataSource() === "manager") {
    return managerSetTenantModelPolicy(tenant, policy);
  }
  localTenantPolicies[tenant] = { ...policy };
  return localTenantPolicies[tenant];
}

export async function resolveModelForRole(
  role: string,
  tenant?: string,
): Promise<ResolvedModel> {
  if (getDataSource() === "manager") {
    return managerResolveModelForRole(role, tenant);
  }
  // Mock resolution simulation
  if (tenant && localTenantPolicies[tenant]) {
    const tPol = localTenantPolicies[tenant];
    if (tPol.roles[role]) {
      return { role, model: tPol.roles[role], source: "role_policy" };
    }
    if (tPol.default_model) {
      return { role, model: tPol.default_model, source: "default_policy" };
    }
  }

  if (localGlobalPolicy.roles[role]) {
    return { role, model: localGlobalPolicy.roles[role], source: "role_policy" };
  }
  if (localGlobalPolicy.default_model) {
    return { role, model: localGlobalPolicy.default_model, source: "default_policy" };
  }

  const coderDefault = localModels.find((m) => m.is_default && m.enabled);
  if (coderDefault) {
    return { role, model: coderDefault.model, source: "coder_default" };
  }

  return { role, model: "claude-3-7-sonnet-20250219", source: "coder_default" };
}
