// Locale model shared by server and client: supported locales, the cookie that
// remembers the visitor's choice, dictionary lookup, and small formatting
// helpers built on Intl (dates, relative time) so no date strings are
// hand-translated. Locale resolution order: explicit cookie, then the
// browser's Accept-Language, then English.
import { en, type Messages } from "./en";
import { fr } from "./fr";

export type Locale = "en" | "fr";
export const LOCALES: Locale[] = ["en", "fr"];
export const LOCALE_COOKIE = "of_locale";

const DICTS: Record<Locale, Messages> = { en, fr };

export const messages = (locale: Locale): Messages => DICTS[locale];

export function isLocale(v: string | undefined | null): v is Locale {
  return v === "en" || v === "fr";
}

/** Cookie first, then the first supported Accept-Language entry, then English. */
export function resolveLocale(cookie: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookie)) return cookie;
  for (const part of (acceptLanguage ?? "").split(",")) {
    const tag = part.trim().slice(0, 2).toLowerCase();
    if (isLocale(tag)) return tag;
  }
  return "en";
}

/** "{text}"-style placeholder substitution for the few templated strings. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");
}

/** Localised relative time ("3 minutes ago" / "il y a 3 minutes"). */
export function relativeTime(iso: string | null | undefined, locale: Locale, t: Messages, now = Date.now()): string {
  if (!iso) return t.time.never;
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  if (Math.abs(seconds) < 45) return t.time.justNow;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size || unit === "minute") return rtf.format(Math.round(seconds / size), unit);
  }
  return t.time.justNow;
}

/** Localised absolute date and time, for tooltips and detail rows. */
export function formatDateTime(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

/** Translated [message, recovery] for a Manager error code, or null when unknown. */
export function errorCopy(t: Messages, code: string | null | undefined): { message: string; recovery?: string } | null {
  const entry = code ? t.errors[code] : undefined;
  if (!entry) return null;
  if (typeof entry === "string") return { message: entry };
  return { message: entry[0], recovery: entry[1] || undefined };
}

export type { Messages };
