// OnboardingChecklist: the ordered steps to a first tenant. Completion is
// derived from Manager state (GitHub connection, tenants), never stored
// client-side. A step whose prerequisite is unmet is shown as blocked.
"use client";

import Link from "next/link";

import { useConnections, useTenants } from "@/lib/client/queries";
import { canAdminister, canOperate } from "@/lib/manager/contract";

import { useConsole } from "./shell/console-context";
import { Badge, Card, CardHeader } from "./ui/primitives";

interface Step { title: string; detail: string; done: boolean; href?: string; cta?: string; blocked?: boolean }

export function OnboardingChecklist() {
  const { org, orgId, role } = useConsole();
  const conns = useConnections(orgId);
  const tenants = useTenants(orgId);
  const connected = !!conns.data?.items.some((c) => c.status === "active");
  const hasTenant = (tenants.data?.items.length ?? 0) > 0;
  const loading = conns.isPending || tenants.isPending;

  const steps: Step[] = [
    { title: "Sign in with GitHub", detail: "You are signed in.", done: true },
    { title: "Create an organisation", detail: `${org.display_name} is ready.`, done: true },
    {
      title: "Install the OpenFlows GitHub App",
      detail: canAdminister(role) ? "Choose the repositories OpenFlows may work with." : "An organisation admin needs to install the GitHub App.",
      done: connected, href: `/o/${org.slug}/github`, cta: canAdminister(role) ? "Connect GitHub" : "View status",
    },
    {
      title: "Create your first tenant",
      detail: "Pick a connected repository and start an OpenFlows runtime.",
      done: hasTenant, href: `/o/${org.slug}/tenants/new`, cta: canOperate(role) ? "Create tenant" : "View tenants", blocked: !connected,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (!loading && doneCount === steps.length) return null; // setup complete: the dashboard speaks for itself

  return (
    <Card>
      <CardHeader title="Get started" description={`${doneCount} of ${steps.length} steps complete`} />
      <div className="px-5 pt-4" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount} aria-label="Setup progress">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
      </div>
      <ol className="divide-y divide-border">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-center gap-4 px-5 py-4">
            <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${s.done ? "bg-success text-on-primary" : "border border-border-strong text-muted"}`}>{s.done ? "✓" : i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{s.title}<span className="sr-only">{s.done ? " (complete)" : ""}</span></p>
              <p className="text-sm text-muted">{s.detail}</p>
            </div>
            {s.blocked && !s.done ? <Badge>Connect GitHub first</Badge> : null}
            {!s.done && !s.blocked && s.href && !loading ? <Link href={s.href} className="shrink-0 text-sm font-medium text-primary hover:underline">{s.cta}</Link> : null}
          </li>
        ))}
      </ol>
    </Card>
  );
}
