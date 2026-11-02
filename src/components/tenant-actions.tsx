// TenantActions: state- and role-aware lifecycle controls. Which buttons show
// comes from `tenantActions(state, role)`; Manager remains the authority and
// its refusals are shown inline. Actions with consequences go through
// ConfirmDialog with the effect spelled out; delete also requires typing the
// tenant name. Mutations return an accepted operation, reported via onStarted.
// Labels and effects follow the active language. While an operation on the
// tenant is still running (`busy`), the buttons are disabled so a second action
// cannot be queued behind it; Delete stays available so a stuck tenant can
// always be removed.
"use client";

import { useState } from "react";

import type { ConsoleError } from "@/lib/client/api";
import { useTenantAction } from "@/lib/client/queries";
import { type Tenant, type TenantAction, tenantActions } from "@/lib/manager/contract";
import { useT } from "@/lib/preferences/client";

import { useConsole } from "./shell/console-context";
import { ACTION_RULES } from "./tenant-status";
import { Button } from "./ui/button";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { IconPlay, IconRefresh, IconX } from "./ui/icons";
import { ErrorNotice } from "./ui/primitives";
import { useToast } from "./ui/toast";

const ACTION_ICON: Partial<Record<TenantAction, typeof IconPlay>> = { start: IconPlay, clean: IconRefresh, delete: IconX };

export function TenantActions({ tenant, busy = false, onStarted }: Readonly<{ tenant: Tenant; busy?: boolean; onStarted: (operationId: string, action: TenantAction) => void }>) {
  const { orgId, role } = useConsole();
  const { t } = useT();
  const run = useTenantAction(orgId, tenant.id);
  const toast = useToast();
  const [pending, setPending] = useState<TenantAction | null>(null);
  const actions = tenantActions(tenant, role);
  if (actions.length === 0) return null;

  const close = () => { setPending(null); run.reset(); };
  const copy = pending ? t.tenant.actions[pending] : null;
  const exec = (a: TenantAction, done?: () => void) =>
    run.mutate(a, { onSuccess: (op) => { toast.show({ kind: "info", title: t.toasts.actionRequested(t.tenant.actions[a].label) }); onStarted(op.operation_id, a); done?.(); } });

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => {
          const Icon = ACTION_ICON[a];
          return (
            <Button
              key={a}
              variant={a === "delete" ? "danger" : a === "start" ? "primary" : "secondary"}
              loading={run.isPending && run.variables === a && !ACTION_RULES[a].confirm}
              disabled={busy && a !== "delete"}
              onClick={() => { if (ACTION_RULES[a].confirm) { run.reset(); setPending(a); } else exec(a); }}
            >
              {Icon ? <Icon size={14} /> : null}
              {t.tenant.actions[a].label}
            </Button>
          );
        })}
      </div>
      {!pending && run.error ? <div className="mt-3"><ErrorNotice error={run.error as ConsoleError} /></div> : null}
      <ConfirmDialog
        open={pending !== null}
        title={copy?.title ?? ""}
        description={copy?.effect ?? ""}
        confirmLabel={copy?.label ?? t.common.confirm}
        danger={pending ? ACTION_RULES[pending].danger : false}
        requireText={pending === "delete" ? tenant.slug : undefined}
        pending={run.isPending}
        error={(pending && run.error ? run.error : null) as ConsoleError | null}
        onClose={close}
        onConfirm={() => { if (pending) exec(pending, close); }}
      />
    </>
  );
}
