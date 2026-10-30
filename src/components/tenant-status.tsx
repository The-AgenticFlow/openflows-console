// Presentation of tenant state and lifecycle-action copy in product language
// and the active language. No infrastructure terms (workspace IDs, Redis keys)
// appear here. Action copy (label, confirmation title, effect) lives in the
// dictionaries under `tenant.actions`; `ACTION_RULES` keeps the behaviour
// (which actions are destructive and which need confirmation).
"use client";

import { type Tenant, type TenantAction, tenantStateLabel } from "@/lib/manager/contract";
import { useT } from "@/lib/preferences/client";

import { Badge } from "./ui/primitives";

const LIVE = ["provisioning", "deleting", "starting", "stopping"];

export function StateBadge({ tenant }: Readonly<{ tenant: Pick<Tenant, "observed_state" | "desired_state"> }>) {
  const { t } = useT();
  const s = tenantStateLabel(tenant);
  return <Badge tone={s.tone} dot live={LIVE.includes(tenant.observed_state)}>{s.key ? t.states[s.key] : s.label}</Badge>;
}

/** Plain-language name of any Manager state string (tenant desired state, workspace state…). */
export function useStateName() {
  const { t } = useT();
  return (state: string) => t.states[state] ?? state.replace(/_/g, " ");
}

export const ACTION_RULES: Record<TenantAction, { danger: boolean; confirm: boolean }> = {
  start: { danger: false, confirm: false },
  stop: { danger: false, confirm: true },
  clean: { danger: false, confirm: true },
  delete: { danger: true, confirm: true },
};
