// TenantCreateWizard: repository URL + name + fleet → review → create.
// Manager has no accessible-repositories list yet, so the user enters the
// canonical GitHub URL (validated client-side with the same rule Manager uses;
// Manager re-checks it against the org's GitHub connection). Creation is
// asynchronous (202 + operation): we send the user to the tenant page, which
// shows provisioning progress. One idempotency key per attempt is reused on
// retry so a double-submit cannot create two tenants. A side panel explains
// what creating a tenant does. Text follows the active language.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { api, ConsoleError } from "@/lib/client/api";
import { useConnections, useRepositories } from "@/lib/client/queries";
import { canOperate, slugify, validateRepositoryUrl } from "@/lib/manager/contract";
import { useT } from "@/lib/preferences/client";

import { useConsole } from "./shell/console-context";
import { Button, LinkButton } from "./ui/button";
import { IconCheck, IconGithub, IconSparkles } from "./ui/icons";
import { Card, CardHeader, EmptyState, ErrorNotice, inputClass, Skeleton } from "./ui/primitives";

export function TenantCreateWizard() {
  const { org, orgId, role } = useConsole();
  const router = useRouter();
  const { t } = useT();
  const w = t.wizard;
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
    return <Card><EmptyState title={w.notForRole} description={w.notForRoleBody} action={<LinkButton href={`/o/${org.slug}/tenants`}>{t.tenant.backToTenants}</LinkButton>} /></Card>;
  }
  if (conns.isPending) return <Card><div className="space-y-3 p-5" aria-busy="true"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-10" /></div></Card>;
  const connected = conns.data?.items.some((c) => c.status === "active");
  if (!connected) {
    return <Card><EmptyState icon={<IconGithub size={18} />} title={w.connectFirst} description={w.connectFirstBody} action={<LinkButton href={`/o/${org.slug}/github`} variant="primary">{w.goGithub}</LinkButton>} /></Card>;
  }

  const urlError = touched && validateRepositoryUrl(url) ? t.validation.repositoryUrl : null;
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
    <div className="min-w-0 space-y-4">
      <ol className="flex animate-enter items-center gap-2 text-sm" aria-label={w.progress}>
        {[w.stepRepo, w.stepReview].map((label, i) => {
          const n = (i + 1) as 1 | 2;
          const done = step > n;
          return (
            <li key={label} aria-current={step === n ? "step" : undefined} className="flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${done ? "bg-accent text-on-primary" : step === n ? "bg-foreground text-canvas" : "border border-border-strong text-subtle"}`}>{done ? <IconCheck size={12} strokeWidth={2.5} /> : n}</span>
              <span className={step === n ? "font-medium" : "text-muted"}>{label}</span>
              {n === 1 ? <span aria-hidden className="mx-1 h-px w-8 bg-border-strong" /> : null}
            </li>
          );
        })}
      </ol>
      {step === 1 ? (
        <Card>
          <CardHeader title={w.chooseRepo} description={w.chooseRepoBody} icon={<IconGithub size={15} />} />
          <div className="space-y-4 p-5">
            {picker && picker.length > 0 ? (
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">{w.accessible}</legend>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {picker.map((r) => (
                    <li key={String(r.id)}>
                      <label className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-hover has-[:checked]:bg-accent-soft">
                        <input type="radio" name="repo" checked={url === `https://github.com/${r.full_name}`} onChange={() => { setUrl(`https://github.com/${r.full_name}`); setTouched(true); key.current = null; }} className="accent-[var(--accent)]" />
                        <span className="flex-1 font-mono text-sm">{r.full_name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                {urlError ? <p className="mt-1.5 text-xs text-danger">{urlError}</p> : null}
              </fieldset>
            ) : (
            <div>
              <label htmlFor="repo-url" className="mb-1.5 block text-sm font-medium">{w.repoUrl}</label>
              <input id="repo-url" value={url} onChange={(e) => { setUrl(e.target.value); key.current = null; }} onBlur={() => setTouched(true)} placeholder="https://github.com/owner/repo" aria-invalid={!!urlError} className={`${inputClass} font-mono`} />
              {urlError ? <p className="mt-1.5 text-xs text-danger">{urlError}</p> : null}
            </div>
            )}
            <div className="flex flex-wrap gap-4">
              <div className="min-w-48 flex-1">
                <label htmlFor="tenant-name" className="mb-1.5 block text-sm font-medium">{w.name}</label>
                <input id="tenant-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={finalName || "backend"} className={inputClass} />
                <p className="mt-1.5 text-xs text-muted">{w.nameHint}</p>
              </div>
              <div>
                <label htmlFor="fleet" className="mb-1.5 block text-sm font-medium">{w.fleet}</label>
                <input id="fleet" type="number" min={1} max={10} value={fleet} onChange={(e) => setFleet(Math.max(1, Number(e.target.value) || 1))} className={`${inputClass} w-24`} />
                <p className="mt-1.5 text-xs text-muted">{w.fleetHint}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 border-t border-border px-5 py-4">
            <Button variant="primary" onClick={() => { setTouched(true); if (!validateRepositoryUrl(url) && finalName) setStep(2); }}>{t.common.continue}</Button>
            <Link href={`/o/${org.slug}/tenants`} className="text-sm text-muted hover:text-foreground">{t.common.cancel}</Link>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader title={w.review} description={w.reviewBody} />
          <dl className="divide-y divide-border text-sm">
            <div className="flex justify-between px-5 py-3"><dt className="text-muted">{w.repository}</dt><dd className="font-mono">{url.trim()}</dd></div>
            <div className="flex justify-between px-5 py-3"><dt className="text-muted">{w.name}</dt><dd>{finalName}</dd></div>
            <div className="flex justify-between px-5 py-3"><dt className="text-muted">{w.fleet}</dt><dd>{fleet}</dd></div>
          </dl>
          <div className="space-y-3 border-t border-border px-5 py-4">
            {error?.code === "RESOURCE_NOT_FOUND" ? (
              <div role="alert" className="space-y-3 rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm">
                <p className="font-medium">{w.cannotSee}</p>
                <p className="text-muted">{w.cannotSeeBody}</p>
                <Button variant="secondary" loading={syncing} onClick={() => void syncRepositories()}>{w.sync}</Button>
              </div>
            ) : error ? <ErrorNotice error={error} /> : null}
            {synced ? <p role="status" className="text-sm text-success">{w.synced}</p> : null}
            <div className="flex items-center gap-3">
              <Button variant="primary" loading={pending} onClick={() => void create()}>{w.create}</Button>
              <Button variant="ghost" disabled={pending} onClick={() => setStep(1)}>{t.common.back}</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
      <aside className="h-fit animate-enter rounded-xl border border-border bg-surface p-5 shadow-sm shadow-shadow">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent"><IconSparkles size={16} /></span>
        <h2 className="mt-3 text-sm font-semibold">{w.whatHappens}</h2>
        <ol className="mt-3 space-y-3">
          {[w.whatHappens1, w.whatHappens2, w.whatHappens3].map((s, i) => (
            <li key={s} className="flex gap-3 text-[13px] leading-relaxed text-muted">
              <span aria-hidden className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border-strong text-[11px] font-semibold text-foreground">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
