// Shared helpers for the end-to-end tests: sign a browser context in (the fake
// Manager treats the `of_session=e2e-session` cookie as a signed-in user) and
// the fixed identifiers of the fake Manager's fixtures. See
// e2e/support/fake-manager.mjs.
import type { BrowserContext } from "@playwright/test";

export const ORG_SLUG = "e2e";
export const TENANT_ID = "22222222-2222-4222-8222-222222222222";

const BASE = "http://127.0.0.1:3100";

export async function signIn(context: BrowserContext) {
  await context.addCookies([{ name: "of_session", value: "e2e-session", url: BASE }]);
}

export async function setLocale(context: BrowserContext, locale: "en" | "fr") {
  await context.addCookies([{ name: "of_locale", value: locale, url: BASE }]);
}
