// Tenant page: what the agents are doing. A failed agent shows a plain
// explanation chosen from Manager's stable error code (never the provider's raw
// text), in the visitor's language, and the notification bell raises an alert.
import { expect, test } from "@playwright/test";

import { ORG_SLUG, setLocale, signIn, TENANT_ID } from "../fixtures";

const TENANT_URL = `/o/${ORG_SLUG}/tenants/${TENANT_ID}`;

test.beforeEach(async ({ context }) => signIn(context));

test("shows each agent and explains a usage-limit failure", async ({ page }) => {
  await page.goto(TENANT_URL);
  await expect(page.getByRole("heading", { name: "finewa" })).toBeVisible();
  await expect(page.getByText("Agent activity")).toBeVisible();

  const failed = page.getByRole("listitem").filter({ hasText: "T-CI-001" });
  await expect(failed.getByText("Failed")).toBeVisible();
  await expect(failed.getByRole("alert")).toContainText("credit or usage limit reached");

  const running = page.getByRole("listitem").filter({ hasText: "T-API-002" });
  await expect(running.getByText("Working")).toBeVisible();
  await expect(running.getByRole("alert")).toHaveCount(0);
});

test("the same failure is explained in French", async ({ page, context }) => {
  await setLocale(context, "fr");
  await page.goto(TENANT_URL);
  await expect(page.getByText("Activité des agents")).toBeVisible();
  const failed = page.getByRole("listitem").filter({ hasText: "T-CI-001" });
  await expect(failed.getByText("Échec")).toBeVisible();
  await expect(failed.getByRole("alert")).toContainText("crédit ou limite d’usage atteint");
});

test("the notification bell alerts about the failed agent", async ({ page }) => {
  await page.goto(`/o/${ORG_SLUG}`);
  await page.getByRole("button", { name: /Notifications/ }).click();
  await expect(page.getByText(/1 agent failed/)).toBeVisible();
});
