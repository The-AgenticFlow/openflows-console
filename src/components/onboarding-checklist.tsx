// OnboardingChecklist: the ordered steps to a first tenant. Completion is
// derived from Manager state (GitHub connection, tenants), never stored
// client-side. A step whose prerequisite is unmet is shown as blocked. Text
// follows the active language.
"use client";

import Link from "next/link";

import { useConnections, useTenants } from "@/lib/client/queries";
import { canAdminister, canOperate } from "@/lib/manager/contract";
import { useT } from "@/lib/preferences/client";

import { useConsole } from "./shell/console-context";
import { IconArrowRight, IconCheck } from "./ui/icons";
import { Badge, Card, CardHeader } from "./ui/primitives";

interface Step { title: string; detail: string; done: boolean; href?: string; cta?: string; blocked?: boolean }

export function OnboardingChecklist() {
  const { org, orgId, role } = useConsole();
  const { t } = useT();
  const c = t.checklist;
  const conns = useConnections(orgId);
  const tenants = useTenants(orgId);
  const connected = !!conns.data?.items.some((c) => c.status === "active");
  const hasTenant = (tenants.data?.items.length ?? 0) > 0;
  const loading = conns.isPending || tenants.isPending;

  const steps: Step[] = [
    { title: c.signIn, detail: c.signInDone, done: true },
    { title: c.createOrg, detail: c.createOrgDone(org.display_name), done: true },
    {
      title: c.installApp,
      detail: canAdminister(role) ? c.installAppAdmin : c.installAppOther,
      done: connected, href: `/o/${org.slug}/github`, cta: canAdminister(role) ? c.connectGithub : c.viewStatus,
    },
    {
      title: c.firstTenant,
      detail: c.firstTenantBody,
      done: hasTenant, href: `/o/${org.slug}/tenants/new`, cta: canOperate(role) ? c.createTenant : c.viewTenants, blocked: !connected,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (!loading && doneCount === steps.length) return null; // setup complete: the dashboard speaks for itself

  return (
    <Card>
      <CardHeader title={c.title} description={c.progress(doneCount, steps.length)} />
      <div className="px-5 pt-4" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount} aria-label={t.onboarding.progress}>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-gradient-to-r from-accent to-[#7fd3ae] transition-[width] duration-700 ease-out" style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
      </div>
      <ol className="divide-y divide-border">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-center gap-4 px-5 py-4">
            <span aria-hidden className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${s.done ? "bg-accent text-on-primary shadow-[0_0_14px_rgba(76,184,138,0.35)]" : "border border-border-strong bg-surface-raised text-muted"}`}>{s.done ? <IconCheck size={14} strokeWidth={2.5} /> : i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${s.done ? "text-muted line-through decoration-border-strong" : ""}`}>{s.title}<span className="sr-only">{s.done ? ` (${c.complete})` : ""}</span></p>
              <p className="text-sm text-muted">{s.detail}</p>
            </div>
            {s.blocked && !s.done ? <Badge>{c.connectFirst}</Badge> : null}
            {!s.done && !s.blocked && s.href && !loading ? <Link href={s.href} className="group inline-flex shrink-0 items-center gap-1 rounded-lg border border-border-strong bg-surface-raised px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-muted">{s.cta} <IconArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" /></Link> : null}
          </li>
        ))}
      </ol>
    </Card>
  );
}
