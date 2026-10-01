import { test, expect } from "@playwright/test";

test.describe("App shell: every persistent control works", () => {
  test("theme toggle switches dark class and persists across reload", async ({ page }) => {
    await page.goto("/home");
    const html = page.locator("html");

    await expect(html).not.toHaveClass(/dark/);
    await page.getByRole("button", { name: "Toggle theme" }).click();
    await expect(html).toHaveClass(/dark/);
    await page.reload();
    await expect(html).toHaveClass(/dark/); // localStorage persistence

    await page.getByRole("button", { name: "Toggle theme" }).click();
    await expect(html).not.toHaveClass(/dark/);
  });

  test("notification control opens its panel and message-center link works", async ({ page }) => {
    await page.goto("/home");
    await page.getByRole("button", { name: "Notifications" }).click();
    await expect(page.getByText("Notifications", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Open message center" }).click();
    await expect(page).toHaveURL(/\/messages$/);
    await expect(page.getByRole("heading", { level: 1, name: "Messages" })).toBeVisible();
  });

  test("profile dropdown links to Profile and Settings pages", async ({ page }) => {
    await page.goto("/home");
    await page.getByRole("button", { name: /Portal Admin/ }).click();

    const menu = page.getByRole("banner");
    await menu.getByRole("link", { name: "Profile" }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole("heading", { level: 1, name: "Profile" })).toBeVisible();

    await page.getByRole("button", { name: /Portal Admin/ }).click();
    await menu.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings$/);
  });

  test("topbar logo returns to role home", async ({ page }) => {
    await page.goto("/users");
    await page.getByRole("banner").locator('a[aria-label="Home"]').click();
    await expect(page).toHaveURL(/\/home$/);
  });

  test("WhatsApp quick launch has a wa.me target", async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByRole("complementary", { name: "Main navigation" }).getByRole("link", { name: /WhatsApp quick launch/ })).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\//,
    );
  });

  test("sidebar marks the active section", async ({ page }) => {
    await page.goto("/users");
    const usersLink = page.getByRole("complementary", { name: "Main navigation" }).getByRole("link", { name: "Users" });
    await expect(usersLink).toHaveClass(/bg-brand-50/);
  });

  test("home KPI cards are real links to their sections", async ({ page }) => {
    await page.goto("/home");
    const appLinks = page.locator('a[href="/application"]');
    await expect(appLinks).not.toHaveCount(0); // KPI tiles + "View all" all deep-link
    await expect(appLinks.first()).toBeVisible();
    await expect(page.locator('a[href="/users"]').first()).toBeVisible();
  });
});
