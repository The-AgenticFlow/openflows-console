// Invitation page: where an invitation link lands. A signed-out visitor is sent
// through GitHub sign-in with the link preserved; a signed-in invitee sees what
// the invitation offers and can accept it; an unusable link explains why it
// might not work without revealing which reason applies.
import { expect, test } from "@playwright/test";

import { signIn } from "../fixtures";

test("signed out, the invitation link survives sign-in", async ({ page }) => {
  await page.goto("/invitations/accept?token=good-token");
  await expect(page).toHaveURL(/\/auth\/github\/start\?next=/);
  const next = new URL(page.url()).searchParams.get("next");
  expect(next).toBe("/invitations/accept?token=good-token");
});

test("a link without a token says it is incomplete", async ({ page, context }) => {
  await signIn(context);
  await page.goto("/invitations/accept");
  await expect(page.getByText("This link is incomplete")).toBeVisible();
});

test("an unusable invitation lists the possible reasons", async ({ page, context }) => {
  await signIn(context);
  await page.goto("/invitations/accept?token=wrong-token");
  await expect(page.getByText("This invitation can't be used")).toBeVisible();
  await expect(page.getByText(/different GitHub account/)).toBeVisible();
});

test("the invitee sees the offer and accepts it", async ({ page, context }) => {
  await signIn(context);
  await page.goto("/invitations/accept?token=good-token");
  await expect(page.getByRole("heading", { name: "Join E2E Org" })).toBeVisible();
  await expect(page.getByText("an-admin invited you")).toBeVisible();
  await page.getByRole("button", { name: "Accept invitation" }).click();
  await expect(page.getByRole("heading", { name: "Welcome to E2E Org" })).toBeVisible();
});
