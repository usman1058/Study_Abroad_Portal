import { test, expect } from "@playwright/test";

test.describe("Agency role", () => {
  test("sidebar includes partner tools without a separate sub-agency section", async ({ page }) => {
    await page.goto("/home");
    const nav = page.getByRole("complementary", { name: "Main navigation" }).getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Sub Agencies" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Partner Commissions" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Users" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "My Applications" })).toHaveCount(0);
    // Reports was removed for agencies: their scope has no data to summarise.
    await expect(nav.getByRole("link", { name: "Reports" })).toHaveCount(0);
  });

  test("agency can create application officer accounts", async ({ page }) => {
    await page.goto("/users");
    await page.getByRole("button", { name: "+ Create user" }).click();
    const role = page.getByLabel("Role");
    await expect(role.locator("option", { hasText: "Application Officer / Consultant" })).toHaveCount(1);
    await expect(role.locator('option[value="STUDENT"]')).toHaveCount(1);
  });
});
