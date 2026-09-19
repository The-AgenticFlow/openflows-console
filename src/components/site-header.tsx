// SiteHeader: sticky top navigation bar with the app logo, primary nav links
// (highlighting the active route), and a mock-mode status indicator.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/tenants", label: "Tenants" },
  { href: "/kanban", label: "Kanban" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold tracking-tight text-foreground"
        >
          <span
            aria-hidden
            className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[13px] leading-none text-surface"
          >
            ◈
          </span>
          OpenFlows Console
        </Link>

        <nav aria-label="Primary" className="flex min-w-0 items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 text-xs text-muted">
          <span
            className="h-2 w-2 rounded-full bg-accent"
            aria-hidden
          />
          <span className="hidden sm:inline">Mock mode</span>
        </div>
      </div>
    </header>
  );
}
