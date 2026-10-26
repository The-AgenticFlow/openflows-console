// Presentation of tenant state and lifecycle-action copy in product language.
// No infrastructure terms (workspace IDs, Redis keys) appear here.
import { type Tenant, type TenantAction, tenantStateLabel } from "@/lib/manager/contract";

import { Badge } from "./ui/primitives";

export function StateBadge({ tenant }: Readonly<{ tenant: Pick<Tenant, "observed_state" | "desired_state"> }>) {
  const s = tenantStateLabel(tenant);
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

/** Copy for each lifecycle action, including the effect shown in confirmations. */
export const ACTION_COPY: Record<TenantAction, { label: string; title: string; effect: string; danger: boolean; confirm: boolean }> = {
  start: { label: "Start", title: "Start this tenant?", effect: "The runtime starts and resumes picking up GitHub issues.", danger: false, confirm: false },
  stop: { label: "Stop", title: "Stop this tenant?", effect: "The runtime stops. In-progress agent work pauses until you start it again. No data is deleted.", danger: false, confirm: true },
  clean: { label: "Clean", title: "Clean this tenant?", effect: "Stuck or failed tickets are reset to open and recovery counters are cleared, so agents may pick them up again. Pull requests already opened are not removed.", danger: false, confirm: true },
  delete: { label: "Delete", title: "Delete this tenant?", effect: "The runtime, its workspace and all of its OpenFlows data are permanently removed. Your GitHub repository is not touched. This cannot be undone.", danger: true, confirm: true },
};
