import { test, expect } from "@playwright/test";
import { rowForAction } from "../helpers";

test.describe("Agency role: sub-agency management", () => {
  test("commission visibility toggle flips and reverts", async ({ page }) => {
    await page.goto("/sub-agencies");
    await expect(page.getByRole("heading", { level: 1, name: "Sub Agencies" })).toBeVisible();

    const row = page.getByRole("row").filter({ hasText: "NextStep Consultancy" });
    const toggle = row.getByRole("button", { name: /commission visibility/i });
    await expect(toggle).toBeVisible();

    const before = (await toggle.textContent())?.trim();
    expect(before).toMatch(/(Can|Cannot) view commission/);

    await toggle.click();
    const flipped = before!.includes("Cannot") ? "Can view commission" : "Cannot view commission";
    await expect(row.getByRole("button", { name: /commission visibility/i })).toHaveText(flipped, { timeout: 15_000 });

    // revert to the original state so reruns stay stable
    await row.getByRole("button", { name: /commission visibility/i }).click();
    await expect(row.getByRole("button", { name: /commission visibility/i })).toHaveText(before!, { timeout: 15_000 });
  });

  test("agency sidebar hides admin-only sections", async ({ page }) => {
    await page.goto("/home");
    const nav = page.getByRole("complementary", { name: "Main navigation" }).getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Sub Agencies" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Partner Commissions" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Users" })).toHaveCount(0); // SUPER_ADMIN/MANAGER only
    await expect(nav.getByRole("link", { name: "My Applications" })).toHaveCount(0); // student only
  });
});
