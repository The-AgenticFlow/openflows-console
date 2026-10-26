// SettingsPanel: organisation name (admin), your Coder-backed identity, and
// the danger zone (delete organisation, admin, typed confirmation). The Coder
// identity card shows link status only; no credential ever reaches the browser
// (Manager returns the account id and deployment URL, never a token).
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api, type ConsoleError } from "@/lib/client/api";
import { useCoderIdentity } from "@/lib/client/queries";
import { canAdminister, validateOrgName } from "@/lib/manager/contract";

import { useConsole } from "./shell/console-context";
import { Button } from "./ui/button";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { Badge, Card, CardHeader, ErrorNotice, NotAvailable, Skeleton } from "./ui/primitives";

export function SettingsPanel() {
  const { org, orgId, role } = useConsole();
  const admin = canAdminister(role);
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState(org.display_name);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const coder = useCoderIdentity();
  const invalid = validateOrgName(name);

  const rename = useMutation({ mutationFn: () => api.updateOrganization(orgId, name.trim()), onSuccess: () => { setSaved(true); router.refresh(); } });
  const del = useMutation({ mutationFn: () => api.deleteOrganization(orgId), onSuccess: () => { setConfirm(false); router.push("/"); router.refresh(); } });
  const link = useMutation({ mutationFn: () => api.startCoderLink(), onSuccess: (r) => window.location.assign(r.authorization_url) });
  void qc;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="General" description="How this organisation appears across the Console." />
        <form className="space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); setSaved(false); if (!invalid) rename.mutate(); }} noValidate>
          <div className="max-w-md">
            <label htmlFor="org-display" className="mb-1.5 block text-sm font-medium">Organisation name</label>
            <input id="org-display" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} disabled={!admin} aria-invalid={!!invalid} className="h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm disabled:opacity-60 aria-[invalid=true]:border-danger" />
            <p className="mt-1.5 text-xs text-muted">URL name <span className="font-mono">{org.slug}</span> cannot be changed.</p>
            {invalid ? <p className="mt-1 text-xs text-danger">{invalid}</p> : null}
          </div>
          {rename.error ? <ErrorNotice error={rename.error as ConsoleError} /> : null}
          {admin ? (
            <div className="flex items-center gap-3">
              <Button type="submit" variant="primary" loading={rename.isPending} disabled={!!invalid || name.trim() === org.display_name}>Save changes</Button>
              {saved ? <span role="status" className="text-sm text-success">Saved</span> : null}
            </div>
          ) : <p className="text-xs text-muted">Only organisation admins can change settings.</p>}
        </form>
      </Card>

      <Card>
        <CardHeader title="Coder identity" description="Your account on the Coder deployment that runs your workspaces." action={coder.data?.account ? <Badge tone="success">Linked</Badge> : undefined} />
        <div className="space-y-3 p-5">
          {coder.isPending ? <Skeleton className="h-5 w-1/2" /> : coder.error ? (
            <NotAvailable title="Coder identity" description="This Manager did not report a Coder identity status." />
          ) : !coder.data.configured ? (
            <p className="text-sm text-muted">This deployment does not require a Coder-backed identity.</p>
          ) : coder.data.account ? (
            <div className="text-sm"><p>Linked to <span className="font-mono">{coder.data.account.deployment}</span></p><p className="mt-0.5 text-xs text-muted">Account ID <span className="font-mono">{coder.data.account.id}</span>. No credential is shown or stored in your browser.</p></div>
          ) : (
            <>
              <p className="text-sm text-muted">Link your Coder account so OpenFlows can run workspaces as you. You will be sent to Coder to approve access.</p>
              {link.error ? <ErrorNotice error={link.error as ConsoleError} /> : null}
              <Button variant="primary" loading={link.isPending} onClick={() => link.mutate()}>Connect Coder account</Button>
            </>
          )}
        </div>
      </Card>

      {admin ? (
        <Card className="border-danger/30">
          <CardHeader title="Danger zone" description="Irreversible actions for this organisation." />
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div><p className="text-sm font-medium">Delete this organisation</p><p className="text-sm text-muted">Removes the organisation, its tenants and memberships.</p></div>
            <Button variant="danger" onClick={() => { del.reset(); setConfirm(true); }}>Delete organisation</Button>
          </div>
        </Card>
      ) : null}

      <ConfirmDialog
        open={confirm}
        title="Delete this organisation?"
        description="Its tenants, GitHub connection and memberships are permanently removed. Your GitHub repositories are not touched. This cannot be undone."
        confirmLabel="Delete organisation"
        danger
        requireText={org.slug}
        pending={del.isPending}
        error={del.error as ConsoleError | null}
        onClose={() => { setConfirm(false); del.reset(); }}
        onConfirm={() => del.mutate()}
      />
    </div>
  );
}
