// MembersPanel: members, invitations and ownership transfer for the active
// organisation, using Manager's roles (admin / developer / viewer; ownership is
// separate). Invitations are link-based: Manager returns an `invitation_url`
// that the admin shares with the invitee, who opens it after signing in with
// GitHub. Manager does not list pending invitations, so only the one just
// created is shown. Controls are role-aware to avoid dead ends; Manager is the
// authority and its refusals are shown inline.
"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api, type ConsoleError } from "@/lib/client/api";
import { useMemberMutation, useMembers } from "@/lib/client/queries";
import { canAdminister, type InvitationCreated, type Member, type Role, ROLE_LABEL, validateGithubLogin } from "@/lib/manager/contract";

import { useConsole } from "./shell/console-context";
import { Button } from "./ui/button";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { Badge, Card, CardHeader, EmptyState, ErrorNotice } from "./ui/primitives";

type Dialog = { kind: "remove"; member: Member } | { kind: "transfer" } | null;
const ROLES: Role[] = ["admin", "developer", "viewer"];

export function MembersPanel() {
  const { org, orgId, role, user } = useConsole();
  const router = useRouter();
  const admin = canAdminister(role);
  const members = useMembers(orgId);
  const orgInfo = useQuery({ queryKey: ["org", orgId, "info"], queryFn: () => api.getOrganization(orgId), retry: false });
  const [dialog, setDialog] = useState<Dialog>(null);
  const [login, setLogin] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("developer");
  const [touched, setTouched] = useState(false);
  const [created, setCreated] = useState<InvitationCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const [newOwner, setNewOwner] = useState("");

  const invite = useMemberMutation(orgId, (v: { login: string; role: Role }) => api.invite(orgId, v.login, v.role));
  const setRole = useMemberMutation(orgId, (v: { userId: string; role: Role }) => api.updateMember(orgId, v.userId, { role: v.role }));
  const remove = useMemberMutation(orgId, (userId: string) => api.removeMember(orgId, userId));
  const transfer = useMemberMutation(orgId, (id: string) => api.transferOwnership(orgId, id));

  const isOwner = orgInfo.data?.owner_user_id === user.id;
  const closeDialog = () => { setDialog(null); remove.reset(); transfer.reset(); };
  const loginError = touched ? validateGithubLogin(login) : null;

  if (members.isPending) return <Card><div className="h-32 animate-pulse p-5" aria-busy="true" /></Card>;
  if (members.error) return <ErrorNotice error={members.error as ConsoleError} onRetry={() => void members.refetch()} />;
  const active = members.data.items.filter((m) => m.status === "active");
  const others = active.filter((m) => m.user_id !== user.id);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (validateGithubLogin(login)) return;
    try {
      setCreated((await invite.mutateAsync({ login: login.trim(), role: inviteRole })) as InvitationCreated);
      setLogin(""); setTouched(false); setCopied(false);
    } catch { /* shown via invite.error */ }
  }

  return (
    <div className="space-y-6">
      {setRole.error ? <ErrorNotice error={setRole.error as ConsoleError} /> : null}

      <Card>
        <CardHeader title="Members" description={`${active.length} in ${org.display_name}`} />
        <ul className="divide-y divide-border">
          {active.map((m) => {
            const self = m.user_id === user.id;
            const owner = orgInfo.data?.owner_user_id === m.user_id;
            return (
              <li key={m.user_id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{m.display_name}{self ? <span className="ml-2 text-xs font-normal text-muted">(you)</span> : null}</p>
                  {owner ? <p className="text-xs text-muted">Owner</p> : null}
                </div>
                {admin && !owner ? (
                  <select aria-label={`Role for ${m.display_name}`} value={m.role} disabled={setRole.isPending} onChange={(e) => setRole.mutate({ userId: m.user_id, role: e.target.value as Role })} className="h-8 rounded-lg border border-border-strong bg-surface px-2 text-sm">
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                ) : <Badge tone={m.role === "admin" ? "info" : "neutral"}>{ROLE_LABEL[m.role]}</Badge>}
                {(admin || self) && !owner ? <Button variant="ghost" onClick={() => { remove.reset(); setDialog({ kind: "remove", member: m }); }}>{self ? "Leave" : "Remove"}</Button> : null}
              </li>
            );
          })}
        </ul>
      </Card>

      {admin ? (
        <Card>
          <CardHeader title="Invite someone" description="You get an invitation link to share. They open it after signing in with GitHub." />
          <form onSubmit={sendInvite} noValidate className="space-y-3 p-5">
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-48 flex-1">
                <label htmlFor="invite-login" className="sr-only">GitHub username</label>
                <input id="invite-login" value={login} onChange={(e) => setLogin(e.target.value)} onBlur={() => setTouched(true)} placeholder="GitHub username" autoComplete="off" aria-invalid={!!loginError} className="h-9 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm aria-[invalid=true]:border-danger" />
                <p className="mt-1 min-h-4 text-xs text-danger">{loginError}</p>
              </div>
              <label className="sr-only" htmlFor="invite-role">Role</label>
              <select id="invite-role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)} className="h-9 rounded-lg border border-border-strong bg-surface px-2 text-sm">
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
              <Button type="submit" variant="primary" loading={invite.isPending}>Create invitation</Button>
            </div>
            {invite.error ? <ErrorNotice error={invite.error as ConsoleError} /> : null}
          </form>
          {created?.invitation_url ? (
            <div className="space-y-2 border-t border-border px-5 py-4">
              <p className="text-sm font-medium">Invitation link</p>
              <div className="flex gap-2">
                <input readOnly aria-label="Invitation link" value={created.invitation_url} onFocus={(e) => e.currentTarget.select()} className="h-9 min-w-0 flex-1 rounded-lg border border-border-strong bg-surface-muted px-3 font-mono text-xs" />
                <Button onClick={() => { void navigator.clipboard?.writeText(created.invitation_url ?? ""); setCopied(true); }}>{copied ? "Copied" : "Copy"}</Button>
              </div>
              <p className="text-xs text-muted">Expires in {Math.round(created.expires_in_seconds / 3600)} hours. It is shown once; Manager does not list pending invitations.</p>
            </div>
          ) : null}
        </Card>
      ) : null}

      {isOwner ? (
        <Card>
          <CardHeader title="Transfer ownership" description="Make another member the owner. This is recorded in the audit log." />
          {others.length === 0 ? <EmptyState title="No one to transfer to" description="Invite a member first." /> : (
            <div className="flex flex-wrap items-center gap-2 p-5">
              <label htmlFor="new-owner" className="sr-only">New owner</label>
              <select id="new-owner" value={newOwner} onChange={(e) => setNewOwner(e.target.value)} className="h-9 rounded-lg border border-border-strong bg-surface px-2 text-sm">
                <option value="">Choose a member…</option>
                {others.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}
              </select>
              <Button variant="danger" disabled={!newOwner} onClick={() => { transfer.reset(); setDialog({ kind: "transfer" }); }}>Transfer ownership</Button>
            </div>
          )}
        </Card>
      ) : null}

      <ConfirmDialog
        open={dialog?.kind === "remove"}
        title={dialog?.kind === "remove" && dialog.member.user_id === user.id ? "Leave this organisation?" : "Remove this member?"}
        description={dialog?.kind === "remove" ? (dialog.member.user_id === user.id ? `You will lose access to ${org.display_name} and its tenants.` : `${dialog.member.display_name} will lose access to ${org.display_name} and its tenants.`) : ""}
        confirmLabel={dialog?.kind === "remove" && dialog.member.user_id === user.id ? "Leave" : "Remove"}
        danger
        pending={remove.isPending}
        error={remove.error as ConsoleError | null}
        onClose={closeDialog}
        onConfirm={() => {
          if (dialog?.kind !== "remove") return;
          const leaving = dialog.member.user_id === user.id;
          remove.mutate(dialog.member.user_id, { onSuccess: () => { closeDialog(); if (leaving) { router.push("/"); router.refresh(); } } });
        }}
      />
      <ConfirmDialog
        open={dialog?.kind === "transfer"}
        title="Transfer ownership?"
        description="The chosen member becomes the owner with full control. Only they can reverse this."
        confirmLabel="Transfer ownership"
        danger
        requireText={org.slug}
        pending={transfer.isPending}
        error={transfer.error as ConsoleError | null}
        onClose={closeDialog}
        onConfirm={() => transfer.mutate(newOwner, { onSuccess: () => { closeDialog(); setNewOwner(""); router.refresh(); } })}
      />
    </div>
  );
}
