// GithubConnection: the organisation's GitHub App connection(s) with status
// and recovery actions. Manager exposes connection metadata only (account,
// status, timestamps) and, per connection, its accessible repositories; never tokens. Connecting goes
// through Manager's two-leg flow (user authorisation + app installation), each
// a full-page redirect to GitHub. Admin-only controls (connect / reconcile /
// disconnect) are hidden from other roles, who still see the health summary.
// Text and dates follow the active language.
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { api, type ConsoleError } from "@/lib/client/api";
import { keys, useConnections, useRepositories } from "@/lib/client/queries";
import { relativeTime } from "@/lib/i18n";
import { canAdminister, type GithubConnection as Connection, isUnsupported } from "@/lib/manager/contract";
import { useT } from "@/lib/preferences/client";

import { rememberSetupUrl } from "./github-install-continue";
import { useConsole } from "./shell/console-context";
import { Button } from "./ui/button";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { IconGithub, IconLock, IconRefresh } from "./ui/icons";
import { Badge, Card, CardHeader, EmptyState, ErrorNotice, NotAvailable, Skeleton } from "./ui/primitives";

const TONE: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
  active: "success", pending: "info", verified: "info", suspended: "warning", disconnected: "danger",
};

export function GithubConnection({ justConnected }: Readonly<{ justConnected: boolean }>) {
  const { orgId, role } = useConsole();
  const { t, locale } = useT();
  const g = t.github;
  const admin = canAdminister(role);
  const qc = useQueryClient();
  const { data, error, isPending, refetch } = useConnections(orgId);
  const [redirecting, setRedirecting] = useState(false);
  const [confirm, setConfirm] = useState<Connection | null>(null);
  const refresh = () => void qc.invalidateQueries({ queryKey: keys.connections(orgId) });

  const connect = useMutation({
    mutationFn: () => api.startConnect(orgId),
    onSuccess: (r) => {
      const next = r.authorization_url ?? r.setup_url;
      if (!next) return;
      // Leg 2 (app installation) runs after leg 1 returns to the Console.
      if (r.authorization_url) rememberSetupUrl(r.setup_url);
      setRedirecting(true);
      window.location.assign(next); // full navigation to GitHub
    },
  });
  const reconcile = useMutation({ mutationFn: (id: string) => api.reconcileConnection(orgId, id), onSuccess: () => { refresh(); setTimeout(refresh, 4000); } });
  const disconnect = useMutation({ mutationFn: (id: string) => api.disconnectConnection(orgId, id), onSuccess: () => { refresh(); setConfirm(null); } });

  if (isPending) return <Card><div className="space-y-3 p-5" aria-busy="true"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-2/3" /></div></Card>;
  if (error) return <ErrorNotice error={error as ConsoleError} onRetry={() => void refetch()} />;

  const live = data.items.filter((c) => c.status !== "disconnected");
  const activeConn = live.find((c) => c.status === "active");
  const actionError = (connect.error ?? reconcile.error) as ConsoleError | null;

  return (
    <div className="space-y-6">
      {justConnected && live.some((c) => c.status === "active") ? (
        <p role="status" className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success">{g.connected}</p>
      ) : null}
      {actionError ? <ErrorNotice error={actionError} /> : null}
      {reconcile.isSuccess ? <p role="status" className="rounded-lg bg-info-soft px-4 py-3 text-sm text-info">{g.syncRequested}</p> : null}

      <Card>
        <CardHeader
          title={g.appTitle}
          description={g.appBody}
          icon={<IconGithub size={15} />}
          action={admin && live.length === 0 ? <Button variant="primary" loading={connect.isPending || redirecting} onClick={() => connect.mutate()}><IconGithub size={15} /> {g.connect}</Button> : undefined}
        />
        {live.length === 0 ? (
          <EmptyState icon={<IconGithub size={18} />} title={g.notConnected} description={admin ? g.notConnectedAdmin : g.notConnectedOther} />
        ) : (
          <ul className="divide-y divide-border">
            {live.map((c) => {
              const [label, guide] = g.status[c.status] ?? [c.status, ""];
              const tone = TONE[c.status] ?? "neutral";
              return (
                <li key={c.id} className="space-y-3 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-muted"><IconGithub size={18} /></span>
                      <div>
                        <p className="text-sm font-medium">{c.account_login ?? g.account}</p>
                        <p className="text-xs text-muted"><span className="capitalize">{c.account_type}</span>{c.connected_at ? ` · ${g.connectedSince(relativeTime(c.connected_at, locale, t))}` : ""}{c.last_reconciled_at ? ` · ${g.checked(relativeTime(c.last_reconciled_at, locale, t))}` : ""}</p>
                      </div>
                    </div>
                    <Badge dot tone={tone}>{label}</Badge>
                  </div>
                  <p className="text-sm text-muted">{guide}</p>
                  {admin ? (
                    <div className="flex flex-wrap gap-2">
                      {c.status !== "pending" && c.status !== "verified" ? <Button loading={reconcile.isPending && reconcile.variables === c.id} onClick={() => reconcile.mutate(c.id)}><IconRefresh size={14} /> {g.syncNow}</Button> : <Button variant="primary" loading={connect.isPending || redirecting} onClick={() => connect.mutate()}>{g.continueGithub}</Button>}
                      <Button variant="ghost" className="text-danger hover:text-danger" onClick={() => { disconnect.reset(); setConfirm(c); }}>{g.disconnect}</Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {!admin ? <p className="flex items-center gap-2 border-t border-border px-5 py-3 text-xs text-muted"><IconLock size={12} /> {g.adminsOnly}</p> : null}
      </Card>

      {activeConn ? <Repositories orgId={orgId} connectionId={activeConn.id} /> : null}

      <ConfirmDialog
        open={confirm !== null}
        title={g.disconnectTitle}
        description={g.disconnectBody}
        confirmLabel={g.disconnect}
        danger
        pending={disconnect.isPending}
        error={disconnect.error as ConsoleError | null}
        onClose={() => { setConfirm(null); disconnect.reset(); }}
        onConfirm={() => confirm && disconnect.mutate(confirm.id)}
      />
    </div>
  );
}

/** Accessible repositories for the active connection. */
function Repositories({ orgId, connectionId }: Readonly<{ orgId: string; connectionId: string }>) {
  const { t, locale } = useT();
  const g = t.github;
  const repos = useRepositories(orgId, connectionId);
  return (
    <Card>
      <CardHeader title={g.reposTitle} description={g.reposBody} icon={<IconLock size={15} />} action={repos.data ? <Badge>{repos.data.items.length}</Badge> : undefined} />
      {repos.isPending ? <div className="space-y-3 p-5"><Skeleton className="h-8" /><Skeleton className="h-8" /></div> : isUnsupported(repos.error) ? (
        <NotAvailable title={g.reposUnavailable} description={g.reposUnavailableBody} />
      ) : repos.error ? <div className="p-5"><ErrorNotice error={repos.error as ConsoleError} onRetry={() => void repos.refetch()} /></div> : repos.data.items.length === 0 ? (
        <EmptyState title={g.noRepos} description={g.noReposBody} />
      ) : (
        <ul className="divide-y divide-border">{repos.data.items.map((r) => (
          <li key={String(r.id)} className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-hover">
            <a href={`https://github.com/${r.full_name}`} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-2.5 font-mono text-sm hover:underline"><IconGithub size={14} className="shrink-0 text-subtle" /><span className="truncate">{r.full_name}</span></a>
            {r.last_seen_at ? <span className="shrink-0 text-xs text-muted">{g.lastSeen(relativeTime(r.last_seen_at, locale, t))}</span> : null}
          </li>
        ))}</ul>
      )}
    </Card>
  );
}
