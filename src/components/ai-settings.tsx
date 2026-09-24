"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import type {
  AiModelSummary,
  AiProviderSummary,
  ModelPolicy,
  ResolvedModel,
  TenantFleet,
} from "@/lib/domain/types";

const AGENT_ROLES = [
  {
    id: "forge",
    name: "Forge",
    description: "Code authoring, refactoring, test generation, and pull requests",
  },
  {
    id: "sentinel",
    name: "Sentinel",
    description: "Code reviews, security scanning, policy compliance, and verification gates",
  },
  {
    id: "vessel",
    name: "Vessel",
    description: "Orchestration, tool execution, CLI commands, and deployment runs",
  },
  {
    id: "lore",
    name: "Lore",
    description: "Architectural context, documentation retrieval, and repo memory",
  },
  {
    id: "nexus",
    name: "Nexus",
    description: "Multi-agent coordinator, ticket dispatching, and high-level strategy",
  },
];

const PROVIDER_TYPES = [
  { id: "anthropic", label: "Anthropic" },
  { id: "openai", label: "OpenAI" },
  { id: "openai-compat", label: "OpenAI-Compatible (Ollama, vLLM, LiteLLM)" },
  { id: "google", label: "Google Vertex / Gemini" },
  { id: "bedrock", label: "AWS Bedrock" },
];

