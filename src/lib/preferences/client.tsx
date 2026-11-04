// PreferencesProvider: the visitor's language and theme on the client.
//
// Both choices live in first-party cookies (`of_locale`, `of_theme`, one year,
// SameSite=Lax) so the server renders the right language and theme on the
// first byte, with no flash. Changing the language refreshes server data so
// Server Components re-render in the new language; changing the theme only
// updates the <html data-theme> attribute ("system" removes it and lets the
// CSS media query decide). Neither cookie is security-sensitive.
"use client";

import { useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

import { type Locale, LOCALE_COOKIE, type Messages, messages } from "../i18n";
import { THEME_COOKIE, type ThemePref } from "./theme";

interface Prefs {
  locale: Locale;
  t: Messages;
  setLocale: (l: Locale) => void;
  theme: ThemePref;
  setTheme: (t: ThemePref) => void;
}

const Ctx = createContext<Prefs | null>(null);

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function PreferencesProvider({ locale: initialLocale, theme: initialTheme, children }: Readonly<{ locale: Locale; theme: ThemePref; children: ReactNode }>) {
  const router = useRouter();
  const [locale, setLocaleState] = useState(initialLocale);
  const [theme, setThemeState] = useState(initialTheme);

  const setLocale = useCallback((l: Locale) => {
    writeCookie(LOCALE_COOKIE, l);
    setLocaleState(l);
    document.documentElement.lang = l;
    router.refresh();
  }, [router]);

  const setTheme = useCallback((t: ThemePref) => {
    writeCookie(THEME_COOKIE, t);
    setThemeState(t);
    const root = document.documentElement;
    if (t === "system") delete root.dataset.theme;
    else root.dataset.theme = t;
  }, []);

  const value = useMemo(() => ({ locale, t: messages(locale), setLocale, theme, setTheme }), [locale, setLocale, theme, setTheme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs(): Prefs {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePrefs must be used inside PreferencesProvider");
  return v;
}

/** Shorthand for components that only need strings and the locale. */
export function useT(): { t: Messages; locale: Locale } {
  const { t, locale } = usePrefs();
  return { t, locale };
}
