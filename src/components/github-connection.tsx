// GithubConnection: the organisation's GitHub App connection(s) with status
// and recovery actions. Manager exposes connection metadata only (account,
// status, timestamps); no tokens, and no repository list yet. Connecting goes
// through Manager's two-leg flow (user authorisation + app installation), each
// a full-page redirect to GitHub. Admin-only controls (connect / reconcile /
// disconnect) are hidden from other roles, who still see the health summary.
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { api, type ConsoleError } from "@/lib/client/api";
import { keys, useConnections, useRepositories } from "@/lib/client/queries";
import { canAdminister, type GithubConnection as Connection, isUnsupported } from "@/lib/manager/contract";

import { rememberSetupUrl } from "./github-install-continue";
import { useConsole } from "./shell/console-context";
import { Button } from "./ui/button";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { Badge, Card, CardHeader, EmptyState, ErrorNotice, NotAvailable } from "./ui/primitives";

const STATUS: Record<string, { label: string; tone: "neutral" | "info" | "success" | "warning" | "danger"; guide: string }> = {
  active: { label: "Connected", tone: "success", guide: "OpenFlows can access the repositories you authorised on GitHub." },
  pending: { label: "Waiting for GitHub", tone: "info", guide: "The connection was started but not finished. Continue on GitHub, or start again." },
  verified: { label: "Almost done", tone: "info", guide: "GitHub confirmed you. Finish installing the app to complete the connection." },
  suspended: { label: "Suspended", tone: "warning", guide: "GitHub suspended the installation. Unsuspend it in your GitHub settings, then reconcile." },
  disconnected: { label: "Disconnected", tone: "danger", guide: "The app was uninstalled or disconnected. Connect again to restore access." },
};

export function GithubConnection({ justConnected }: Readonly<{ justConnected: boolean }>) {
  const { orgId, role } = useConsole();
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

  if (isPending) return <Card><div className="space-y-3 p-5" aria-busy="true"><div className="h-5 w-40 animate-pulse rounded bg-surface-muted" /><div className="h-4 w-2/3 animate-pulse rounded bg-surface-muted" /></div></Card>;
  if (error) return <ErrorNotice error={error as ConsoleError} onRetry={() => void refetch()} />;

  const live = data.items.filter((c) => c.status !== "disconnected");
  const activeConn = live.find((c) => c.status === "active");
  const actionError = (connect.error ?? reconcile.error) as ConsoleError | null;

  return (
    <div className="space-y-6">
      {justConnected && live.some((c) => c.status === "active") ? (
        <p role="status" className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success">GitHub connected.</p>
      ) : null}
      {actionError ? <ErrorNotice error={actionError} /> : null}
      {reconcile.isSuccess ? <p role="status" className="rounded-lg bg-info-soft px-4 py-3 text-sm text-info">Sync requested. OpenFlows is checking GitHub; the repository list updates within a few seconds.</p> : null}

      <Card>
        <CardHeader
          title="GitHub App"
          description="OpenFlows works only with repositories you authorise."
          action={admin && live.length === 0 ? <Button variant="primary" loading={connect.isPending || redirecting} onClick={() => connect.mutate()}>Connect GitHub</Button> : undefined}
        />
        {live.length === 0 ? (
          <EmptyState title="Not connected" description={admin ? "Install the OpenFlows GitHub App and choose which repositories it can access." : "An organisation admin needs to connect GitHub."} />
        ) : (
          <ul className="divide-y divide-border">
            {live.map((c) => {
              const s = STATUS[c.status] ?? { label: c.status, tone: "neutral" as const, guide: "" };
              return (
                <li key={c.id} className="space-y-3 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{c.account_login ?? "GitHub account"}</p>
                      <p className="text-xs text-muted capitalize">{c.account_type}{c.last_reconciled_at ? ` · checked ${new Date(c.last_reconciled_at).toLocaleString()}` : ""}</p>
                    </div>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </div>
                  <p className="text-sm text-muted">{s.guide}</p>
                  {admin ? (
                    <div className="flex flex-wrap gap-2">
                      {c.status !== "pending" && c.status !== "verified" ? <Button loading={reconcile.isPending && reconcile.variables === c.id} onClick={() => reconcile.mutate(c.id)}>Sync now</Button> : <Button variant="primary" loading={connect.isPending || redirecting} onClick={() => connect.mutate()}>Continue on GitHub</Button>}
                      <Button variant="ghost" onClick={() => { disconnect.reset(); setConfirm(c); }}>Disconnect</Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {!admin ? <p className="border-t border-border px-5 py-3 text-xs text-muted">Only organisation admins can change the GitHub connection.</p> : null}
      </Card>

      {activeConn ? <Repositories orgId={orgId} connectionId={activeConn.id} /> : null}

      <ConfirmDialog
        open={confirm !== null}
        title="Disconnect GitHub?"
        description="OpenFlows loses access to the repositories on this installation. Existing tenants stop being able to work on them until you reconnect."
        confirmLabel="Disconnect"
        danger
        pending={disconnect.isPending}
        error={disconnect.error as ConsoleError | null}
        onClose={() => { setConfirm(null); disconnect.reset(); }}
        onConfirm={() => confirm && disconnect.mutate(confirm.id)}
      />
    </div>
  );
}

/** Accessible repositories for the active connection (Manager endpoint pending). */
function Repositories({ orgId, connectionId }: Readonly<{ orgId: string; connectionId: string }>) {
  const repos = useRepositories(orgId, connectionId);
  return (
    <Card>
      <CardHeader title="Accessible repositories" description="Repositories OpenFlows can create tenants for." />
      {repos.isPending ? <div className="h-16 animate-pulse p-5" aria-busy="true" /> : isUnsupported(repos.error) ? (
        <NotAvailable title="Repository list unavailable" description="OpenFlows cannot list your repositories here yet. You can still create a tenant by pasting the repository address." />
      ) : repos.error ? <div className="p-5"><ErrorNotice error={repos.error as ConsoleError} onRetry={() => void repos.refetch()} /></div> : repos.data.items.length === 0 ? (
        <EmptyState title="No repositories" description="Grant the OpenFlows app access to repositories on GitHub, then reconcile." />
      ) : (
        <ul className="divide-y divide-border">{repos.data.items.map((r) => <li key={String(r.id)} className="flex items-center justify-between px-5 py-3"><span className="font-mono text-sm">{r.full_name}</span><Badge>{r.private ? "Private" : "Public"}</Badge></li>)}</ul>
      )}
    </Card>
  );
}
