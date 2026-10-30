// MembersPanel: members, invitations and ownership transfer for the active
// organisation, using Manager's roles (admin / developer / viewer; ownership is
// separate). Layout: summary tiles (members, admins, pending invitations); the
// people list with a name filter, role controls and owner/you markers; and a
// side column with the invite form, a plain explanation of how invitations
// work, and what each role may do. Invitations are link-based: Manager returns
// an `invitation_url` that the admin shares with the invitee, who opens it
// after signing in with GitHub. Admins also see the outstanding invitations
// (the link itself is shown only once, at creation) and can revoke them.
// Controls are role-aware to avoid dead ends; Manager is the authority and its
// refusals are shown inline. All text follows the active language.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api, type ConsoleError } from "@/lib/client/api";
import { keys, useInvitations, useMemberMutation, useMembers } from "@/lib/client/queries";
import { formatDateTime, relativeTime } from "@/lib/i18n";
import { canAdminister, type InvitationCreated, isUnsupported, type Member, type PendingInvitation, type Role, validateGithubLogin } from "@/lib/manager/contract";
import { useT } from "@/lib/preferences/client";

import { useConsole } from "./shell/console-context";
import { Button } from "./ui/button";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { IconCrown, IconLink, IconMail, IconShield, IconUsers } from "./ui/icons";
import { Avatar, Badge, Card, CardHeader, CopyButton, EmptyState, ErrorNotice, inputClass, SearchInput, selectClass, Skeleton, StatCard } from "./ui/primitives";

type Dialog = { kind: "remove"; member: Member } | { kind: "revoke"; invitation: PendingInvitation } | { kind: "transfer" } | null;
const ROLES: Role[] = ["admin", "developer", "viewer"];
const ROLE_TONE: Record<Role, "info" | "success" | "neutral"> = { admin: "info", developer: "success", viewer: "neutral" };

