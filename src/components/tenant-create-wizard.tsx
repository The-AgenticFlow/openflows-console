// TenantCreateWizard: repository URL + name + fleet → review → create.
// Manager has no accessible-repositories list yet, so the user enters the
// canonical GitHub URL (validated client-side with the same rule Manager uses;
// Manager re-checks it against the org's GitHub connection). Creation is
// asynchronous (202 + operation): we send the user to the tenant page, which
// shows provisioning progress. One idempotency key per attempt is reused on
// retry so a double-submit cannot create two tenants.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { api, ConsoleError } from "@/lib/client/api";
import { useConnections, useRepositories } from "@/lib/client/queries";
import { canOperate, slugify, validateRepositoryUrl } from "@/lib/manager/contract";

import { useConsole } from "./shell/console-context";
import { Button, LinkButton } from "./ui/button";
import { Card, CardHeader, EmptyState, ErrorNotice } from "./ui/primitives";

export function TenantCreateWizard() {
  const { org, orgId, role } = useConsole();
  const router = useRouter();
  const conns = useConnections(orgId);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [fleet, setFleet] = useState(1);
  const [step, setStep] = useState<1 | 2>(1);
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ConsoleError | null>(null);
  const key = useRef<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const activeId = conns.data?.items.find((c) => c.status === "active")?.id;
  const repos = useRepositories(orgId, activeId);
  const picker = repos.data?.items ?? null; // null until Manager lists repositories

  if (!canOperate(role)) {
    return <Card><EmptyState title="Not available for your role" description="Ask an organisation admin or developer to create tenants." action={<LinkButton href={`/o/${org.slug}/tenants`}>Back to tenants</LinkButton>} /></Card>;
  }
  if (conns.isPending) return <Card><div className="h-24 animate-pulse p-5" aria-busy="true" /></Card>;
  const connected = conns.data?.items.some((c) => c.status === "active");
  if (!connected) {
    return <Card><EmptyState title="Connect GitHub first" description="Tenants run against a repository you authorise through the OpenFlows GitHub App." action={<LinkButton href={`/o/${org.slug}/github`} variant="primary">Go to GitHub</LinkButton>} /></Card>;
  }

  const urlError = touched ? validateRepositoryUrl(url) : null;
  const finalName = name.trim() || slugify(url.split("/").slice(-1)[0]?.replace(/\.git$/, "") ?? "");

  // Manager only knows repositories it has synced from GitHub (webhooks or
  // reconcile). When it cannot find this one, offer a manual sync, then retry.
  async function syncRepositories() {
    if (!activeId) return;
    setSyncing(true);
    try {
      await api.reconcileConnection(orgId, activeId);
      setSynced(true);
      setError(null);
    } catch (e) {
      setError(e instanceof ConsoleError ? e : null);
    } finally {
      setSyncing(false);
    }
  }

  async function create() {
    setPending(true);
    setError(null);
    key.current ??= crypto.randomUUID();
    try {
      const accepted = await api.createTenant(orgId, { repository_url: url.trim(), name: finalName, fleet }, key.current);
      router.push(`/o/${org.slug}/tenants/${accepted.tenant_id ?? accepted.resource_id ?? ""}`);
    } catch (e) {
      if (e instanceof ConsoleError && !e.retryable) key.current = null;
      setError(e instanceof ConsoleError ? e : null);
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <ol className="flex items-center gap-3 text-sm" aria-label="Progress">
        <li aria-current={step === 1 ? "step" : undefined} className={step === 1 ? "font-semibold" : "text-muted"}>1. Repository</li>
        <li aria-hidden className="text-subtle">/</li>
        <li aria-current={step === 2 ? "step" : undefined} className={step === 2 ? "font-semibold" : "text-muted"}>2. Review</li>
      </ol>
      {step === 1 ? (
        <Card>
          <CardHeader title="Choose a repository" description="Enter a repository the OpenFlows GitHub App can access." />
          <div className="space-y-4 p-5">
            {picker && picker.length > 0 ? (
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">Accessible repositories</legend>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {picker.map((r) => (
                    <li key={String(r.id)}>
                      <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-surface-muted/60">
                        <input type="radio" name="repo" checked={url === `https://github.com/${r.full_name}`} onChange={() => { setUrl(`https://github.com/${r.full_name}`); setTouched(true); key.current = null; }} className="accent-[var(--accent)]" />
                        <span className="flex-1 font-mono text-sm">{r.full_name}</span>
                        <span className="text-xs text-muted">{r.private ? "Private" : "Public"}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                {urlError ? <p className="mt-1.5 text-xs text-danger">{urlError}</p> : null}
              </fieldset>
            ) : (
            <div>
              <label htmlFor="repo-url" className="mb-1.5 block text-sm font-medium">Repository URL</label>
              <input id="repo-url" value={url} onChange={(e) => { setUrl(e.target.value); key.current = null; }} onBlur={() => setTouched(true)} placeholder="https://github.com/owner/repo" aria-invalid={!!urlError} className="h-10 w-full rounded-lg border border-border-strong bg-surface px-3 font-mono text-sm aria-[invalid=true]:border-danger" />
              {urlError ? <p className="mt-1.5 text-xs text-danger">{urlError}</p> : null}
            </div>
            )}
            <div className="flex flex-wrap gap-4">
              <div className="min-w-48 flex-1">
                <label htmlFor="tenant-name" className="mb-1.5 block text-sm font-medium">Tenant name</label>
                <input id="tenant-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={finalName || "backend"} className="h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm" />
              </div>
              <div>
                <label htmlFor="fleet" className="mb-1.5 block text-sm font-medium">Fleet size</label>
                <input id="fleet" type="number" min={1} max={10} value={fleet} onChange={(e) => setFleet(Math.max(1, Number(e.target.value) || 1))} className="h-10 w-24 rounded-lg border border-border-strong bg-surface px-3 text-sm" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 border-t border-border px-5 py-4">
            <Button variant="primary" onClick={() => { setTouched(true); if (!validateRepositoryUrl(url) && finalName) setStep(2); }}>Continue</Button>
            <Link href={`/o/${org.slug}/tenants`} className="text-sm text-muted hover:text-foreground">Cancel</Link>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Review and create" description="OpenFlows will provision a runtime for this repository." />
          <dl className="divide-y divide-border text-sm">
            <div className="flex justify-between px-5 py-3"><dt className="text-muted">Repository</dt><dd className="font-mono">{url.trim()}</dd></div>
            <div className="flex justify-between px-5 py-3"><dt className="text-muted">Name</dt><dd>{finalName}</dd></div>
            <div className="flex justify-between px-5 py-3"><dt className="text-muted">Fleet size</dt><dd>{fleet}</dd></div>
          </dl>
          <div className="space-y-3 border-t border-border px-5 py-4">
            {error?.code === "RESOURCE_NOT_FOUND" ? (
              <div role="alert" className="space-y-3 rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm">
                <p className="font-medium">OpenFlows cannot see this repository yet.</p>
                <p className="text-muted">
                  Check the address is correct and that the GitHub App is installed on that repository. If you just installed or changed access, sync the repository list and try again.
                </p>
                <Button variant="secondary" loading={syncing} onClick={() => void syncRepositories()}>Sync repositories</Button>
              </div>
            ) : error ? <ErrorNotice error={error} /> : null}
            {synced ? <p role="status" className="text-sm text-success">Repositories synced. Try creating the tenant again.</p> : null}
            <div className="flex items-center gap-3">
              <Button variant="primary" loading={pending} onClick={() => void create()}>Create tenant</Button>
              <Button variant="ghost" disabled={pending} onClick={() => setStep(1)}>Back</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
