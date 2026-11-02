// Runtime health: whether a tenant's Nexus agent runtime is actually checking
// in, from Manager's `runtime` block on the tenant status endpoint. A tenant
// can be "Running" in Manager's records while its runtime has gone silent
// (host asleep, network loss), so the Console shows both.
//
// - RuntimeHealthBadge: compact pill for lists and headers.
// - RuntimeHealthCard: the tenant page section, with the last check-in and,
//   when the runtime is silent, an explanation and (for operators) a Restart.
// - useRestartTenant: Restart = stop, wait for the stop operation to finish,
//   then start. Starting issues a fresh runtime bootstrap, which is the
//   documented recovery for `restart_required`. Both steps are ordinary
//   Manager operations, so they appear in Activity and the audit log.
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { api, type ConsoleError } from "@/lib/client/api";
import { formatDateTime, relativeTime } from "@/lib/i18n";
import { canOperate, isOperationActive, type RuntimeStatus } from "@/lib/manager/contract";
import { useT } from "@/lib/preferences/client";

import { useConsole } from "./shell/console-context";
import { Button } from "./ui/button";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { IconAlert, IconRefresh, IconTerminal } from "./ui/icons";
import { Badge, Card, CardHeader, ErrorNotice, type Tone } from "./ui/primitives";
import { useToast } from "./ui/toast";

const TONE: Record<string, Tone> = {
  healthy: "success",
  starting: "info",
  unresponsive: "warning",
  restart_required: "danger",
  inactive: "neutral",
};

export function RuntimeHealthBadge({ runtime }: Readonly<{ runtime: RuntimeStatus | null | undefined }>) {
  const { t } = useT();
  if (!runtime) return null;
  return <Badge dot live={runtime.health === "starting"} tone={TONE[runtime.health] ?? "neutral"}>{t.runtime.health[runtime.health] ?? runtime.health}</Badge>;
}

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

/** Wait for an operation to leave queued/running; returns its final state. */
async function waitFor(operationId: string): Promise<string> {
  for (let i = 0; i < 240; i++) {
    const op = await api.getOperation(operationId);
    if (!isOperationActive(op.state)) return op.state;
    await sleep(2500);
  }
  return "timeout";
}

export function useRestartTenant(orgId: string, tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const stop = await api.tenantAction(orgId, tenantId, "stop");
      void qc.invalidateQueries({ queryKey: ["org", orgId] });
      if ((await waitFor(stop.operation_id)) !== "succeeded") throw new Error("stop");
      const start = await api.tenantAction(orgId, tenantId, "start");
      void qc.invalidateQueries({ queryKey: ["org", orgId] });
      return start;
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["org", orgId] }),
  });
}

export function RuntimeHealthCard({ tenantId, runtime }: Readonly<{ tenantId: string; runtime: RuntimeStatus | null | undefined }>) {
  const { orgId, role } = useConsole();
  const { t, locale } = useT();
  const toast = useToast();
  const restart = useRestartTenant(orgId, tenantId);
  const [confirm, setConfirm] = useState(false);
  if (!runtime) return null;
  const r = t.runtime;
  const silent = runtime.health === "unresponsive" || runtime.health === "restart_required";

  return (
    <Card>
      <CardHeader title={r.title} description={r.body} icon={<IconTerminal size={15} />} action={<RuntimeHealthBadge runtime={runtime} />} />
      <div className="space-y-4 p-5">
        <p className="text-sm text-muted" title={formatDateTime(runtime.last_heartbeat_at, locale)}>
          {runtime.last_heartbeat_at ? r.lastSeen(relativeTime(runtime.last_heartbeat_at, locale, t)) : r.noCheckIn}
          {runtime.registered_at ? ` · ${r.registered(relativeTime(runtime.registered_at, locale, t))}` : ""}
        </p>
        {silent ? (
          <div role="alert" className={`flex gap-3 rounded-lg border px-4 py-3 text-sm ${runtime.health === "restart_required" ? "border-danger/25 bg-danger-soft text-danger" : "border-warning/25 bg-warning-soft text-warning"}`}>
            <IconAlert size={16} className="mt-0.5" />
            <div className="min-w-0 flex-1 space-y-3">
              <p>{runtime.health === "restart_required" ? r.restartBody : r.unresponsiveBody}</p>
              {canOperate(role) ? (
                <Button variant="primary" loading={restart.isPending} onClick={() => { restart.reset(); setConfirm(true); }}>
                  {restart.isPending ? null : <IconRefresh size={14} />} {r.restart}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
        {restart.error ? (
          restart.error instanceof Error && restart.error.message === "stop"
            ? <p role="alert" className="text-sm text-danger">{r.restartFailed}</p>
            : <ErrorNotice error={restart.error as ConsoleError} />
        ) : null}
      </div>
      <ConfirmDialog
        open={confirm}
        title={r.restartTitle}
        description={r.restartEffect}
        confirmLabel={r.restart}
        pending={false}
        error={null}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          toast.show({ kind: "info", title: t.toasts.restartStarted });
          restart.mutate(undefined, {
            onSuccess: () => toast.show({ kind: "success", title: t.toasts.restartDone }),
            onError: () => toast.show({ kind: "error", title: t.toasts.actionFailed(r.restart) }),
          });
        }}
      />
    </Card>
  );
}
