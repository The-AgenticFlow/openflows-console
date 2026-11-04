// AccountPanel: the signed-in person's own settings, independent of which
// organisation is open. Sections: Profile (GitHub-backed identity, user ID for
// support), Preferences (theme and language, stored in cookies by
// PreferencesProvider), Coder account (link status and the link action; Manager
// returns only the account id and deployment URL, never a credential),
// Organisations (memberships with role, quick switch), and Session (sign out).
"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api, type ConsoleError } from "@/lib/client/api";
import { useCoderIdentity } from "@/lib/client/queries";
import { LOCALES } from "@/lib/i18n";
import { usePrefs } from "@/lib/preferences/client";
import { THEMES } from "@/lib/preferences/theme";

import { useConsole } from "./shell/console-context";
import { Button } from "./ui/button";
import { IconCheck, IconGithub, IconLogOut, IconMonitor, IconMoon, IconSun, IconTerminal } from "./ui/icons";
import { Avatar, Badge, ErrorNotice, Field, NotAvailable, SegmentedControl, SettingsSection, Skeleton } from "./ui/primitives";

const THEME_ICONS = { system: IconMonitor, light: IconSun, dark: IconMoon } as const;

export function AccountPanel() {
  const { user, orgs, org } = useConsole();
  const { t, locale, setLocale, theme, setTheme } = usePrefs();
  const router = useRouter();
  const coder = useCoderIdentity();
  const [signingOut, setSigningOut] = useState(false);
  const link = useMutation({ mutationFn: () => api.startCoderLink(), onSuccess: (r) => window.location.assign(r.authorization_url) });

  async function signOut() {
    setSigningOut(true);
    try { await api.signOut(); } catch { /* session may already be gone */ } finally { router.push("/login"); router.refresh(); }
  }

  return (
    <div className="space-y-6">
      <SettingsSection title={t.account.profile} description={t.account.profileBody}>
        <div className="mb-5 flex items-center gap-4">
          <Avatar name={user.display_name} size={56} />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{user.display_name}</p>
            <p className="flex items-center gap-1.5 text-sm text-muted"><IconGithub size={14} /> {t.account.signInGithub}</p>
          </div>
        </div>
        <dl className="divide-y divide-border">
          <Field label={t.account.displayName}>{user.display_name}</Field>
          <Field label={t.account.userId} copy={user.id} mono>{user.id}</Field>
          <Field label={t.account.status}><Badge dot tone={user.status === "active" ? "success" : "warning"}>{t.states[user.status] ?? user.status}</Badge></Field>
        </dl>
      </SettingsSection>

      <SettingsSection title={t.account.preferences} description={t.account.preferencesBody}>
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium">{t.theme.label}</p>
            <SegmentedControl
              label={t.theme.label}
              value={theme}
              onChange={setTheme}
              options={THEMES.map((v) => { const Icon = THEME_ICONS[v]; return { value: v, label: t.theme[v], icon: <Icon size={14} /> }; })}
            />
            <p className="mt-2 text-xs text-muted">{t.account.themeHint}</p>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">{t.language.label}</p>
            <SegmentedControl label={t.language.label} value={locale} onChange={setLocale} options={LOCALES.map((l) => ({ value: l, label: t.language[l] }))} />
            <p className="mt-2 text-xs text-muted">{t.account.languageHint}</p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title={t.account.coder} description={t.account.coderBody}>
        {coder.isPending ? <Skeleton className="h-10" /> : coder.error ? (
          <NotAvailable title={t.account.coder} description={t.account.coderUnavailable} />
        ) : !coder.data.configured ? (
          <p className="text-sm text-muted">{t.account.coderNotRequired}</p>
        ) : coder.data.account ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-success/25 bg-success-soft px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-on-primary"><IconCheck size={15} strokeWidth={2.5} /></span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{t.account.linked}</p>
                <p className="truncate text-xs text-muted">{t.account.linkedTo} <span className="font-mono">{coder.data.account.deployment}</span></p>
              </div>
            </div>
            <dl className="divide-y divide-border">
              <Field label={t.account.accountId} copy={coder.data.account.id} mono>{coder.data.account.id}</Field>
            </dl>
            <p className="text-xs text-muted">{t.account.noCredential}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-warning/25 bg-warning-soft px-4 py-3">
              <IconTerminal size={18} className="mt-0.5 text-warning" />
              <div>
                <p className="text-sm font-medium">{t.account.notLinked}</p>
                <p className="mt-0.5 text-sm text-muted">{t.account.coderPrompt}</p>
              </div>
            </div>
            {link.error ? <ErrorNotice error={link.error as ConsoleError} /> : null}
            <Button variant="primary" loading={link.isPending} onClick={() => link.mutate()}>{t.account.coderConnect}</Button>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title={t.account.orgs} description={t.account.orgsBody}>
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {orgs.map((o) => (
            <li key={o.organization_id} className="flex items-center gap-3 px-4 py-3">
              <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-accent to-[#2f8f68] text-xs font-semibold text-white">{o.display_name.slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{o.display_name}</p>
                <p className="font-mono text-xs text-subtle">/o/{o.slug}</p>
              </div>
              <Badge tone={o.role === "admin" ? "info" : "neutral"}>{t.roles[o.role]}</Badge>
              {o.organization_id === org.organization_id ? <Badge tone="success" dot>{t.account.current}</Badge> : (
                <Link href={`/o/${o.slug}`} className="text-sm font-medium text-muted transition-colors hover:text-foreground">{t.account.open}</Link>
              )}
            </li>
          ))}
        </ul>
      </SettingsSection>

      <SettingsSection title={t.account.session} description={t.account.sessionBody}>
        <Button loading={signingOut} onClick={() => void signOut()}><IconLogOut size={15} /> {t.account.signOut}</Button>
      </SettingsSection>
    </div>
  );
}
