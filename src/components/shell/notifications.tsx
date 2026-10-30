// NotificationBell: the top-bar bell with an unread badge and a dropdown of
// alerts for the active organisation. Manager has no notification feed, so
// every alert is derived from real state the Console already reads (and that
// TanStack Query shares with the pages, so no extra requests): organisation
// setup, failed or long-provisioning tenants, the GitHub connection, pending
// or expired invitations (admins), and an unlinked Coder account (operators).
// An alert disappears on its own once its cause is fixed. "Read" is a
// per-browser convenience: the ids seen are kept in localStorage
// (`of_notifications_seen`), and the page works without it.
"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { type ComponentType, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { api } from "@/lib/client/api";
import { useCoderIdentity, useConnections, useInvitations, useTenants } from "@/lib/client/queries";
import { canAdminister, canOperate, tenantStateLabel } from "@/lib/manager/contract";
import { useT } from "@/lib/preferences/client";

import { IconAlert, IconBell, IconBoxes, IconCheck, IconGithub, IconInfo, IconMail, IconTerminal } from "../ui/icons";
import { useConsole } from "./console-context";

type Severity = "danger" | "warning" | "info";
interface Alert { id: string; severity: Severity; title: string; body: string; href: string; icon: ComponentType<{ size?: number; className?: string }> }

const SEEN_KEY = "of_notifications_seen";
const SEEN_EVENT = "of:notifications";
const FAILED = ["failed", "retryable_failed", "cancelled"];

function readSeen(): string {
  try { return localStorage.getItem(SEEN_KEY) ?? "[]"; } catch { return "[]"; }
}
function subscribeSeen(cb: () => void) {
  window.addEventListener(SEEN_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(SEEN_EVENT, cb); window.removeEventListener("storage", cb); };
}

const TONE: Record<Severity, string> = {
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
};

function useAlerts(): Alert[] {
  const { org, orgId, role } = useConsole();
  const { t } = useT();
  const n = t.notifications;
  const admin = canAdminister(role);
  const pending = org.status !== "active" && org.status !== "ready";
  const info = useQuery({ queryKey: ["org", orgId, "info"], queryFn: () => api.getOrganization(orgId), enabled: pending, retry: false });
  const tenants = useTenants(orgId);
  const conns = useConnections(orgId);
  const invitations = useInvitations(orgId, admin);
  const coder = useCoderIdentity();
  const base = `/o/${org.slug}`;

  return useMemo(() => {
    const out: Alert[] = [];
    if (pending) {
      const failed = info.data?.provisioning && FAILED.includes(info.data.provisioning.state);
      out.push(failed
        ? { id: `setup-failed:${info.data?.provisioning?.operation_id}`, severity: "danger", title: n.setupFailed, body: n.setupFailedBody, href: base, icon: IconAlert }
        : { id: `setup:${orgId}`, severity: "info", title: n.settingUp, body: n.settingUpBody, href: base, icon: IconInfo });
    }
    for (const x of tenants.data?.items ?? []) {
      const key = tenantStateLabel(x).key;
      if (key === "failed") out.push({ id: `tenant-failed:${x.id}`, severity: "danger", title: n.tenantFailed(x.slug), body: n.tenantFailedBody, href: `${base}/tenants/${x.id}`, icon: IconBoxes });
      if (key === "provisioning") out.push({ id: `tenant-prov:${x.id}`, severity: "info", title: n.tenantProvisioning(x.slug), body: n.tenantProvisioningBody, href: `${base}/tenants/${x.id}`, icon: IconBoxes });
    }
    if (admin && conns.data) {
      const live = conns.data.items.filter((c) => c.status !== "disconnected");
      if (live.length === 0) out.push({ id: `github-missing:${orgId}`, severity: "warning", title: n.githubMissing, body: n.githubMissingBody, href: `${base}/github`, icon: IconGithub });
      else if (!live.some((c) => c.status === "active")) out.push({ id: `github-issue:${live.map((c) => c.status).join()}`, severity: "warning", title: n.githubIssue, body: n.githubIssueBody, href: `${base}/github`, icon: IconGithub });
    }
    if (admin && invitations.data) {
      const expired = invitations.data.items.filter((i) => i.status === "expired").length;
      const waiting = invitations.data.items.length - expired;
      if (expired) out.push({ id: `invites-expired:${expired}`, severity: "warning", title: n.invitesExpired(expired), body: n.invitesExpiredBody, href: `${base}/members`, icon: IconMail });
      if (waiting) out.push({ id: `invites-pending:${waiting}`, severity: "info", title: n.invitesPending(waiting), body: n.invitesPendingBody, href: `${base}/members`, icon: IconMail });
    }
    if (canOperate(role) && coder.data?.configured && !coder.data.account) {
      out.push({ id: "coder-unlinked", severity: "warning", title: n.coderMissing, body: n.coderMissingBody, href: `${base}/account`, icon: IconTerminal });
    }
    const rank: Record<Severity, number> = { danger: 0, warning: 1, info: 2 };
    return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
  }, [pending, info.data, tenants.data, conns.data, invitations.data, coder.data, admin, role, orgId, base, n]);
}

export function NotificationBell() {
  const { t } = useT();
  const alerts = useAlerts();
  const seenRaw = useSyncExternalStore(subscribeSeen, readSeen, () => "[]");
  const seen = useMemo(() => new Set<string>(JSON.parse(seenRaw) as string[]), [seenRaw]);
  const unread = alerts.filter((a) => !seen.has(a.id));
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function markAllRead() {
    // Keep only ids that still exist, so the stored list never grows unbounded.
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(alerts.map((a) => a.id))); } catch { /* storage blocked: not remembered */ }
    window.dispatchEvent(new Event(SEEN_EVENT));
  }

  return (
    <div className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${t.notifications.label}${unread.length ? ` (${t.notifications.unread(unread.length)})` : ""}`}
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
      >
        <IconBell size={17} />
        {unread.length ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 animate-pop items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white ring-2 ring-canvas">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        ) : null}
      </button>
      {open ? (
        <div ref={panel} role="dialog" aria-label={t.notifications.title} className="absolute right-0 top-full z-30 mt-2 w-[min(24rem,calc(100vw-2rem))] origin-top-right animate-pop overflow-hidden rounded-xl border border-border-strong bg-surface-raised shadow-2xl shadow-shadow">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold">{t.notifications.title}</p>
              {unread.length ? <p className="text-xs text-muted">{t.notifications.unread(unread.length)}</p> : null}
            </div>
            {unread.length ? (
              <button type="button" onClick={markAllRead} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-hover hover:text-foreground">
                <IconCheck size={12} /> {t.notifications.markRead}
              </button>
            ) : null}
          </div>
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-soft text-success"><IconCheck size={18} /></span>
              <p className="mt-3 text-sm font-medium">{t.notifications.empty}</p>
              <p className="mt-1 text-xs text-muted">{t.notifications.emptyBody}</p>
            </div>
          ) : (
            <ul className="max-h-[22rem] divide-y divide-border overflow-y-auto">
              {alerts.map((a) => {
                const Icon = a.icon;
                const isNew = !seen.has(a.id);
                return (
                  <li key={a.id}>
                    <Link href={a.href} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 transition-colors hover:bg-hover">
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE[a.severity]}`}><Icon size={15} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <span className="truncate">{a.title}</span>
                          {isNew ? <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" /> : null}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{a.body}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
