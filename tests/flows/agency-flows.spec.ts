import { test, expect } from "@playwright/test";

test.describe("Agency role", () => {
  test("sidebar includes partner tools without a separate sub-agency section", async ({ page }) => {
    await page.goto("/home");
    const nav = page.getByRole("complementary", { name: "Main navigation" }).getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Sub Agencies" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Partner Commissions" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Users" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "My Applications" })).toHaveCount(0);
  });
});
