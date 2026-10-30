// OrgStatusBanner: shown across the shell while Manager is still provisioning
// the organisation (or if provisioning did not finish). Polls the organisation
// until it becomes ready, then refreshes server data. Manager reports the
// latest setup operation; when it has failed the banner says why in product
// language and, for admins, offers a retry (POST /operations/{id}/retry).
// Manager enforces what may be done meanwhile; this only explains why some
// actions may be refused. Text follows the active language.
"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { api, type ConsoleError } from "@/lib/client/api";
import { canAdminister } from "@/lib/manager/contract";
import { useT } from "@/lib/preferences/client";

import { useConsole } from "./shell/console-context";
import { Button, Spinner } from "./ui/button";
import { IconAlert, IconRefresh } from "./ui/icons";
import { ErrorNotice } from "./ui/primitives";

const FAILED_STATES = ["failed", "retryable_failed", "cancelled"];

export function OrgStatusBanner() {
  const { org, orgId, role } = useConsole();
  const { t } = useT();
  const b = t.banner;
  const router = useRouter();
  const pending = org.status !== "active" && org.status !== "ready";
  const { data, refetch } = useQuery({
    queryKey: ["org", orgId, "info"],
    queryFn: () => api.getOrganization(orgId),
    enabled: pending,
    refetchInterval: 3000,
    retry: false,
  });
  const retry = useMutation({
    mutationFn: (operationId: string) => api.retryOperation(operationId),
    onSuccess: () => void refetch(),
  });
  const status = data?.status ?? org.status;
  const ready = status === "active" || status === "ready";
  const setup = data?.provisioning ?? null;
  const failed = !!setup && FAILED_STATES.includes(setup.state);

  // After a few minutes of waiting, stop promising it is quick and point to the operator.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setSlow(true), 120_000);
    return () => clearTimeout(t);
  }, [pending]);
  useEffect(() => {
    if (pending && (data?.status === "active" || data?.status === "ready")) router.refresh();
  }, [pending, data?.status, router]);

  if (ready) return null;

  if (failed) {
    return (
      <div role="alert" className="mb-6 flex animate-pop gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3.5 text-sm text-danger">
        <IconAlert size={18} className="mt-0.5" />
        <div className="min-w-0 flex-1 space-y-3">
        <div>
          <p className="font-medium">{b.failedTitle}</p>
          <p className="mt-0.5 opacity-90">{b.setupFailure[setup.error_code ?? ""] ?? b.setupFailure.default} {b.failedSuffix}</p>
          <p className="mt-1 text-xs opacity-80">{b.attempts(setup.attempt_count)}{setup.error_code ? ` · ${setup.error_code}` : ""}</p>
        </div>
        {retry.error ? <ErrorNotice error={retry.error as ConsoleError} /> : null}
        {canAdminister(role) ? (
          <Button variant="primary" loading={retry.isPending} onClick={() => retry.mutate(setup.operation_id)}>{retry.isPending ? null : <IconRefresh size={14} />} {b.retry}</Button>
        ) : (
          <p className="text-xs opacity-90">{b.askAdmin}</p>
        )}
        </div>
      </div>
    );
  }

  const working = status === "provisioning" || status === "pending";
  return (
    <div role="status" className={`relative mb-6 flex animate-pop items-start gap-3 overflow-hidden rounded-xl border px-4 py-3.5 text-sm ${working ? "border-info/30 bg-info-soft text-info" : "border-warning/30 bg-warning-soft text-warning"}`}>
      {working ? <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 animate-shimmer bg-[length:200%_100%] bg-[linear-gradient(90deg,transparent,var(--info),transparent)]" /> : null}
      {working ? <Spinner className="mt-0.5 h-4 w-4" /> : null}
      <div>
        <p className="font-medium">{working ? b.settingUp : b.notReady}</p>
        <p className="mt-0.5 opacity-90">{working ? (slow ? b.slow : b.working) : b.stuck}</p>
      </div>
    </div>
  );
}
