"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  normalizeTenantAddInput,
  TenantAddValidationError,
} from "@/lib/domain/tenant-add";

interface TenantAddResponse {
  ok: boolean;
  message: string;
  command?: string;
  args?: string[];
  stdout?: string;
  stderr?: string;
  guidance?: string[];
}

export function AddTenantForm() {
  const queryClient = useQueryClient();
  const [repo, setRepo] = useState("");
  const [name, setName] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [result, setResult] = useState<TenantAddResponse | null>(null);

  const mutation = useMutation({
    mutationFn: submitTenantAdd,
    onSuccess: (response) => {
      setResult(response);
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["fleet", "tenants"] });
      }
    },
  });

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClientError(null);
    setResult(null);

    try {
      const input = normalizeTenantAddInput({ repo, name });
      mutation.mutate(input);
    } catch (err) {
      setClientError(
        err instanceof TenantAddValidationError
          ? err.message
          : "Check the repository and tenant name, then try again.",
      );
    }
  }

  const transcript = [result?.stdout, result?.stderr].filter(Boolean).join("\n");

  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Add tenant</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Runs `openflows tenant add`, creates the tenant owner and nexus workspace,
            then shows the GitHub OAuth guidance from the CLI.
          </p>
        </div>
        {mutation.isPending ? (
          <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-medium text-warning">
            CLI running
          </span>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-foreground">Repository</span>
          <input
            type="text"
            value={repo}
            onChange={(event) => setRepo(event.target.value)}
            placeholder="owner/repo"
            autoComplete="off"
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted"
            disabled={mutation.isPending}
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-foreground">Tenant name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="optional"
            autoComplete="off"
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted"
            disabled={mutation.isPending}
          />
        </label>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="self-end rounded-md bg-primary px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-primary-strong disabled:cursor-not-allowed disabled:bg-disabled"
        >
          {mutation.isPending ? "Adding..." : "Add tenant"}
        </button>
      </form>

      {mutation.isPending ? (
        <div className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
          Creating the Coder tenant user and nexus workspace. If the CLI prompts for
          GitHub OAuth, complete the link in Coder and watch this panel for the
          transcript.
        </div>
      ) : null}

      {clientError ? (
        <div className="mt-4 rounded-md border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          {clientError}
        </div>
      ) : null}

      {mutation.isError ? (
        <div className="mt-4 rounded-md border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          Could not reach the add-tenant API. Check the Console server and retry.
        </div>
      ) : null}

      {result ? (
        <div
          className={
            result.ok
              ? "mt-4 rounded-md border border-success/40 bg-success/10 p-4"
              : "mt-4 rounded-md border border-danger/40 bg-danger/10 p-4"
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
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
              {result.guidance.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {transcript ? (
            <pre className="mt-4 max-h-80 overflow-auto rounded-md border border-border bg-background p-3 text-xs text-foreground">
              {transcript}
            </pre>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

async function submitTenantAdd(input: { repo: string; name?: string }): Promise<TenantAddResponse> {
  const res = await fetch("/api/tenants/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return res.json();
}
