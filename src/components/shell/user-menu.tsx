// UserMenu: avatar button with a small menu (account settings, sign out).
// Keyboard: Enter/Space/ArrowDown opens, arrows move, Escape closes and
// returns focus. Sign-out calls Manager's logout then returns to /login.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/client/api";

import { Avatar } from "../ui/primitives";
import { useConsole } from "./console-context";

export function UserMenu() {
  const { user, org } = useConsole();
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
    const items = [...(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
  }

  async function signOut() {
    setBusy(true);
    try { await api.signOut(); } catch { /* session may already be gone */ } finally { router.push("/login"); router.refresh(); }
  }

  return (
    <div className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); } }}
        className="flex items-center gap-2 rounded-full p-0.5 pr-2.5 hover:bg-surface-muted"
      >
        <Avatar name={user.display_name} size={28} />
        <span className="hidden max-w-32 truncate text-sm sm:inline">{user.display_name}</span>
      </button>
      {open ? (
        <div ref={menu} role="menu" aria-label="Account" onKeyDown={onKey} className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-border bg-surface p-1 shadow-2xl shadow-black/50">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{user.display_name}</p>
            <p className="text-xs text-muted">Signed in with GitHub</p>
          </div>
          <div className="my-1 border-t border-border" />
          <Link role="menuitem" href={`/o/${org.slug}/settings`} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-surface-muted focus:bg-surface-muted focus:outline-none">Settings</Link>
          <button role="menuitem" type="button" onClick={() => void signOut()} disabled={busy} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-muted focus:bg-surface-muted focus:outline-none disabled:opacity-50">
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
