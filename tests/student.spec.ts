import { test, expect } from "@playwright/test";
import { expectLanding } from "./helpers";

const STUDENT_PAGES: [string, string][] = [
  ["/my-applications", "My Applications"],
  ["/apply", "Apply Application"],
  ["/programs", "Programs"],
  ["/scholarships", "Scholarships"],
  ["/short-courses", "Short Courses"],
  ["/my-shortlist", "My Shortlist"],
  ["/messages", "Messages"],
  ["/payments", "Payments"],
  ["/profile", "Profile"],
  ["/settings", "Settings"],
];

test.describe("Student dashboard", () => {
  for (const [route, heading] of STUDENT_PAGES) {
    test(`${route} renders`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.locator("aside")).toBeVisible();
    });
  }

  test("sidebar shows student nav only (no partner sections)", async ({ page }) => {
    await page.goto("/my-applications");
    const nav = page.locator("aside nav");
    await expect(nav.getByRole("link", { name: "My Applications" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Apply Application" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "My Shortlist" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Programs" })).toBeVisible();

    await expect(nav.getByRole("link", { name: "Home" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Users" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Reports" })).toHaveCount(0);
  });

  test("seeded application is listed with stats", async ({ page }) => {
    await page.goto("/my-applications");
    await expect(page.getByText("Bachelor of Computer Science").first()).toBeVisible();
    await expect(page.getByText("Total applications")).toBeVisible();
  });

  test("programs page lists seeded program and supports search input", async ({ page }) => {
    await page.goto("/programs");
    await expect(page.getByText("Bachelor of Computer Science").first()).toBeVisible();
  });

  test("short courses lists seeded course", async ({ page }) => {
    await page.goto("/short-courses");
    await expect(page.getByText("IELTS Preparation (6-week intensive)").first()).toBeVisible();
  });

  test("my shortlist contains seeded programs", async ({ page }) => {
    await page.goto("/my-shortlist");
    await expect(page.getByText("Bachelor of Computer Science").first()).toBeVisible();
  });

  test("profile shows seeded identity", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByText("student@studyabroad.test")).toBeVisible();
  });

  test("student cannot open partner pages", async ({ page }) => {
    // Blocked pages bounce to "/", and the landing page forwards
    // authenticated students to their own home (/my-applications).
    for (const route of ["/home", "/users", "/application", "/transaction", "/documents", "/reports"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/my-applications\/?$/);
      await expect(page.getByRole("heading", { level: 1, name: "My Applications" })).toBeVisible();
    }
  });

  test("sign out returns to landing page", async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      storageState: ".auth/student.json",
      baseURL,
    });
    const page = await context.newPage();
    await page.goto("/my-applications");

    await page.getByRole("button", { name: /Sam Student/ }).click();
    await page.getByRole("button", { name: "Sign out" }).click();

    await expectLanding(page);
    await context.close();
  });
});
