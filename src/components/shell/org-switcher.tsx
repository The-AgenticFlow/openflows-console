// OrgSwitcher: menu-button listing the organisations the user belongs to, plus
// "Create organisation". Keyboard: Enter/Space/ArrowDown opens, Arrow keys
// move, Escape closes and returns focus to the trigger. Labels follow the
// active language; role names use the translated role labels.
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useT } from "@/lib/preferences/client";

import { IconCheck, IconChevronsUpDown, IconPlus } from "../ui/icons";
import { useConsole } from "./console-context";

export function OrgSwitcher() {
  const { orgs, org } = useConsole();
  const { t } = useT();
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
        className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-left transition-colors hover:border-border-strong hover:bg-surface-muted"
      >
        <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-accent to-[#2f8f68] text-xs font-semibold text-on-primary shadow-inner">
          {org.display_name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{org.display_name}</span>
          <span className="block text-xs text-muted">{t.orgSwitcher.organisation}</span>
        </span>
        <IconChevronsUpDown size={14} className="text-subtle" />
      </button>
      {open ? (
        <div
          ref={menu}
          role="menu"
          aria-label={t.orgSwitcher.switch}
          onKeyDown={onMenuKey}
          className="absolute left-0 right-0 top-full z-30 mt-1.5 origin-top animate-pop rounded-xl border border-border-strong bg-surface-raised p-1 shadow-2xl shadow-shadow"
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
              <span className="flex min-w-0 items-center gap-2">
                <span aria-hidden className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-surface-muted text-[10px] font-semibold">{m.display_name.slice(0, 1).toUpperCase()}</span>
                <span className="truncate">{m.display_name}</span>
              </span>
              <span className="ml-2 flex items-center gap-1.5 text-xs text-muted">
                {t.roles[m.role]}
                {m.organization_id === org.organization_id ? <IconCheck size={13} className="text-accent" /> : null}
              </span>
            </Link>
          ))}
          <div className="my-1 border-t border-border" />
          <Link role="menuitem" href="/orgs/new" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted hover:bg-surface-muted hover:text-foreground focus:bg-surface-muted focus:text-foreground focus:outline-none">
            <IconPlus size={14} /> {t.orgSwitcher.create}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
