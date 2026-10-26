// ConsoleShell: signed-in application frame. Left sidebar (logo, organisation
// switcher, grouped navigation, role badge) on desktop; a slide-in drawer on
// small screens. The top bar carries breadcrumbs, a primary "Create tenant"
// shortcut for operators, and the account menu. The Platform link appears only
// when Manager grants the platform overview, so ordinary users never see it.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";

import { usePlatformOverview } from "@/lib/client/queries";
import { canOperate, ROLE_LABEL } from "@/lib/manager/contract";

import { OrgStatusBanner } from "../org-status-banner";
import { LinkButton } from "../ui/button";
import { Logo } from "../ui/logo";
import { Badge } from "../ui/primitives";
import { useConsole } from "./console-context";
import { OrgSwitcher } from "./org-switcher";
import { UserMenu } from "./user-menu";

const ICONS: Record<string, string> = {
  overview: "M3 10.5 10 4l7 6.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1v-5.5Z",
  tenants: "M3 4h6v6H3V4Zm8 0h6v6h-6V4ZM3 12h6v4H3v-4Zm8 0h6v4h-6v-4Z",
  activity: "M3 10h3l2-5 4 10 2-5h3",
  github: "M7 3h2v4h2V3h2v4h1v3a4 4 0 0 1-3 3.9V17H9v-3.1A4 4 0 0 1 6 10V7h1V3Z",
  members: "M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM2 16c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5H2Zm10.5 0c0-1.6-.5-2.9-1.4-3.8.6-.3 1.2-.4 1.9-.4 2.2 0 4 1.4 4 4.2h-4.5Z",
  settings: "M10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm-1-4h2l.4 1.800 1.300.6 1.600-1 1.400 1.400-1 1.600.6 1.300L17 9v2l-1.700.4-.6 1.300 1 1.600-1.400 1.400-1.600-1-1.300.6L11 17H9l-.4-1.700-1.300-.6-1.600 1-1.400-1.400 1-1.600-.6-1.300L3 11V9l1.800-.4.6-1.300-1-1.600L5.800 4.300l1.600 1 1.300-.6L9 3Z",
  help: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm-.8 10.5v-1.4h1.600v1.400H9.200Zm.8-7a2.600 2.600 0 0 1 1.300 4.800c-.4.300-.5.500-.5.900H9.300c0-1 .4-1.500 1-1.900.4-.3.600-.5.600-.9a.9.9 0 0 0-1.800 0H7.500A2.500 2.500 0 0 1 10 6.500Z",
  platform: "M10 2 3 5v5c0 3.5 3 6.5 7 8 4-1.5 7-4.5 7-8V5l-7-3Z",
};

function NavLink({ href, label, icon, exact }: Readonly<{ href: string; label: string; icon: keyof typeof ICONS; exact?: boolean }>) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
        active ? "bg-surface-muted text-foreground" : "text-muted hover:bg-surface-muted/60 hover:text-foreground"
      }`}
    >
      {active ? <span aria-hidden className="absolute -left-3 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent" /> : null}
      <svg aria-hidden viewBox="0 0 20 20" className={`h-4 w-4 ${active ? "text-accent" : ""}`} fill={icon === "activity" ? "none" : "currentColor"} stroke={icon === "activity" ? "currentColor" : "none"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[icon]} /></svg>
      {label}
    </Link>
  );
}

const SECTION_LABELS: Record<string, string> = {
  tenants: "Tenants", activity: "Activity", github: "GitHub", members: "Members", settings: "Settings", help: "Help", operations: "Operation", new: "New",
};

function Breadcrumbs() {
  const { org } = useConsole();
  const pathname = usePathname();
  const parts = pathname.replace(`/o/${org.slug}`, "").split("/").filter(Boolean);
  const crumbs = [{ label: org.display_name, href: `/o/${org.slug}` }];
  let acc = `/o/${org.slug}`;
  parts.forEach((p, i) => {
    acc += `/${p}`;
    const label = SECTION_LABELS[p] ?? (i === 0 ? p : "Details");
    crumbs.push({ label, href: acc });
  });
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex min-w-0 items-center gap-1.5">
          {i > 0 ? <span aria-hidden className="text-subtle">/</span> : null}
          {i === crumbs.length - 1 ? <span aria-current="page" className="truncate font-medium">{c.label}</span> : <Link href={c.href} className="truncate text-muted hover:text-foreground">{c.label}</Link>}
        </span>
      ))}
    </nav>
  );
}

export function ConsoleShell({ children }: Readonly<{ children: ReactNode }>) {
  const { org, role } = useConsole();
  const [drawer, setDrawer] = useState(false);
  const platform = usePlatformOverview();
  const base = `/o/${org.slug}`;

  const sidebar = (
    <div className="flex h-full flex-col gap-5 p-3">
      <Link href={base} className="flex items-center gap-2.5 px-2 pt-1 text-sm font-semibold tracking-tight">
        <Logo size={28} className="rounded-lg" />
        OpenFlows
      </Link>
      <OrgSwitcher />
      <nav aria-label="Primary" className="flex flex-col gap-5">
        <div className="flex flex-col gap-0.5">
          <p className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-subtle">Workspace</p>
          <NavLink href={base} label="Overview" icon="overview" exact />
          <NavLink href={`${base}/tenants`} label="Tenants" icon="tenants" />
          <NavLink href={`${base}/activity`} label="Activity" icon="activity" />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-subtle">Organisation</p>
          <NavLink href={`${base}/github`} label="GitHub" icon="github" />
          <NavLink href={`${base}/members`} label="Members" icon="members" />
          <NavLink href={`${base}/settings`} label="Settings" icon="settings" />
          <NavLink href={`${base}/help`} label="Help" icon="help" />
        </div>
        {platform.data ? (
          <div className="flex flex-col gap-0.5">
            <p className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-subtle">Platform</p>
            <NavLink href="/platform" label="Platform" icon="platform" />
          </div>
        ) : null}
      </nav>
      <div className="mt-auto flex items-center gap-2 px-2 text-xs text-muted">
        Your role <Badge tone={role === "viewer" ? "neutral" : "info"}>{ROLE_LABEL[role]}</Badge>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-surface md:block">{sidebar}</aside>

      {drawer ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-border bg-surface" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setDrawer(false); }}>{sidebar}</aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-canvas/85 px-4 backdrop-blur md:px-8">
          <button type="button" aria-label="Open menu" className="rounded-lg p-2 hover:bg-surface-muted md:hidden" onClick={() => setDrawer(true)}>
            <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" /></svg>
          </button>
          <Breadcrumbs />
          <div className="ml-auto flex items-center gap-3">
            {canOperate(role) ? <span className="hidden sm:block"><LinkButton href={`${base}/tenants/new`} variant="primary">New tenant</LinkButton></span> : null}
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8"><OrgStatusBanner />{children}</main>
      </div>
    </div>
  );
}
