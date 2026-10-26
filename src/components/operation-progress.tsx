// OperationProgress: live state of one Manager operation (queued / running /
// succeeded / failed) with its current step and, on failure, a safe
// explanation, whether it can be retried, and the retry action. Polls via
// useOperation until the operation is terminal. Manager exposes `current_step`
// and `error_code` only (no per-stage list), so that is all we render.
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api, type ConsoleError } from "@/lib/client/api";
import { keys, useOperation } from "@/lib/client/queries";
import { describeError, isOperationActive, type Operation } from "@/lib/manager/contract";

import { Button, Spinner } from "./ui/button";
import { Badge, ErrorNotice } from "./ui/primitives";

const TONE = { queued: "neutral", running: "info", succeeded: "success", failed: "danger" } as const;

export function OperationProgress({ operationId, canRetry }: Readonly<{ operationId: string; canRetry: boolean }>) {
  const { data: op, error, isPending, refetch } = useOperation(operationId);
  const qc = useQueryClient();
  const retry = useMutation({
    mutationFn: () => api.retryOperation(operationId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.operation(operationId) }),
  });

  if (isPending) return <div className="h-10 animate-pulse rounded bg-surface-muted" aria-busy="true" />;
  if (error) return <ErrorNotice error={error as ConsoleError} onRetry={() => void refetch()} />;
  return <OperationView op={op} canRetry={canRetry} onRetry={() => retry.mutate()} retrying={retry.isPending} retryError={retry.error as ConsoleError | null} />;
}

export function OperationView({ op, canRetry, onRetry, retrying, retryError }: Readonly<{
  op: Operation; canRetry: boolean; onRetry?: () => void; retrying?: boolean; retryError?: ConsoleError | null;
}>) {
  const active = isOperationActive(op.state);
  const failed = !active && op.state !== "succeeded";
  const tone = (TONE as Record<string, "neutral" | "info" | "success" | "danger">)[op.state] ?? "danger";
  const copy = describeError(op.error_code, "The operation did not complete.");
  return (
    <div>
      <div className="flex items-center gap-3">
        {active ? <Spinner className="h-5 w-5 text-info" /> : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{op.kind.replace(/[._]/g, " ")}</p>
          <p className="text-xs text-muted">
            {active ? (op.current_step ? `Step: ${op.current_step.replace(/_/g, " ")}` : "Waiting to start") : failed ? "Did not complete" : "Completed"}
            {op.attempt_count > 1 ? ` · attempt ${op.attempt_count}` : ""}
          </p>
        </div>
        <Badge tone={tone}>{op.state}</Badge>
      </div>
      {failed ? (
        <div role="alert" className="mt-4 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
          <p className="font-medium">{op.current_step ? `Failed at “${op.current_step.replace(/_/g, " ")}”` : "Failed"}</p>
          <p className="mt-0.5">{copy.message}</p>
          {copy.recovery ? <p className="mt-1 opacity-90">{copy.recovery}</p> : <p className="mt-1 opacity-90">Retry, and if it keeps failing contact your platform operator with the operation ID.</p>}
          <p className="mt-2 font-mono text-xs opacity-80">Operation ID: {op.id}{op.error_code ? ` · ${op.error_code}` : ""}</p>
          {canRetry && onRetry ? <div className="mt-3"><Button variant="primary" loading={retrying} onClick={onRetry}>Retry operation</Button></div> : null}
          {retryError ? <div className="mt-3"><ErrorNotice error={retryError} /></div> : null}
        </div>
      ) : null}
    </div>
  );
}
