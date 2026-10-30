// PrefsSwitch: compact language (EN / FR) and theme (system / light / dark)
// toggles for pages without the signed-in shell, such as sign-in. Uses the
// same cookie-backed preferences as the account menu, so a choice made before
// signing in carries into the Console.
"use client";

import { LOCALES } from "@/lib/i18n";
import { usePrefs } from "@/lib/preferences/client";
import { type ThemePref } from "@/lib/preferences/theme";

import { IconMonitor, IconMoon, IconSun } from "../ui/icons";

const ORDER: ThemePref[] = ["system", "light", "dark"];
const ICON = { system: IconMonitor, light: IconSun, dark: IconMoon } as const;

export function PrefsSwitch() {
  const { t, locale, setLocale, theme, setTheme } = usePrefs();
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  const Icon = ICON[theme];
  return (
    <div className="flex items-center gap-1">
      <div role="radiogroup" aria-label={t.language.label} className="flex rounded-lg border border-border p-0.5">
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={locale === l}
            lang={l}
            title={t.language[l]}
            onClick={() => setLocale(l)}
            className={`h-7 rounded-md px-2 text-xs font-medium uppercase transition-colors ${locale === l ? "bg-surface-muted text-foreground" : "text-muted hover:text-foreground"}`}
          >
            {l}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setTheme(next)}
        aria-label={`${t.theme.label}: ${t.theme[theme]}`}
        title={`${t.theme.label}: ${t.theme[theme]}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:text-foreground"
      >
        <Icon size={15} />
      </button>
    </div>
  );
}
