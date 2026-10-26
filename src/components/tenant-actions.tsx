// TenantActions: state- and role-aware lifecycle controls. Which buttons show
// comes from `tenantActions(state, role)`; Manager remains the authority and
// its refusals are shown inline. Actions with consequences go through
// ConfirmDialog with the effect spelled out; delete also requires typing the
// tenant name. Mutations return an accepted operation, reported via onStarted.
"use client";

import { useState } from "react";

import type { ConsoleError } from "@/lib/client/api";
import { useTenantAction } from "@/lib/client/queries";
import { type Tenant, type TenantAction, tenantActions } from "@/lib/manager/contract";

import { useConsole } from "./shell/console-context";
import { ACTION_COPY } from "./tenant-status";
import { Button } from "./ui/button";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { ErrorNotice } from "./ui/primitives";

export function TenantActions({ tenant, onStarted }: Readonly<{ tenant: Tenant; onStarted: (operationId: string, action: TenantAction) => void }>) {
  const { orgId, role } = useConsole();
  const run = useTenantAction(orgId, tenant.id);
  const [pending, setPending] = useState<TenantAction | null>(null);
  const actions = tenantActions(tenant, role);
  if (actions.length === 0) return null;

  const close = () => { setPending(null); run.reset(); };
  const copy = pending ? ACTION_COPY[pending] : null;
  const exec = (a: TenantAction, done?: () => void) =>
    run.mutate(a, { onSuccess: (op) => { onStarted(op.operation_id, a); done?.(); } });

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button
            key={a}
            variant={a === "delete" ? "danger" : "secondary"}
            loading={run.isPending && run.variables === a && !ACTION_COPY[a].confirm}
            onClick={() => { if (ACTION_COPY[a].confirm) { run.reset(); setPending(a); } else exec(a); }}
          >
            {ACTION_COPY[a].label}
          </Button>
        ))}
      </div>
      {!pending && run.error ? <div className="mt-3"><ErrorNotice error={run.error as ConsoleError} /></div> : null}
      <ConfirmDialog
        open={pending !== null}
        title={copy?.title ?? ""}
        description={copy?.effect ?? ""}
        confirmLabel={copy?.label ?? "Confirm"}
        danger={copy?.danger}
        requireText={pending === "delete" ? tenant.slug : undefined}
        pending={run.isPending}
        error={(pending && run.error ? run.error : null) as ConsoleError | null}
        onClose={close}
        onConfirm={() => { if (pending) exec(pending, close); }}
      />
    </>
  );
}
