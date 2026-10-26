// Members, invitations and ownership page.
import type { Metadata } from "next";

import { MembersPanel } from "@/components/members-panel";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Members" };

export default function MembersPage() {
  return (
    <>
      <PageHeader title="Members" description="Who can access this organisation, and with which role." />
      <MembersPanel />
    </>
  );
}
