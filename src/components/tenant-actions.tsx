"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  normalizeTenantActionInput,
  TenantAddValidationError,
} from "@/lib/domain/tenant-add";

type TenantAction = "clean" | "remove";

interface TenantActionResponse {
  ok: boolean;
  message: string;
  command?: string;
  args?: string[];
  stdout?: string;
  stderr?: string;
  guidance?: string[];
}

export function TenantActions({ tenant }: Readonly<{ tenant: string }>) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<TenantAction | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [result, setResult] = useState<TenantActionResponse | null>(null);

  const mutation = useMutation({
    mutationFn: submitTenantAction,
    onSuccess: (response) => {
      setResult(response);
      if (response.ok) {
        setAction(null);
        setConfirmation("");
        queryClient.invalidateQueries({ queryKey: ["fleet", "tenants"] });
      }
    },
  });

  function openConfirmation(nextAction: TenantAction) {
    setAction(nextAction);
    setConfirmation("");
    setClientError(null);
    setResult(null);
  }

  function closeConfirmation() {
    if (mutation.isPending) return;
    setAction(null);
    setConfirmation("");
    setClientError(null);
  }

  function runAction() {
    if (!action) return;
    setClientError(null);
    setResult(null);

    if (confirmation !== tenant) {
      setClientError(`Type ${tenant} to confirm.`);
      return;
    }

    try {
      const input = normalizeTenantActionInput({ tenant });
      mutation.mutate({ action, tenant: input.tenant });
    } catch (err) {
      setClientError(
        err instanceof TenantAddValidationError
          ? err.message
          : "Check the tenant name, then try again.",
      );
    }
  }

  const transcript = [result?.stdout, result?.stderr].filter(Boolean).join("\n");

  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => openConfirmation("clean")}
          className="rounded-md border border-warning/60 px-3 py-1.5 text-sm font-medium text-warning transition-colors hover:bg-warning/10"
        >
          Clean
        </button>
        <button
          type="button"
          onClick={() => openConfirmation("remove")}
          className="rounded-md border border-danger/60 px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
        >
          Remove
        </button>
      </div>

      {action ? (
        <div className="mt-4 rounded-md border border-border bg-background p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {action === "clean" ? "Clean tenant" : "Remove tenant"}
              </h3>
              <p className="mt-1 text-sm text-muted">
                {action === "clean"
                  ? "Resets stale tickets, recovery counters, and worker slots."
                  : "Purges only this tenant's Redis keyspace. Coder cleanup remains manual."}
              </p>
            </div>
            {mutation.isPending ? (
              <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-medium text-warning">
                CLI running
              </span>
            ) : null}
          </div>

          <label className="mt-4 grid gap-1 text-sm">
            <span className="font-medium text-foreground">Confirm tenant</span>
            <input
              type="text"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={tenant}
              autoComplete="off"
              disabled={mutation.isPending}
              className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-foreground placeholder:text-muted"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runAction}
              disabled={mutation.isPending}
              className={
                action === "remove"
                  ? "rounded-md bg-danger px-3 py-1.5 text-sm font-semibold text-background transition-colors disabled:cursor-not-allowed disabled:bg-disabled"
                  : "rounded-md bg-warning px-3 py-1.5 text-sm font-semibold text-background transition-colors disabled:cursor-not-allowed disabled:bg-disabled"
              }
            >
              {mutation.isPending
                ? "Running..."
                : action === "clean"
                  ? "Clean tenant"
                  : "Remove tenant"}
            </button>
            <button
              type="button"
              onClick={closeConfirmation}
              disabled={mutation.isPending}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-disabled"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {clientError ? (
        <div className="mt-3 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {clientError}
        </div>
      ) : null}

      {mutation.isError ? (
        <div className="mt-3 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          Could not reach the tenant action API. Check the Console server and retry.
        </div>
      ) : null}

      {result ? (
        <div
          className={
            result.ok
              ? "mt-3 rounded-md border border-success/40 bg-success/10 p-3"
              : "mt-3 rounded-md border border-danger/40 bg-danger/10 p-3"
          }
        >
          <p
            className={
              result.ok
                ? "text-sm font-medium text-success"
                : "text-sm font-medium text-danger"
            }
          >
            {result.message}
          </p>
          {result.command && result.args ? (
            <p className="mt-2 font-mono text-xs text-muted">
              {result.command} {result.args.join(" ")}
            </p>
          ) : null}
          {result.guidance?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
              {result.guidance.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {transcript ? (
            <pre className="mt-3 max-h-56 overflow-auto rounded-md border border-border bg-background p-3 text-xs text-foreground">
              {transcript}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

async function submitTenantAction(input: {
  action: TenantAction;
  tenant: string;
}): Promise<TenantActionResponse> {
  const res = await fetch("/api/tenants/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return res.json();
}
