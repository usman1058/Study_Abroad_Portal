import { test, expect } from "@playwright/test";

const ADMIN_PAGES: [string, RegExp][] = [
  ["/home", /Welcome back/],
  ["/users", /^Users$/],
  ["/programs", /^Programs$/],
  ["/scholarships", /^Scholarships$/],
  ["/short-courses", /^Short Courses$/],
  ["/search", /^Search$/],
  ["/application", /^Applications$/],
  ["/sub-agencies", /^Sub Agencies$/],
  ["/partner-commissions", /^Partner Commissions$/],
  ["/transaction", /^Transactions$/],
  ["/documents", /^Documents$/],
  ["/reports", /^Reports$/],
  ["/visitor-form", /^Visitor Form$/],
  ["/messages", /^Messages$/],
  ["/payments", /^Payments$/],
  ["/profile", /^Profile$/],
  ["/settings", /^Settings$/],
];

test.describe("Admin dashboard (SUPER_ADMIN)", () => {
  for (const [route, heading] of ADMIN_PAGES) {
    test(`${route} renders`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.locator("aside")).toBeVisible();
    });
  }

  test("sidebar shows partner nav only (no student sections)", async ({ page }) => {
    await page.goto("/home");
    const nav = page.locator("aside nav");
    await expect(nav.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Users" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Application" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Reports" })).toBeVisible();

    await expect(nav.getByRole("link", { name: "My Applications" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "My Shortlist" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Apply Application" })).toHaveCount(0);
  });

  test("users list shows seeded users and opens student detail", async ({ page }) => {
    await page.goto("/users");
    await expect(page.getByText("student@studyabroad.test")).toBeVisible();

    await page.getByRole("link", { name: "Sam Student" }).click();
    await expect(page).toHaveURL(/\/users\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1, name: "Sam Student" })).toBeVisible();
    await expect(page.getByText("Applications").first()).toBeVisible();
  });

  test("applications list shows seeded application and detail page opens", async ({ page }) => {
    await page.goto("/application");
    await expect(page.getByText("Bachelor of Computer Science").first()).toBeVisible();

    await page.goto("/application/sample-app-1");
    await expect(page.getByRole("heading", { level: 1, name: "Bachelor of Computer Science" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pipeline" })).toBeVisible();
  });

  test("sub-agencies lists seeded sub-agency", async ({ page }) => {
    await page.goto("/sub-agencies");
    await expect(page.getByText("NextStep Consultancy").first()).toBeVisible();
  });

  test("transactions list shows seeded transaction", async ({ page }) => {
    await page.goto("/transaction");
    await expect(
      page.getByText("Service fee for the Bachelor of Computer Science application"),
    ).toBeVisible();
  });

  test("admin cannot open student pages", async ({ page }) => {
    for (const route of ["/my-applications", "/apply", "/my-shortlist"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/home\/?$/);
      await expect(page.locator("aside")).toBeVisible();
    }
  });
});
