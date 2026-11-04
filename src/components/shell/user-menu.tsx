// UserMenu: avatar button with the account menu: who is signed in, links to
// account and organisation settings and help, quick theme (system / light /
// dark) and language (English / Français) switches, and sign out. Keyboard:
// Enter/Space/ArrowDown opens, arrows move between items, Escape closes and
// returns focus. Sign-out calls Manager's logout then returns to /login.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/client/api";
import { LOCALES } from "@/lib/i18n";
import { usePrefs } from "@/lib/preferences/client";
import { type ThemePref } from "@/lib/preferences/theme";

import { IconHelp, IconLogOut, IconMonitor, IconMoon, IconSettings, IconSun, IconUser } from "../ui/icons";
import { Avatar } from "../ui/primitives";
import { useConsole } from "./console-context";

const THEME_ICONS = { system: IconMonitor, light: IconSun, dark: IconMoon } as const;

export function UserMenu() {
  const { user, org } = useConsole();
  const { t, locale, setLocale, theme, setTheme } = usePrefs();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
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

  function onKey(e: React.KeyboardEvent) {
    const items = [...(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem],[role=menuitemradio]") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
  }

  async function signOut() {
    setBusy(true);
    try { await api.signOut(); } catch { /* session may already be gone */ } finally { router.push("/login"); router.refresh(); }
  }

  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-surface-muted hover:text-foreground focus:bg-surface-muted focus:text-foreground focus:outline-none";
  const chip = (active: boolean) => `flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${active ? "bg-surface text-foreground shadow-sm shadow-shadow ring-1 ring-border" : "text-muted hover:text-foreground"}`;

  return (
    <div className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.userMenu.label}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); } }}
        className="flex items-center gap-2 rounded-full p-0.5 pr-2.5 transition-colors hover:bg-surface-muted"
      >
        <Avatar name={user.display_name} size={28} />
        <span className="hidden max-w-32 truncate text-sm sm:inline">{user.display_name}</span>
      </button>
      {open ? (
        <div ref={menu} role="menu" aria-label={t.userMenu.label} onKeyDown={onKey} className="absolute right-0 top-full z-30 mt-2 w-72 origin-top-right animate-pop rounded-xl border border-border-strong bg-surface-raised p-1 shadow-2xl shadow-shadow">
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <Avatar name={user.display_name} size={34} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.display_name}</p>
              <p className="text-xs text-muted">{t.userMenu.signedInWithGithub}</p>
            </div>
          </div>
          <div className="my-1 border-t border-border" />
          <Link role="menuitem" href={`/o/${org.slug}/account`} onClick={() => setOpen(false)} className={item}><IconUser size={15} /> {t.userMenu.account}</Link>
          <Link role="menuitem" href={`/o/${org.slug}/settings`} onClick={() => setOpen(false)} className={item}><IconSettings size={15} /> {t.userMenu.orgSettings}</Link>
          <Link role="menuitem" href={`/o/${org.slug}/help`} onClick={() => setOpen(false)} className={item}><IconHelp size={15} /> {t.userMenu.help}</Link>
          <div className="my-1 border-t border-border" />

          <div className="px-3 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">{t.theme.label}</div>
          <div role="group" aria-label={t.theme.label} className="mx-2 mb-2 flex gap-1 rounded-lg bg-surface-muted p-0.5">
            {(["system", "light", "dark"] as ThemePref[]).map((v) => {
              const Icon = THEME_ICONS[v];
              return (
                <button key={v} type="button" role="menuitemradio" aria-checked={theme === v} onClick={() => setTheme(v)} className={chip(theme === v)}>
                  <Icon size={13} /> {t.theme[v]}
                </button>
              );
            })}
          </div>
          <div className="px-3 pb-1 pt-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">{t.language.label}</div>
          <div role="group" aria-label={t.language.label} className="mx-2 mb-2 flex gap-1 rounded-lg bg-surface-muted p-0.5">
            {LOCALES.map((l) => (
              <button key={l} type="button" role="menuitemradio" aria-checked={locale === l} lang={l} onClick={() => setLocale(l)} className={chip(locale === l)}>
                {t.language[l]}
              </button>
            ))}
          </div>

          <div className="my-1 border-t border-border" />
          <button role="menuitem" type="button" onClick={() => void signOut()} disabled={busy} className={`${item} disabled:opacity-50`}>
            <IconLogOut size={15} />
            {busy ? t.userMenu.signingOut : t.userMenu.signOut}
          </button>
        </div>
      ) : null}
    </div>
  );
}
