// Help page: a short, static guide for first-time users. Explains the setup
// path, the words the Console uses, what each role may do, and how to recover
// from the common stuck states. Static content only; no Manager calls.
import type { Metadata } from "next";

import { Card, CardHeader, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Help" };

const STEPS: ReadonlyArray<readonly [string, string]> = [
  ["Create an organisation", "Your team's space. Members, roles and tenants live here."],
  ["Install the GitHub App", "On the GitHub page, choose your account or organisation and the repositories OpenFlows may work with."],
  ["Create a tenant", "Pick a repository. OpenFlows starts a runtime that plans, builds and reviews work on its issues."],
  ["Invite your team", "On the Members page, send an invitation link and choose a role."],
];

const TERMS: ReadonlyArray<readonly [string, string]> = [
  ["Organisation", "A team boundary inside OpenFlows. It is separate from a GitHub organisation, though it can connect to several."],
  ["Tenant", "One OpenFlows runtime bound to one GitHub repository."],
  ["Fleet size", "How many agent workspaces a tenant runs at once."],
  ["Operation", "A background job such as provisioning, starting or cleaning a tenant. Progress appears live and failed ones can be retried."],
  ["GitHub App", "The OpenFlows app you install on GitHub. It decides which repositories OpenFlows can read and change."],
];

const ROLES: ReadonlyArray<readonly [string, string]> = [
  ["Admin", "Everything: members, GitHub connection, settings and tenants."],
  ["Developer", "Create and operate tenants (start, stop, clean, delete)."],
  ["Viewer", "Read-only access to tenants, activity and status."],
];

const FIXES: ReadonlyArray<readonly [string, string]> = [
  ["“Setting up your organisation” does not finish", "Provisioning runs on the platform. If it stays for more than a few minutes, ask your platform operator to check Manager and Coder."],
  ["Repository not found when creating a tenant", "Check the address, then open GitHub and press Sync now. Make sure the app is installed on that repository."],
  ["GitHub shows “Waiting” or “Almost done”", "The install was not finished. Press Continue on GitHub and complete the install."],
  ["A tenant shows Failed", "Open it to see the failed step, then press Retry. If it fails again, share the request ID with support."],
];

function List({ rows }: Readonly<{ rows: ReadonlyArray<readonly [string, string]> }>) {
  return (
    <dl className="divide-y divide-border">
      {rows.map(([term, text]) => (
        <div key={term} className="grid gap-1 px-5 py-3 sm:grid-cols-[200px_1fr] sm:gap-6">
          <dt className="text-sm font-medium">{term}</dt>
          <dd className="text-sm text-muted">{text}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Help" description="Get set up quickly and find your way around." />
      <Card>
        <CardHeader title="Getting started" description="Four steps from sign-in to a running tenant." />
        <ol className="divide-y divide-border">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="flex gap-4 px-5 py-3">
              <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-strong text-xs text-muted">{i + 1}</span>
              <div><p className="text-sm font-medium">{title}</p><p className="text-sm text-muted">{text}</p></div>
            </li>
          ))}
        </ol>
      </Card>
      <Card><CardHeader title="Words we use" /><List rows={TERMS} /></Card>
      <Card><CardHeader title="Roles" description="What each member can do in this organisation." /><List rows={ROLES} /></Card>
      <Card><CardHeader title="If something looks stuck" /><List rows={FIXES} /></Card>
    </div>
  );
}
