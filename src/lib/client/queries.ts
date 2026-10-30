// TanStack Query hooks over the typed API client. Keys are scoped by
// organisation ID so cached data from one organisation never renders in
// another. Polling (1.5s) runs only while an operation or tenant is in flight.
"use client";

import { useInfiniteQuery, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import { isOperationActive, type Role, type TenantAction } from "../manager/contract";
import { api } from "./api";

const POLL_MS = 1500;

export const keys = {
  connections: (o: string) => ["org", o, "connections"] as const,
  tenants: (o: string) => ["org", o, "tenants"] as const,
  tenant: (o: string, t: string) => ["org", o, "tenant", t] as const,
  tenantStatus: (o: string, t: string) => ["org", o, "tenant", t, "status"] as const,
  members: (o: string) => ["org", o, "members"] as const,
  invitations: (o: string) => ["org", o, "invitations"] as const,
  operation: (id: string) => ["operation", id] as const,
};

export const useConnections = (orgId: string) =>
  useQuery({ queryKey: keys.connections(orgId), queryFn: () => api.listConnections(orgId), retry: false });

export const useTenants = (orgId: string) =>
  useQuery({
    queryKey: keys.tenants(orgId),
    queryFn: () => api.listTenants(orgId),
    retry: false,
    refetchInterval: (q) => (q.state.data?.items.some((t) => ["provisioning", "deleting"].includes(t.observed_state)) ? POLL_MS : false),
  });

export const useTenant = (orgId: string, id: string) =>
  useQuery({
    queryKey: keys.tenant(orgId, id),
    queryFn: () => api.getTenant(orgId, id),
    retry: false,
    refetchInterval: (q) => (q.state.data && ["provisioning", "deleting"].includes(q.state.data.observed_state) ? POLL_MS : false),
  });

export const useTenantStatus = (orgId: string, id: string) =>
  useQuery({ queryKey: keys.tenantStatus(orgId, id), queryFn: () => api.getTenantStatus(orgId, id), retry: false, refetchInterval: 5000 });

export const useMembers = (orgId: string) =>
  useQuery({ queryKey: keys.members(orgId), queryFn: () => api.listMembers(orgId), retry: false });

export const useOperation = (id: string | null) =>
  useQuery({
    queryKey: keys.operation(id ?? ""),
    queryFn: () => api.getOperation(id!),
    enabled: !!id,
    retry: false,
    refetchInterval: (q) => (q.state.data && !isOperationActive(q.state.data.state) ? false : POLL_MS),
  });

export const useCoderIdentity = () => useQuery({ queryKey: ["me", "coder"], queryFn: () => api.getCoderIdentity(), retry: false });
export const useAudit = (orgId: string) =>
  useInfiniteQuery({
    queryKey: ["org", orgId, "audit"],
    queryFn: ({ pageParam }) => api.listAudit(orgId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    retry: false,
  });
export const useInvitations = (orgId: string, enabled: boolean) =>
  useQuery({ queryKey: keys.invitations(orgId), queryFn: () => api.listInvitations(orgId), enabled, retry: false });
export const useOperations = (orgId: string) =>
  useQuery({ queryKey: ["org", orgId, "operations"], queryFn: () => api.listOperations(orgId), retry: false });
export const useRepositories = (orgId: string, connectionId: string | undefined) =>
  useQuery({ queryKey: ["org", orgId, "repos", connectionId], queryFn: () => api.listRepositories(orgId, connectionId!), enabled: !!connectionId, retry: false });
export const usePlatformOverview = () =>
  useQuery({ queryKey: ["platform", "overview"], queryFn: () => api.getPlatformOverview(), retry: false, refetchInterval: 15_000 });

/** Latest operation per tenant (via Manager's tenant status endpoint), for dashboard activity. */
export function useTenantActivity(orgId: string, tenantIds: string[]) {
  return useQueries({
    queries: tenantIds.map((id) => ({ queryKey: keys.tenantStatus(orgId, id), queryFn: () => api.getTenantStatus(orgId, id), retry: false, refetchInterval: 10_000 })),
  });
}

/** Runs a tenant lifecycle action, then refreshes tenant data. Returns the accepted operation. */
export function useTenantAction(orgId: string, tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: TenantAction) => api.tenantAction(orgId, tenantId, action),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.tenants(orgId) });
      void qc.invalidateQueries({ queryKey: keys.tenant(orgId, tenantId) });
    },
  });
}

/** Generic people mutation that refreshes the member list. */
export function useMemberMutation<V>(orgId: string, fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => void qc.invalidateQueries({ queryKey: keys.members(orgId) }) });
}

export type { Role };