export function MembersPanel() {
  const { org, orgId, role, user } = useConsole();
  const { t, locale } = useT();
  const router = useRouter();
  const admin = canAdminister(role);
  const members = useMembers(orgId);
  const invitations = useInvitations(orgId, admin);
  const orgInfo = useQuery({ queryKey: ["org", orgId, "info"], queryFn: () => api.getOrganization(orgId), retry: false });
  const [dialog, setDialog] = useState<Dialog>(null);
  const [login, setLogin] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("developer");
  const [touched, setTouched] = useState(false);
  const [created, setCreated] = useState<InvitationCreated | null>(null);
  const [newOwner, setNewOwner] = useState("");
  const [filter, setFilter] = useState("");

  const invite = useMemberMutation(orgId, (v: { login: string; role: Role }) => api.invite(orgId, v.login, v.role));
  const qc = useQueryClient();
  const refreshInvitations = () => void qc.invalidateQueries({ queryKey: keys.invitations(orgId) });
  const revoke = useMutation({ mutationFn: (id: string) => api.revokeInvitation(orgId, id), onSuccess: refreshInvitations });
  const setRole = useMemberMutation(orgId, (v: { userId: string; role: Role }) => api.updateMember(orgId, v.userId, { role: v.role }));
  const remove = useMemberMutation(orgId, (userId: string) => api.removeMember(orgId, userId));
  const transfer = useMemberMutation(orgId, (id: string) => api.transferOwnership(orgId, id));

  const ownerId = orgInfo.data?.owner_user_id;
  const isOwner = ownerId === user.id;
  const closeDialog = () => { setDialog(null); remove.reset(); transfer.reset(); revoke.reset(); };
  const loginError = touched && validateGithubLogin(login) ? t.validation.githubLogin : null;

  if (members.isPending) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }
  if (members.error) return <ErrorNotice error={members.error as ConsoleError} onRetry={() => void members.refetch()} />;
  const active = members.data.items.filter((m) => m.status === "active");
  const others = active.filter((m) => m.user_id !== user.id);
  const shown = active.filter((m) => m.display_name.toLowerCase().includes(filter.trim().toLowerCase()));
  const pendingCount = invitations.data?.items.length ?? 0;

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (validateGithubLogin(login)) return;
    try {
      setCreated((await invite.mutateAsync({ login: login.trim(), role: inviteRole })) as InvitationCreated);
      setLogin(""); setTouched(false);
      refreshInvitations();
    } catch { /* shown via invite.error */ }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t.members.statMembers} value={active.length} icon={<IconUsers size={15} />} />
        <StatCard label={t.members.statAdmins} value={active.filter((m) => m.role === "admin").length} icon={<IconShield size={15} />} tone="info" />
        <StatCard label={t.members.statPending} value={admin ? pendingCount : "—"} icon={<IconMail size={15} />} tone={pendingCount ? "warning" : "neutral"} />
      </div>

      {setRole.error ? <ErrorNotice error={setRole.error as ConsoleError} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title={t.members.listTitle}
              description={t.members.listBody(active.length, org.display_name)}
              action={active.length > 5 ? <SearchInput value={filter} onChange={setFilter} placeholder={t.members.filterPlaceholder} label={t.members.filter} /> : undefined}
            />
            {shown.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted">{t.members.noMatch}</p> : (
              <ul className="stagger divide-y divide-border">
                {shown.map((m, i) => {
                  const self = m.user_id === user.id;
                  const owner = ownerId === m.user_id;
                  return (
                    <li key={m.user_id} style={{ "--i": Math.min(i, 12) } as React.CSSProperties} className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition-colors hover:bg-hover">
                      <Avatar name={m.display_name} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          <span className="truncate">{m.display_name}</span>
                          {self ? <span className="rounded-md bg-surface-muted px-1.5 py-0.5 text-[11px] font-normal text-muted">{t.common.you}</span> : null}
                          {owner ? <span className="inline-flex items-center gap-1 rounded-md bg-warning-soft px-1.5 py-0.5 text-[11px] font-medium text-warning"><IconCrown size={11} /> {t.common.owner}</span> : null}
                        </p>
                        <p className="truncate text-xs text-muted">{t.roles[`${m.role}Body`]}</p>
                      </div>
                      {admin && !owner && !self ? (
                        <select aria-label={t.members.roleFor(m.display_name)} value={m.role} disabled={setRole.isPending} onChange={(e) => setRole.mutate({ userId: m.user_id, role: e.target.value as Role })} className={selectClass}>
                          {ROLES.map((r) => <option key={r} value={r}>{t.roles[r]}</option>)}
                        </select>
                      ) : <Badge tone={ROLE_TONE[m.role]}>{t.roles[m.role]}</Badge>}
                      {(admin || self) && !owner ? (
                        <Button variant="ghost" className="text-danger hover:text-danger" onClick={() => { remove.reset(); setDialog({ kind: "remove", member: m }); }}>{self ? t.members.leave : t.members.remove}</Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {admin && !isUnsupported(invitations.error) ? (
            <Card>
              <CardHeader title={t.members.pendingTitle} description={t.members.pendingBody} icon={<IconMail size={15} />} />
              {invitations.isPending ? <div className="space-y-3 p-5"><Skeleton className="h-10" /></div> : invitations.error ? (
                <div className="p-5"><ErrorNotice error={invitations.error as ConsoleError} onRetry={() => void invitations.refetch()} /></div>
              ) : invitations.data.items.length === 0 ? (
                <EmptyState title={t.members.noPending} description={t.members.noPendingBody} icon={<IconMail size={18} />} />
              ) : (
                <ul className="divide-y divide-border">
                  {invitations.data.items.map((i) => (
                    <li key={i.invitation_id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                      <Avatar name={i.invitee_login ?? "?"} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{i.invitee_login ?? t.members.githubUser(i.invitee_github_user_id)}</p>
                        <p className="text-xs text-muted" title={formatDateTime(i.expires_at, locale)}>
                          {t.roles[i.role]} · {t.members.invited(relativeTime(i.created_at, locale, t))} · {t.members.expires(relativeTime(i.expires_at, locale, t))}
                        </p>
                      </div>
                      <Badge dot tone={i.status === "expired" ? "warning" : "info"}>{t.states[i.status]}</Badge>
                      <Button variant="ghost" onClick={() => { revoke.reset(); setDialog({ kind: "revoke", invitation: i }); }}>{t.members.revoke}</Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}

          {isOwner ? (
            <Card className="border-danger/30">
              <CardHeader title={t.members.transferTitle} description={t.members.transferBody} icon={<IconCrown size={15} />} />
              {others.length === 0 ? <EmptyState title={t.members.noOne} description={t.members.noOneBody} /> : (
                <div className="flex flex-wrap items-center gap-2 p-5">
                  <label htmlFor="new-owner" className="sr-only">{t.members.newOwner}</label>
                  <select id="new-owner" value={newOwner} onChange={(e) => setNewOwner(e.target.value)} className={selectClass}>
                    <option value="">{t.members.choose}</option>
                    {others.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}
                  </select>
                  <Button variant="danger" disabled={!newOwner} onClick={() => { transfer.reset(); setDialog({ kind: "transfer" }); }}>{t.members.transfer}</Button>
                </div>
              )}
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          {admin ? (
            <Card>
              <CardHeader title={t.members.inviteTitle} description={t.members.inviteBody} icon={<IconLink size={15} />} />
              <form onSubmit={sendInvite} noValidate className="space-y-3 p-5">
                <div>
                  <label htmlFor="invite-login" className="mb-1.5 block text-sm font-medium">{t.members.githubUsername}</label>
                  <input id="invite-login" value={login} onChange={(e) => setLogin(e.target.value)} onBlur={() => setTouched(true)} placeholder="octocat" autoComplete="off" aria-invalid={!!loginError} className={inputClass} />
                  {loginError ? <p className="mt-1 text-xs text-danger">{loginError}</p> : null}
                </div>
                <div>
                  <label htmlFor="invite-role" className="mb-1.5 block text-sm font-medium">{t.members.role}</label>
                  <select id="invite-role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)} className={`${selectClass} h-10 w-full`}>
                    {ROLES.map((r) => <option key={r} value={r}>{t.roles[r]}</option>)}
                  </select>
                  <p className="mt-1.5 text-xs text-muted">{t.roles[`${inviteRole}Body`]}</p>
                </div>
                {invite.error ? <ErrorNotice error={invite.error as ConsoleError} /> : null}
                <Button type="submit" variant="primary" loading={invite.isPending} className="w-full">{t.members.createInvite}</Button>
              </form>
              {created?.invitation_url ? (
                <div className="animate-pop space-y-2 border-t border-border bg-accent-soft/40 px-5 py-4">
                  <p className="text-sm font-medium">{t.members.linkTitle}</p>
                  <div className="flex items-center gap-2">
                    <input readOnly aria-label={t.members.linkLabel} value={created.invitation_url} onFocus={(e) => e.currentTarget.select()} className="h-9 min-w-0 flex-1 rounded-lg border border-border-strong bg-surface px-3 font-mono text-xs" />
                    <CopyButton value={created.invitation_url} label={t.members.linkLabel} />
                  </div>
                  <p className="text-xs text-muted">{t.members.linkExpires(Math.round(created.expires_in_seconds / 3600))}</p>
                </div>
              ) : null}
            </Card>
          ) : null}

          {admin ? (
            <Card>
              <CardHeader title={t.members.howItWorks} />
              <ol className="space-y-3 p-5">
                {[t.members.how1, t.members.how2, t.members.how3].map((s, i) => (
                  <li key={s} className="flex gap-3 text-sm">
                    <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{i + 1}</span>
                    <span className="text-muted">{s}</span>
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}

          <Card>
            <CardHeader title={t.members.rolesTitle} description={t.members.rolesBody} />
            <dl className="divide-y divide-border">
              {ROLES.map((r) => (
                <div key={r} className="px-5 py-3">
                  <dt><Badge tone={ROLE_TONE[r]}>{t.roles[r]}</Badge></dt>
                  <dd className="mt-1.5 text-sm text-muted">{t.roles[`${r}Body`]}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={dialog?.kind === "remove"}
        title={dialog?.kind === "remove" && dialog.member.user_id === user.id ? t.members.leaveTitle : t.members.removeTitle}
        description={dialog?.kind === "remove" ? (dialog.member.user_id === user.id ? t.members.leaveBody(org.display_name) : t.members.removeBody(dialog.member.display_name, org.display_name)) : ""}
        confirmLabel={dialog?.kind === "remove" && dialog.member.user_id === user.id ? t.members.leave : t.members.remove}
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
        open={dialog?.kind === "revoke"}
        title={t.members.revokeTitle}
        description={t.members.revokeBody}
        confirmLabel={t.members.revoke}
        danger
        pending={revoke.isPending}
        error={revoke.error as ConsoleError | null}
        onClose={closeDialog}
        onConfirm={() => { if (dialog?.kind === "revoke") revoke.mutate(dialog.invitation.invitation_id, { onSuccess: closeDialog }); }}
      />
      <ConfirmDialog
        open={dialog?.kind === "transfer"}
        title={t.members.transferConfirmTitle}
        description={t.members.transferConfirmBody}
        confirmLabel={t.members.transfer}
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
