// CreateOrgForm: name → slug, with inline validation. Manager creates the
// organisation asynchronously (202 + operation) but the organisation and the
// creator's admin membership exist immediately (status "provisioning"), so we
// go straight into it; the shell shows a provisioning banner until Manager
// finishes. Waiting on the operation here would block the user whenever
// provisioning is slow. One idempotency key per attempt is reused on retry so
// a double-submit cannot create two organisations. Text follows the active
// language.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { api, ConsoleError } from "@/lib/client/api";
import { slugify } from "@/lib/manager/contract";
import { useT } from "@/lib/preferences/client";

import { Button } from "./ui/button";
import { ErrorNotice } from "./ui/primitives";

function nameProblem(name: string): "orgNameShort" | "orgNameLong" | "orgNameChars" | null {
  const v = name.trim();
  if (v.length < 2) return "orgNameShort";
  if (v.length > 60) return "orgNameLong";
  if (!slugify(v)) return "orgNameChars";
  return null;
}

export function CreateOrgForm({ hasOrgs }: Readonly<{ hasOrgs: boolean }>) {
  const router = useRouter();
  const { t } = useT();
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ConsoleError | null>(null);
  const key = useRef<string | null>(null);
  const problem = touched ? nameProblem(name) : null;
  const invalid = problem ? t.validation[problem] : null;
  const slug = slugify(name);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (nameProblem(name)) return;
    setPending(true);
    setError(null);
    key.current ??= crypto.randomUUID();
    try {
      await api.createOrganization(slug, name.trim(), key.current);
      router.push(`/o/${slug}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ConsoleError && !err.retryable) key.current = null;
      setError(err instanceof ConsoleError ? err : null);
      setPending(false);
    }
  }

  const working = pending && !error;

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <label htmlFor="org-name" className="mb-1.5 block text-sm font-medium">{t.onboarding.orgName}</label>
        <input
          id="org-name"
          value={name}
          onChange={(e) => { setName(e.target.value); key.current = null; }}
          onBlur={() => setTouched(true)}
          autoComplete="organization"
          aria-invalid={!!invalid}
          aria-describedby="org-name-hint"
          placeholder={t.onboarding.orgNamePlaceholder}
          disabled={working}
          className="h-10 w-full rounded-lg border border-border-strong bg-canvas/60 px-3 text-sm transition-[border-color,box-shadow] duration-150 placeholder:text-subtle hover:border-subtle/60 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15 aria-[invalid=true]:border-danger"
        />
        <p id="org-name-hint" className={`mt-1.5 text-xs ${invalid ? "text-danger" : "text-muted"}`}>
          {invalid ?? (slug ? <>{t.onboarding.yourUrl} <span className="font-mono">/o/{slug}</span></> : t.onboarding.nameHint)}
        </p>
      </div>
      {error ? <ErrorNotice error={error} /> : null}
      {working ? <p role="status" className="text-sm text-muted">{t.onboarding.settingUp}</p> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" loading={working}>{t.onboarding.createOrg}</Button>
        {hasOrgs ? <Link href="/" className="text-sm text-muted hover:text-foreground">{t.common.cancel}</Link> : null}
      </div>
    </form>
  );
}
