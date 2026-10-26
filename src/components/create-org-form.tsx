// CreateOrgForm: name → slug, with inline validation. Manager creates the
// organisation asynchronously (202 + operation) but the organisation and the
// creator's admin membership exist immediately (status "provisioning"), so we
// go straight into it; the shell shows a provisioning banner until Manager
// finishes. Waiting on the operation here would block the user whenever
// provisioning is slow. One idempotency key per attempt is reused on retry so
// a double-submit cannot create two organisations.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { api, ConsoleError } from "@/lib/client/api";
import { slugify, validateOrgName } from "@/lib/manager/contract";

import { Button } from "./ui/button";
import { ErrorNotice } from "./ui/primitives";

export function CreateOrgForm({ hasOrgs }: Readonly<{ hasOrgs: boolean }>) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ConsoleError | null>(null);
  const key = useRef<string | null>(null);
  const invalid = touched ? validateOrgName(name) : null;
  const slug = slugify(name);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (validateOrgName(name)) return;
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
        <label htmlFor="org-name" className="mb-1.5 block text-sm font-medium">Organisation name</label>
        <input
          id="org-name"
          value={name}
          onChange={(e) => { setName(e.target.value); key.current = null; }}
          onBlur={() => setTouched(true)}
          autoComplete="organization"
          aria-invalid={!!invalid}
          aria-describedby="org-name-hint"
          placeholder="Acme Engineering"
          disabled={working}
          className="h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm placeholder:text-subtle aria-[invalid=true]:border-danger"
        />
        <p id="org-name-hint" className={`mt-1.5 text-xs ${invalid ? "text-danger" : "text-muted"}`}>
          {invalid ?? (slug ? <>Your URL: <span className="font-mono">/o/{slug}</span></> : "2–60 characters.")}
        </p>
      </div>
      {error ? <ErrorNotice error={error} /> : null}
      {working ? <p role="status" className="text-sm text-muted">Setting up your organisation…</p> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" loading={working}>Create organisation</Button>
        {hasOrgs ? <Link href="/" className="text-sm text-muted hover:text-foreground">Cancel</Link> : null}
      </div>
    </form>
  );
}
