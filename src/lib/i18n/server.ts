// Server-side locale access for Server Components and `generateMetadata`:
// reads the visitor's locale cookie (falling back to Accept-Language) and
// returns the matching dictionary. Reading request cookies/headers makes the
// calling route dynamic, which every Console route already is (session-based).
import { cookies, headers } from "next/headers";

import { type Locale, LOCALE_COOKIE, type Messages, messages, resolveLocale } from "./index";

export async function getLocale(): Promise<Locale> {
  const [jar, hdrs] = await Promise.all([cookies(), headers()]);
  return resolveLocale(jar.get(LOCALE_COOKIE)?.value, hdrs.get("accept-language"));
}

export async function getMessages(): Promise<{ locale: Locale; t: Messages }> {
  const locale = await getLocale();
  return { locale, t: messages(locale) };
}
