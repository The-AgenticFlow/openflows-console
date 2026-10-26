// OrgSwitcher: menu-button listing the organisations the user belongs to, plus
// "Create organisation". Keyboard: Enter/Space/ArrowDown opens, Arrow keys
// move, Escape closes and returns focus to the trigger.
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useConsole } from "./console-context";

export function OrgSwitcher() {
  const { orgs, org } = useConsole();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    const onDown = (e: MouseEvent) => {
      if (!menu.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function onMenuKey(e: React.KeyboardEvent) {
    const items = [...(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
  }

  return (
    <div className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); } }}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface-muted"
      >
        <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent text-xs font-semibold text-on-primary">
          {org.display_name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{org.display_name}</span>
          <span className="block text-xs text-muted">Organisation</span>
        </span>
        <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 text-subtle" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="m6 8 4-3 4 3M6 12l4 3 4-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div
          ref={menu}
          role="menu"
          aria-label="Switch organisation"
          onKeyDown={onMenuKey}
          className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-border bg-surface p-1 shadow-lg"
        >
          {orgs.map((m) => (
            <Link
              key={m.organization_id}
              role="menuitem"
              href={`/o/${m.slug}`}
              onClick={() => setOpen(false)}
              aria-current={m.organization_id === org.organization_id ? "true" : undefined}
              className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm hover:bg-surface-muted focus:bg-surface-muted focus:outline-none"
            >
              <span className="truncate">{m.display_name}</span>
              <span className="ml-2 text-xs text-muted">{m.role}</span>
            </Link>
          ))}
          <div className="my-1 border-t border-border" />
          <Link role="menuitem" href="/orgs/new" onClick={() => setOpen(false)} className="block rounded-lg px-2.5 py-2 text-sm text-primary hover:bg-surface-muted focus:bg-surface-muted focus:outline-none">
            Create organisation
          </Link>
        </div>
      ) : null}
    </div>
  );
}
