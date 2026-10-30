// OperationProgress: live state of one Manager operation (queued / running /
// succeeded / failed) with its current step and, on failure, a safe
// explanation, whether it can be retried, and the retry action. Polls via
// useOperation until the operation is terminal. Manager exposes `current_step`
// and `error_code` only (no per-stage list), so that is all we render. Text
// follows the active language; known error codes are translated.
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api, type ConsoleError } from "@/lib/client/api";
import { keys, useOperation } from "@/lib/client/queries";
import { errorCopy } from "@/lib/i18n";
import { isOperationActive, type Operation } from "@/lib/manager/contract";
import { useT } from "@/lib/preferences/client";

import { Button, Spinner } from "./ui/button";
import { IconCheck, IconRefresh } from "./ui/icons";
import { Badge, CopyButton, ErrorNotice, Skeleton } from "./ui/primitives";

const TONE = { queued: "neutral", running: "info", succeeded: "success", failed: "danger" } as const;
const human = (s: string) => s.replace(/[._]/g, " ");

export function OperationProgress({ operationId, canRetry }: Readonly<{ operationId: string; canRetry: boolean }>) {
  const { data: op, error, isPending, refetch } = useOperation(operationId);
  const qc = useQueryClient();
  const retry = useMutation({
    mutationFn: () => api.retryOperation(operationId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.operation(operationId) }),
  });

  if (isPending) return <Skeleton className="h-12" />;
  if (error) return <ErrorNotice error={error as ConsoleError} onRetry={() => void refetch()} />;
  return <OperationView op={op} canRetry={canRetry} onRetry={() => retry.mutate()} retrying={retry.isPending} retryError={retry.error as ConsoleError | null} />;
}

export function OperationView({ op, canRetry, onRetry, retrying, retryError }: Readonly<{
  op: Operation; canRetry: boolean; onRetry?: () => void; retrying?: boolean; retryError?: ConsoleError | null;
}>) {
  const { t } = useT();
  const active = isOperationActive(op.state);
  const failed = !active && op.state !== "succeeded";
  const tone = (TONE as Record<string, "neutral" | "info" | "success" | "danger">)[op.state] ?? "danger";
  const copy = errorCopy(t, op.error_code);
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${active ? "bg-info-soft text-info" : failed ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}>
          {active ? <Spinner className="h-4 w-4" /> : failed ? <span className="text-sm font-bold">!</span> : <IconCheck size={16} strokeWidth={2.5} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium capitalize">{human(op.kind)}</p>
          <p className="text-xs text-muted">
            {active ? (op.current_step ? t.operation.step(human(op.current_step)) : t.operation.waiting) : failed ? t.operation.didNotComplete : t.operation.completed}
            {op.attempt_count > 1 ? ` · ${t.operation.attempt(op.attempt_count)}` : ""}
          </p>
        </div>
        <Badge tone={tone} dot live={active}>{t.states[op.state] ?? op.state}</Badge>
      </div>
      {active ? (
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
          <div className="h-full w-1/3 animate-shimmer rounded-full bg-[length:200%_100%] bg-[linear-gradient(90deg,transparent,var(--info),transparent)]" />
        </div>
      ) : null}
      {failed ? (
        <div role="alert" className="mt-4 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
          <p className="font-medium">{op.current_step ? t.operation.failedAt(human(op.current_step)) : t.operation.failed}</p>
          <p className="mt-0.5">{copy?.message ?? t.operation.didNotFinish}</p>
          <p className="mt-1 opacity-90">{copy?.recovery ?? t.operation.retryHint}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-xs opacity-80">
            <span>{t.operation.operationId}: {op.id}{op.error_code ? ` · ${op.error_code}` : ""}</span>
            <CopyButton value={op.id} label={t.operation.operationId} />
          </div>
          {canRetry && onRetry ? <div className="mt-3"><Button variant="primary" loading={retrying} onClick={onRetry}>{retrying ? null : <IconRefresh size={14} />} {t.operation.retry}</Button></div> : null}
          {retryError ? <div className="mt-3"><ErrorNotice error={retryError} /></div> : null}
        </div>
      ) : null}
    </div>
  );
}
