// Invitation page: where an invitation link lands. Replaces the plain page
// Manager used to serve. Signed-out visitors go through GitHub sign-in and come
// back here. Signed-in visitors see what the invitation offers (organisation,
// role, who invited them) and accept with one click; acceptance happens in the
// browser (CSRF + idempotency, like every other action). If Manager reports the
// invitation as unusable it does not say why (wrong account, used, revoked or
// expired look identical, so tokens cannot be probed), and this page lists the
// possible reasons and the way forward.
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { InvitationAccept } from "@/components/invitation-accept";
import { InvitationUnavailable } from "@/components/invitation-unavailable";
import { getMessages } from "@/lib/i18n/server";
import { getConsoleSession, getInvitationPreview, UnauthenticatedError } from "@/lib/server/manager";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMessages();
  return { title: t.invitation.metaTitle };
}

export default async function InvitationPage({ searchParams }: Readonly<{ searchParams: Promise<{ token?: string }> }>) {
  const [{ token }, { t }] = await Promise.all([searchParams, getMessages()]);
  if (!token) return <InvitationUnavailable title={t.invitation.noToken} body={t.invitation.noTokenBody} />;

  let session;
  let preview;
  try {
    session = await getConsoleSession();
    preview = await getInvitationPreview(token);
  } catch (e) {
    // Signed out: sign in with GitHub, then return to this exact link.
    if (e instanceof UnauthenticatedError) redirect(`/auth/github/start?next=${encodeURIComponent(`/invitations/accept?token=${token}`)}`);
    throw e;
  }
  if (preview === "unavailable") {
    return <InvitationUnavailable title={t.invitation.unavailableTitle} body={t.invitation.unavailableBody} reasons={t.invitation.unavailableReasons} action={t.invitation.unavailableAction} user={session.me.display_name} />;
  }
  return <InvitationAccept token={token} preview={preview} user={session.me.display_name} />;
}
