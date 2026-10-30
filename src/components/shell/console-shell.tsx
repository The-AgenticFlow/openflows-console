// ConsoleShell: signed-in application frame. Left sidebar (logo, organisation
// switcher, grouped navigation, account entry and role badge) on desktop; a
// slide-in drawer on small screens. The desktop sidebar collapses to an icon
// rail; that choice is a per-browser convenience kept in localStorage
// (`of_sidebar_collapsed`) and the page renders correctly without it. The top
// bar carries breadcrumbs, a primary "New tenant" shortcut for operators, and
// a notification bell with alerts derived from Manager state, and the account
// menu (which also switches theme and language). The Platform link
// appears only when Manager grants the platform overview, so ordinary users
// never see it. Page content re-runs its entrance animation on each route
// change (keyed by pathname). All labels follow the active language.
// Navigation items carry `data-tour` ids that the first-run GuidedTour points at.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentType, type ReactNode, useEffect, useState, useSyncExternalStore } from "react";

import { usePlatformOverview } from "@/lib/client/queries";
import { canOperate } from "@/lib/manager/contract";
import { useT } from "@/lib/preferences/client";

import { GuidedTour } from "../guided-tour";
import { OrgStatusBanner } from "../org-status-banner";
import { LinkButton } from "../ui/button";
import {
  IconActivity, IconBoxes, IconGithub, IconHelp, IconHome, IconMenu, IconPanelLeft, IconPlus, IconSettings, IconShield, IconUser, IconUsers,
} from "../ui/icons";
import { Logo } from "../ui/logo";
import { Badge } from "../ui/primitives";
import { useConsole } from "./console-context";
import { NotificationBell } from "./notifications";
import { OrgSwitcher } from "./org-switcher";
import { UserMenu } from "./user-menu";

type IconComponent = ComponentType<{ size?: number; className?: string }>;

const ICONS: Record<string, IconComponent> = {
  overview: IconHome,
  tenants: IconBoxes,
  activity: IconActivity,
  github: IconGithub,
  members: IconUsers,
  settings: IconSettings,
  help: IconHelp,
  account: IconUser,
  platform: IconShield,
};

const COLLAPSE_KEY = "of_sidebar_collapsed";
const COLLAPSE_EVENT = "of:sidebar";

// Sidebar preference as an external store, so it is read without a
// setState-in-effect and the server render (always expanded) stays stable.
function readCollapsed() {
  try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; /* storage blocked: stay expanded */ }
}
function subscribeCollapsed(onChange: () => void) {
  window.addEventListener(COLLAPSE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => { window.removeEventListener(COLLAPSE_EVENT, onChange); window.removeEventListener("storage", onChange); };
}

function NavLink({ href, label, icon, exact, collapsed }: Readonly<{ href: string; label: string; icon: keyof typeof ICONS; exact?: boolean; collapsed?: boolean }>) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const Icon = ICONS[icon];
  return (
    <Link
      href={href}
      data-tour={icon}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={`group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium transition-colors duration-150 ${collapsed ? "justify-center" : ""} ${
        active ? "bg-hover-strong text-foreground" : "text-muted hover:bg-hover hover:text-foreground"
      }`}
    >
      {active ? <span aria-hidden className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent shadow-[0_0_12px_var(--accent)]" /> : null}
      <Icon size={17} className={`transition-colors ${active ? "text-accent" : "text-subtle group-hover:text-muted"}`} />
      <span className={collapsed ? "sr-only" : "truncate"}>{label}</span>
    </Link>
  );
}

function NavGroup({ label, collapsed, children }: Readonly<{ label: string; collapsed: boolean; children: ReactNode }>) {
  return (
    <div className="flex flex-col gap-0.5">
      {collapsed ? <div aria-hidden className="mx-2.5 mb-1.5 border-t border-border" /> : <p className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">{label}</p>}
      {children}
    </div>
  );
}

function Breadcrumbs() {
  const { org } = useConsole();
  const { t } = useT();
  const pathname = usePathname();
  const labels: Record<string, string> = {
    tenants: t.nav.tenants, activity: t.nav.activity, github: t.nav.github, members: t.nav.members, settings: t.nav.settings,
    help: t.nav.help, account: t.nav.account, operations: t.nav.operation, new: t.nav.new,
  };
  const parts = pathname.replace(`/o/${org.slug}`, "").split("/").filter(Boolean);
  const crumbs = [{ label: org.display_name, href: `/o/${org.slug}` }];
  let acc = `/o/${org.slug}`;
  parts.forEach((p, i) => {
    acc += `/${p}`;
    crumbs.push({ label: labels[p] ?? (i === 0 ? p : t.nav.details), href: acc });
  });
  return (
    <nav aria-label={t.nav.breadcrumb} className="flex min-w-0 items-center gap-1.5 text-sm">
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex min-w-0 items-center gap-1.5">
          {i > 0 ? <span aria-hidden className="text-border-strong">/</span> : null}
          {i === crumbs.length - 1 ? <span aria-current="page" className="truncate font-medium">{c.label}</span> : <Link href={c.href} className="truncate text-muted transition-colors hover:text-foreground">{c.label}</Link>}
        </span>
      ))}
    </nav>
  );
}

