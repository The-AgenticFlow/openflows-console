// InvitationUnavailable: the page for an invitation link that cannot be used
// (incomplete link, or Manager answered 404). Explains the possible reasons and
// what to do, and offers to leave or switch GitHub account. Client component
// only for the sign-out action and language-aware labels.
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/lib/client/api";
import { useT } from "@/lib/preferences/client";

import { Button, LinkButton } from "./ui/button";
import { IconAlert, IconLogOut } from "./ui/icons";
import { Logo } from "./ui/logo";

export function InvitationUnavailable({ title, body, reasons, action, user }: Readonly<{ title: string; body: string; reasons?: string[]; action?: string; user?: string }>) {
  const { t } = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function switchAccount() {
    setBusy(true);
    try { await api.signOut(); } catch { /* session may already be gone */ } finally { router.push("/login"); router.refresh(); }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="relative w-full max-w-md animate-enter">
        <Logo size={40} className="mb-6 rounded-xl" />
        <div className="rounded-2xl border border-border bg-surface p-7 shadow-2xl shadow-shadow">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-soft text-warning"><IconAlert size={18} /></span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
          {reasons?.length ? (
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {reasons.map((r) => <li key={r} className="flex gap-2.5"><span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-subtle" />{r}</li>)}
            </ul>
          ) : null}
          {action ? <p className="mt-4 rounded-lg bg-surface-muted px-3.5 py-3 text-sm leading-relaxed">{action}</p> : null}
          {user ? <p className="mt-4 text-xs text-muted">{t.invitation.signedInAs} <span className="font-medium text-foreground">{user}</span></p> : null}
          <div className="mt-6 flex flex-wrap gap-2">
            <LinkButton href="/" variant="primary">{t.invitation.goHome}</LinkButton>
            {user ? <Button loading={busy} onClick={() => void switchAccount()}><IconLogOut size={14} /> {t.invitation.switchAccount}</Button> : null}
          </div>
        </div>
      </div>
    </main>
  );
}
