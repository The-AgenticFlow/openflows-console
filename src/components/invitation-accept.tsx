// InvitationAccept: the acceptance card for a usable invitation: the
// organisation, the role being granted (with what it allows), who invited the
// person, when it expires, and a single Accept action. On success it shows a
// short welcome and goes straight to the organisation. Errors from Manager
// (rate limit, conflict, ...) are shown in the card with their request id.
"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { api, type ConsoleError } from "@/lib/client/api";
import { relativeTime } from "@/lib/i18n";
import type { InvitationPreview } from "@/lib/manager/contract";
import { useT } from "@/lib/preferences/client";

import { Button, LinkButton } from "./ui/button";
import { IconCheck, IconLock } from "./ui/icons";
import { Logo } from "./ui/logo";
import { Avatar, Badge, ErrorNotice } from "./ui/primitives";
import { useToast } from "./ui/toast";

export function InvitationAccept({ token, preview, user }: Readonly<{ token: string; preview: InvitationPreview; user: string }>) {
  const { t, locale } = useT();
  const router = useRouter();
  const toast = useToast();
  const org = preview.organization;
  const accept = useMutation({ mutationFn: () => api.acceptInvitation(token) });

  // After a short welcome, continue into the organisation.
  useEffect(() => {
    if (!accept.isSuccess) return;
    toast.show({ kind: "success", title: t.invitation.welcome(org.display_name) });
    const id = window.setTimeout(() => { router.push(`/o/${org.slug}`); router.refresh(); }, 1600);
    return () => window.clearTimeout(id);
  }, [accept.isSuccess, org.display_name, org.slug, router, t, toast]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/[0.08] blur-3xl" />
      <div className="relative w-full max-w-md animate-enter">
        <Logo size={40} className="mb-6 rounded-xl" />
        <div className="rounded-2xl border border-border bg-surface p-7 shadow-2xl shadow-shadow">
          {accept.isSuccess ? (
            <div className="animate-pop text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-on-primary"><IconCheck size={22} strokeWidth={2.5} /></span>
              <h1 className="mt-4 text-xl font-semibold tracking-tight">{t.invitation.welcome(org.display_name)}</h1>
              <p className="mt-2 text-sm text-muted">{t.invitation.welcomeBody}</p>
              <div className="mt-5"><LinkButton href={`/o/${org.slug}`} variant="primary">{t.invitation.openOrg}</LinkButton></div>
            </div>
          ) : (
            <>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-accent">{t.invitation.eyebrow}</p>
              <div className="mt-3 flex items-center gap-3.5">
                <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-[#2f8f68] text-lg font-semibold text-white">{org.display_name.slice(0, 1).toUpperCase()}</span>
                <h1 className="text-xl font-semibold leading-tight tracking-tight">{t.invitation.title(org.display_name)}</h1>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{t.invitation.lede(preview.invited_by, org.display_name)}</p>

              <div className="mt-5 rounded-xl border border-border bg-surface-muted/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted">{t.invitation.yourRole}</span>
                  <Badge tone={preview.role === "admin" ? "info" : preview.role === "developer" ? "success" : "neutral"}>{t.roles[preview.role]}</Badge>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{t.roles[`${preview.role}Body`]}</p>
              </div>

              <div className="mt-4 flex items-center gap-2.5 text-xs text-muted">
                <Avatar name={user} size={22} />
                <span>{t.invitation.signedInAs} <span className="font-medium text-foreground">{user}</span></span>
                <span className="ml-auto">{t.invitation.expires(relativeTime(preview.expires_at, locale, t))}</span>
              </div>

              {accept.error ? <div className="mt-4"><ErrorNotice error={accept.error as ConsoleError} /></div> : null}

              <div className="mt-6 flex gap-2">
                <Button variant="primary" className="h-11 flex-1 text-[15px]" loading={accept.isPending} onClick={() => accept.mutate()}>
                  {accept.isPending ? t.invitation.accepting : t.invitation.accept}
                </Button>
                <LinkButton href="/">{t.invitation.decline}</LinkButton>
              </div>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-subtle"><IconLock size={12} /> {t.invitation.protectedNote}</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