export function AiSettings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"policy" | "providers" | "models">("policy");
  const [selectedTenant, setSelectedTenant] = useState<string>("global");

  // Load Tenants for Scope Selector
  const { data: fleet } = useQuery<TenantFleet[]>({
    queryKey: ["fleet"],
    queryFn: async () => {
      const res = await fetch("/api/fleet");
      return res.json();
    },
  });
  const tenantNames = (fleet ?? []).map((t) => t.tenant).filter(Boolean);

  // Load Providers
  const {
    data: providers = [],
    isLoading: isLoadingProviders,
    refetch: refetchProviders,
  } = useQuery<AiProviderSummary[]>({
    queryKey: ["ai", "providers"],
    queryFn: async () => {
      const res = await fetch("/api/ai/providers");
      if (!res.ok) throw new Error("Failed to load AI providers");
      return res.json();
    },
  });

  // Load Models
  const {
    data: models = [],
    isLoading: isLoadingModels,
    refetch: refetchModels,
  } = useQuery<AiModelSummary[]>({
    queryKey: ["ai", "models"],
    queryFn: async () => {
      const res = await fetch("/api/ai/models");
      if (!res.ok) throw new Error("Failed to load AI models");
      return res.json();
    },
  });

  // Load Policy (Global or Tenant)
  const policyEndpoint =
    selectedTenant === "global"
      ? "/api/ai/model-policy"
      : `/api/ai/model-policy/${encodeURIComponent(selectedTenant)}`;

  const {
    data: currentPolicy,
    isLoading: isLoadingPolicy,
    refetch: refetchPolicy,
  } = useQuery<ModelPolicy>({
    queryKey: ["ai", "policy", selectedTenant],
    queryFn: async () => {
      const res = await fetch(policyEndpoint);
      if (!res.ok) throw new Error("Failed to load model policy");
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("policy")}
          className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "policy"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:border-border hover:text-foreground"
          }`}
        >
          Model Assignment Policy
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("providers")}
          className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "providers"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:border-border hover:text-foreground"
          }`}
        >
          AI Providers ({providers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("models")}
          className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "models"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:border-border hover:text-foreground"
          }`}
        >
          AI Models ({models.length})
        </button>
      </div>

      {activeTab === "policy" && (
        <PolicyTab
          selectedTenant={selectedTenant}
          setSelectedTenant={setSelectedTenant}
          tenantNames={tenantNames}
          policy={currentPolicy}
          models={models}
          isLoading={isLoadingPolicy}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["ai", "policy"] });
            queryClient.invalidateQueries({ queryKey: ["ai", "resolve"] });
          }}
        />
      )}

      {activeTab === "providers" && (
        <ProvidersTab
          providers={providers}
          isLoading={isLoadingProviders}
          onUpdated={() => {
            refetchProviders();
            refetchModels();
          }}
        />
      )}

      {activeTab === "models" && (
        <ModelsTab
          models={models}
          providers={providers}
          isLoading={isLoadingModels}
          onUpdated={() => {
            refetchModels();
            refetchPolicy();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POLICY TAB
// ─────────────────────────────────────────────────────────────────────────────

function PolicyTab({
  selectedTenant,
  setSelectedTenant,
  tenantNames,
  policy,
  models,
  isLoading,
  onSaved,
}: {
  selectedTenant: string;
  setSelectedTenant: (t: string) => void;
  tenantNames: string[];
  policy?: ModelPolicy;
  models: AiModelSummary[];
  isLoading: boolean;
  onSaved: () => void;
}) {
  const [defaultModel, setDefaultModel] = useState<string>("");
  const [roleOverrides, setRoleOverrides] = useState<Record<string, string>>({});
  const [testRole, setTestRole] = useState<string>("forge");
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync state when policy loads
  const currentDefault = policy?.default_model ?? "";
  const currentRoles = policy?.roles ?? {};

  // Form values tracked with fallbacks
  const effectiveDefault = defaultModel !== "" ? defaultModel : currentDefault;
  const effectiveRoles = { ...currentRoles, ...roleOverrides };

  // Live Role Resolution Inspector Query
  const { data: resolved, isFetching: isResolving } = useQuery<ResolvedModel>({
    queryKey: ["ai", "resolve", testRole, selectedTenant, saveSuccess],
    queryFn: async () => {
      const url = new URL("/api/ai/model-policy/resolve", window.location.origin);
      url.searchParams.set("role", testRole);
      if (selectedTenant !== "global") {
        url.searchParams.set("tenant", selectedTenant);
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to resolve");
      return res.json();
    },
    enabled: true,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const endpoint =
        selectedTenant === "global"
          ? "/api/ai/model-policy"
          : `/api/ai/model-policy/${encodeURIComponent(selectedTenant)}`;

      // Filter out empty role values
      const cleanedRoles: Record<string, string> = {};
      for (const [r, m] of Object.entries(effectiveRoles)) {
        if (m && m.trim().length > 0) {
          cleanedRoles[r] = m.trim();
        }
      }

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          default_model: effectiveDefault || undefined,
          roles: cleanedRoles,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save model policy");
      }
      return res.json();
    },
    onSuccess: () => {
      setSaveSuccess(true);
      setSaveError(null);
      setTimeout(() => setSaveSuccess(false), 3000);
      onSaved();
    },
    onError: (err: Error) => {
      setSaveError(err.message);
      setSaveSuccess(false);
    },
  });

  return (
    <div className="space-y-6">
      {/* Scope Selector */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Configuration Scope</h3>
            <p className="text-xs text-muted">
              Choose whether you are setting the global fallback policy or a tenant override.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="scope-select" className="text-xs font-medium text-muted">
              Scope:
            </label>
            <select
              id="scope-select"
              value={selectedTenant}
              onChange={(e) => {
                setSelectedTenant(e.target.value);
                setDefaultModel("");
                setRoleOverrides({});
              }}
              className="rounded-md border border-border bg-surface-muted px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="global">🌐 Global Deployment Policy</option>
              {tenantNames.map((t) => (
                <option key={t} value={t}>
                  🏢 Tenant: {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted">
          Loading model policy…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Policy Matrix Form */}
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Default Model</h3>
                <p className="mt-1 text-xs text-muted">
                  Used by all OpenFlows agents unless an individual role override is configured.
                  Single-model setups only need this set.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={effectiveDefault}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">(Inherit Coder deployment default)</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.model}>
                      {m.display_name} ({m.model}) {m.is_default ? "★ Default" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Role Assignments */}
            <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Role-Specific Overrides (Optional)
                </h3>
                <p className="mt-1 text-xs text-muted">
                  Assign specialized high-reasoning or fast models to specific agent roles. Any role
                  left as &quot;Inherit Default&quot; will automatically use the default model.
                </p>
              </div>

              <div className="space-y-3 divide-y divide-border/60">
                {AGENT_ROLES.map((role) => {
                  const currentVal = effectiveRoles[role.id] ?? "";
                  return (
                    <div
                      key={role.id}
                      className="flex flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-primary">
                            {role.name}
                          </span>
                          <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[11px] text-muted font-mono">
                            {role.id}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-0.5">{role.description}</p>
                      </div>

                      <div className="w-full sm:w-64">
                        <select
                          value={currentVal}
                          onChange={(e) =>
                            setRoleOverrides({
                              ...roleOverrides,
                              [role.id]: e.target.value,
                            })
                          }
                          className="w-full rounded-md border border-border bg-surface-muted px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                        >
                          <option value="">↳ Inherit Default ({effectiveDefault || "Coder default"})</option>
                          {models.map((m) => (
                            <option key={m.id} value={m.model}>
                              {m.display_name} ({m.model})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              {saveError && (
                <div className="rounded-md bg-danger/10 p-3 text-xs text-danger">
                  {saveError}
                </div>
              )}

              {saveSuccess && (
                <div className="rounded-md bg-success/10 p-3 text-xs text-success">
                  Policy successfully saved and applied!
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-primary-strong disabled:opacity-50"
                >
                  {saveMutation.isPending ? "Saving Policy…" : "Save Policy"}
                </button>
              </div>
            </div>
          </div>

          {/* Live Resolution Inspector */}
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Resolution Inspector</h3>
                <p className="mt-1 text-xs text-muted">
                  Test the multi-tier resolution logic in real time. Inspect which model an agent
                  receives under current policy precedence.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Inspect Role:</label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {AGENT_ROLES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setTestRole(r.id)}
                      className={`rounded px-2.5 py-1 text-xs font-mono transition-colors ${
                        testRole === r.id
                          ? "bg-primary text-surface font-semibold"
                          : "bg-surface-muted text-muted hover:text-foreground"
                      }`}
                    >
                      {r.id}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface-muted p-4 space-y-2">
                <div className="text-xs text-muted">Resolution Result:</div>
                {isResolving ? (
                  <div className="text-xs text-muted">Resolving…</div>
                ) : resolved ? (
                  <div className="space-y-2">
                    <div className="font-mono text-sm font-bold text-foreground">
                      {resolved.model}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted">Source:</span>
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                          resolved.source === "role_policy"
                            ? "bg-purple-500/20 text-purple-300"
                            : resolved.source === "default_policy"
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {resolved.source}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted">No resolution available</div>
                )}
              </div>

              <div className="border-t border-border pt-3 text-[11px] text-muted space-y-1 leading-relaxed">
                <div className="font-semibold text-foreground">Resolution Hierarchy:</div>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Tenant role override</li>
                  <li>Tenant default model</li>
                  <li>Global role override</li>
                  <li>Global default model</li>
                  <li>Coder deployment default</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDERS TAB
// ─────────────────────────────────────────────────────────────────────────────

function ProvidersTab({
  providers,
  isLoading,
  onUpdated,
}: {
  providers: AiProviderSummary[];
  isLoading: boolean;
  onUpdated: () => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [providerType, setProviderType] = useState("anthropic");
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_type: providerType,
          name: name.trim(),
          display_name: displayName.trim() || undefined,
          base_url: baseUrl.trim() || undefined,
          api_key: apiKey.trim() || undefined,
          enabled: true,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to create provider");
      }
      return res.json();
    },
    onSuccess: () => {
      setShowAddForm(false);
      setName("");
      setDisplayName("");
      setBaseUrl("");
      setApiKey("");
      setErrorMsg(null);
      onUpdated();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await fetch(`/api/ai/providers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Failed to toggle provider");
      return res.json();
    },
    onSuccess: () => onUpdated(),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ai/providers/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete provider");
      return res.json();
    },
    onSuccess: () => onUpdated(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">AI Providers</h3>
          <p className="text-xs text-muted">
            Configure upstream AI providers directly via Coder v2.37 API. Secrets are write-only.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-surface transition-colors hover:bg-primary-strong"
        >
          {showAddForm ? "Cancel" : "+ Add Provider"}
        </button>
      </div>

      {showAddForm && (
        <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Register New AI Provider</h4>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted">Provider Type *</label>
              <select
                value={providerType}
                onChange={(e) => setProviderType(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface-muted px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                {PROVIDER_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted">Identifier (slug) *</label>
              <input
                type="text"
                placeholder="e.g. anthropic-primary"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface-muted px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted">Display Name</label>
              <input
                type="text"
                placeholder="e.g. Anthropic Claude"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface-muted px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted">Base URL (optional)</label>
              <input
                type="text"
                placeholder="https://api.openai.com/v1"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface-muted px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted">
                API Key (Write-Only Secret)
              </label>
              <input
                type="password"
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface-muted px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none font-mono"
              />
              <p className="mt-1 text-[11px] text-muted">
                API keys are never displayed or returned in API responses once stored.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-md bg-danger/10 p-2.5 text-xs text-danger">
              {errorMsg}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={createMutation.isPending || !name.trim()}
              onClick={() => createMutation.mutate()}
              className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-surface hover:bg-primary-strong disabled:opacity-50"
            >
              {createMutation.isPending ? "Saving…" : "Save Provider"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted">
          Loading AI providers…
        </div>
      ) : providers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted">No AI providers configured.</p>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="mt-3 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
          >
            Add First Provider
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-border bg-surface p-4 flex flex-col justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary uppercase">
                    {p.type}
                  </span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      p.enabled ? "bg-success" : "bg-muted"
                    }`}
                    title={p.enabled ? "Enabled" : "Disabled"}
                  />
                </div>
                <h4 className="text-sm font-semibold text-foreground pt-1">{p.display_name}</h4>
                <div className="font-mono text-xs text-muted">{p.name}</div>
                {p.base_url && (
                  <div className="truncate text-[11px] text-muted" title={p.base_url}>
                    {p.base_url}
                  </div>
                )}
                <div className="pt-1">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      p.has_api_key
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {p.has_api_key ? "Key Configured (Write-Only)" : "No Key Set"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() =>
                    toggleMutation.mutate({ id: p.id, enabled: !p.enabled })
                  }
                  className="text-xs text-muted hover:text-foreground"
                >
                  {p.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete provider "${p.name}"?`)) {
                      deleteMutation.mutate(p.id);
                    }
                  }}
                  className="text-xs text-danger hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODELS TAB
// ─────────────────────────────────────────────────────────────────────────────

function ModelsTab({
  models,
  providers,
  isLoading,
  onUpdated,
}: {
  models: AiModelSummary[];
  providers: AiProviderSummary[];
  isLoading: boolean;
  onUpdated: () => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [providerId, setProviderId] = useState("");
  const [modelId, setModelId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [contextLimit, setContextLimit] = useState(128000);
  const [isDefault, setIsDefault] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_provider_id: providerId || providers[0]?.id,
          model: modelId.trim(),
          display_name: displayName.trim() || undefined,
          context_limit: Number(contextLimit) || 128000,
          is_default: isDefault,
          enabled: true,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to create model");
      }
      return res.json();
    },
    onSuccess: () => {
      setShowAddForm(false);
      setModelId("");
      setDisplayName("");
      setContextLimit(128000);
      setIsDefault(false);
      setErrorMsg(null);
      onUpdated();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ai/models/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });
      if (!res.ok) throw new Error("Failed to set default model");
      return res.json();
    },
    onSuccess: () => onUpdated(),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ai/models/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete model");
      return res.json();
    },
    onSuccess: () => onUpdated(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">AI Models</h3>
          <p className="text-xs text-muted">
            Registered chat models exposed by Coder for workspaces and OpenFlows agents.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (providers.length === 0) {
              alert("Please create at least one AI provider before adding models.");
              return;
            }
            setShowAddForm(!showAddForm);
          }}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-surface transition-colors hover:bg-primary-strong"
        >
          {showAddForm ? "Cancel" : "+ Register Model"}
        </button>
      </div>

      {showAddForm && (
        <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Register New Chat Model</h4>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted">AI Provider *</label>
              <select
                value={providerId || providers[0]?.id}
                onChange={(e) => setProviderId(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface-muted px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name} ({p.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted">Model Identifier *</label>
              <input
                type="text"
                placeholder="e.g. claude-3-7-sonnet-20250219"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface-muted px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted">Display Name</label>
              <input
                type="text"
                placeholder="e.g. Claude 3.7 Sonnet"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface-muted px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted">Context Limit (Tokens)</label>
              <input
                type="number"
                placeholder="128000"
                value={contextLimit}
                onChange={(e) => setContextLimit(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-border bg-surface-muted px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is-default-checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="is-default-checkbox" className="text-xs text-foreground">
                Set as default chat model for Coder deployment
              </label>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-md bg-danger/10 p-2.5 text-xs text-danger">
              {errorMsg}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={createMutation.isPending || !modelId.trim()}
              onClick={() => createMutation.mutate()}
              className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-surface hover:bg-primary-strong disabled:opacity-50"
            >
              {createMutation.isPending ? "Registering…" : "Register Model"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted">
          Loading models…
        </div>
      ) : models.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted">No AI models registered in Coder.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-muted text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Identifier</th>
                <th className="px-4 py-3">Context Limit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {models.map((m) => (
                <tr key={m.id} className="hover:bg-surface-muted/50">
                  <td className="px-4 py-3 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <span>{m.display_name}</span>
                      {m.is_default && (
                        <span className="rounded bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
                          ★ Default
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{m.model}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {m.context_limit ? `${(m.context_limit / 1000).toFixed(0)}k` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
                        m.enabled
                          ? "bg-success/10 text-success"
                          : "bg-muted/20 text-muted"
                      }`}
                    >
                      {m.enabled ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {!m.is_default && (
                      <button
                        type="button"
                        onClick={() => setDefaultMutation.mutate(m.id)}
                        className="text-xs text-muted hover:text-foreground"
                      >
                        Make Default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete model "${m.display_name}"?`)) {
                          deleteMutation.mutate(m.id);
                        }
                      }}
                      className="text-xs text-danger hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
