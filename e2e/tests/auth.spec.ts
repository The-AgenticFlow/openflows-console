// Sign-in gate: a signed-out visitor never sees an organisation page and lands
// on the sign-in page, which offers GitHub sign-in and can be switched to French.
import { expect, test } from "@playwright/test";

import { ORG_SLUG, setLocale } from "../fixtures";

test("a signed-out visitor is sent to the sign-in page", async ({ page }) => {
  await page.goto(`/o/${ORG_SLUG}`);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in to OpenFlows" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue with GitHub" })).toHaveAttribute("href", /^\/auth\/github\/start/);
});

test("the sign-in page follows the chosen language", async ({ page, context }) => {
  await setLocale(context, "fr");
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Connexion à OpenFlows" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Continuer avec GitHub/ })).toBeVisible();
});
