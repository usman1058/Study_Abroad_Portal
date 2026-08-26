import { test, expect } from "@playwright/test";

const PROTECTED_ROUTES = [
  "/home",
  "/my-applications",
  "/apply",
  "/programs",
  "/users",
  "/scholarships",
  "/short-courses",
  "/search",
  "/application",
  "/sub-agencies",
  "/partner-commissions",
  "/transaction",
  "/documents",
  "/reports",
  "/visitor-form",
  "/my-shortlist",
  "/messages",
  "/payments",
  "/profile",
  "/settings",
];

test.describe("Unauthenticated access control", () => {
  for (const route of PROTECTED_ROUTES) {
    test(`anonymous visit to ${route} is redirected to landing`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole("heading", { level: 1, name: "StudyAbroad Portal" })).toBeVisible();
    });
  }

  test("unknown route redirects to not-found page", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist");
    expect(response?.status()).toBe(404);
  });
});