export function ConsoleShell({ children }: Readonly<{ children: ReactNode }>) {
  const { org, role } = useConsole();
  const { t } = useT();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const platform = usePlatformOverview();
  const base = `/o/${org.slug}`;

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawer(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer]);

  function toggleCollapsed() {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? "0" : "1"); } catch { /* storage blocked: preference not kept */ }
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  }

  const sidebar = (rail: boolean) => (
    <div className="flex h-full flex-col gap-5 p-3">
      <div className={`flex items-center gap-2 pt-1 ${rail ? "flex-col" : "px-1"}`}>
        <Link href={base} className="flex min-w-0 flex-1 items-center gap-2.5 text-sm font-semibold tracking-tight">
          <Logo size={28} className="rounded-lg" />
          {rail ? null : <span className="truncate">OpenFlows</span>}
        </Link>
      </div>
      {rail ? null : <OrgSwitcher />}
      <nav aria-label={t.nav.primary} className="flex flex-col gap-5">
        <NavGroup label={t.nav.workspace} collapsed={rail}>
          <NavLink href={base} label={t.nav.overview} icon="overview" exact collapsed={rail} />
          <NavLink href={`${base}/tenants`} label={t.nav.tenants} icon="tenants" collapsed={rail} />
          <NavLink href={`${base}/activity`} label={t.nav.activity} icon="activity" collapsed={rail} />
        </NavGroup>
        <NavGroup label={t.nav.organisation} collapsed={rail}>
          <NavLink href={`${base}/github`} label={t.nav.github} icon="github" collapsed={rail} />
          <NavLink href={`${base}/members`} label={t.nav.members} icon="members" collapsed={rail} />
          <NavLink href={`${base}/settings`} label={t.nav.settings} icon="settings" collapsed={rail} />
        </NavGroup>
        {platform.data ? (
          <NavGroup label={t.nav.platform} collapsed={rail}>
            <NavLink href="/platform" label={t.nav.platform} icon="platform" collapsed={rail} />
          </NavGroup>
        ) : null}
      </nav>
      <div className="mt-auto flex flex-col gap-0.5">
        <NavLink href={`${base}/help`} label={t.nav.help} icon="help" collapsed={rail} />
        <NavLink href={`${base}/account`} label={t.nav.account} icon="account" collapsed={rail} />
        {rail ? null : (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-surface-muted/60 px-3 py-2 text-xs text-muted">
            <span>{t.nav.role}</span>
            <Badge tone={role === "viewer" ? "neutral" : "info"}>{t.roles[role]}</Badge>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 border-r border-border bg-surface/70 transition-[width] duration-300 ease-out md:block ${collapsed ? "w-[68px]" : "w-64"}`}
      >
        {sidebar(collapsed)}
      </aside>

      {drawer ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label={t.nav.navigation}>
          <button type="button" aria-label={t.nav.closeMenu} className="absolute inset-0 animate-fade bg-overlay backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside
            className="absolute inset-y-0 left-0 w-72 animate-[drawer-in_280ms_var(--ease-out)_both] border-r border-border bg-surface"
            onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setDrawer(false); }}
          >
            {sidebar(false)}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-canvas/80 px-4 backdrop-blur-xl md:px-6">
          <button type="button" aria-label={t.nav.openMenu} className="-ml-1 rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-foreground md:hidden" onClick={() => setDrawer(true)}>
            <IconMenu size={18} />
          </button>
          <button
            type="button"
            aria-label={collapsed ? t.nav.expandSidebar : t.nav.collapseSidebar}
            aria-pressed={collapsed}
            title={collapsed ? t.nav.expandSidebar : t.nav.collapseSidebar}
            onClick={toggleCollapsed}
            className="-ml-1.5 hidden rounded-lg p-2 text-subtle transition-colors hover:bg-surface-muted hover:text-foreground md:inline-flex"
          >
            <IconPanelLeft size={17} />
          </button>
          <span aria-hidden className="hidden h-5 w-px bg-border md:block" />
          <Breadcrumbs />
          <div className="ml-auto flex items-center gap-2.5">
            {canOperate(role) ? (
              <span data-tour="new-tenant" className="hidden sm:block">
                <LinkButton href={`${base}/tenants/new`} variant="primary"><IconPlus size={15} /> {t.nav.newTenant}</LinkButton>
              </span>
            ) : null}
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8 md:py-10">
          <OrgStatusBanner />
          <div key={pathname}>{children}</div>
        </main>
      </div>
      <GuidedTour />
    </div>
  );
}
