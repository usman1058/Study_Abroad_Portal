import { test, expect } from "@playwright/test";

test.describe("Public pages (no auth)", () => {
  test("landing page shows both role cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "StudyAbroad Portal" })).toBeVisible();

    const studentCard = page.getByRole("link", { name: /I am a Student/ });
    const partnerCard = page.getByRole("link", { name: /I am a Partner/ });
    await expect(studentCard).toBeVisible();
    await expect(partnerCard).toBeVisible();
  });

  test("student card navigates to student login", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /I am a Student/ }).click();
    await expect(page).toHaveURL(/\/student\/login$/);
    await expect(page.getByRole("heading", { level: 1, name: "Student Login" })).toBeVisible();
  });

  test("partner card navigates to partner login", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /I am a Partner/ }).click();
    await expect(page).toHaveURL(/\/partner\/login$/);
    await expect(page.getByRole("heading", { level: 1, name: "Partner Login" })).toBeVisible();
  });

  for (const [path, heading] of [
    ["/student/login", "Student Login"],
    ["/partner/login", "Partner Login"],
    ["/student/signup", "Create your account"],
    ["/partner/signup", "Partner Signup"],
  ] as const) {
    test(`${path} renders with back link`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await page.getByRole("link", { name: "← Back" }).click();
      await expect(page).toHaveURL(/\/$/);
    });
  }

  test("login form shows error on invalid credentials", async ({ page }) => {
    await page.goto("/student/login");
    await page.getByRole("textbox", { name: "Email" }).fill("wrong@studyabroad.test");
    await page.getByRole("textbox", { name: "Password" }).fill("WrongPassword123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
  });

  test("password visibility toggle works", async ({ page }) => {
    await page.goto("/student/login");
    const password = page.getByRole("textbox", { name: "Password" });
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(password).toHaveAttribute("type", "password");
  });

  test("login page links to signup and vice versa", async ({ page }) => {
    await page.goto("/student/login");
    await page.getByRole("link", { name: "Create a free account" }).click();
    await expect(page).toHaveURL(/\/student\/signup$/);

    await page.goto("/partner/login");
    await page.getByRole("link", { name: "Request an agency account" }).click();
    await expect(page).toHaveURL(/\/partner\/signup$/);
  });

  test("student signup creates account and signs in", async ({ page }) => {
    const unique = Date.now();
    await page.goto("/student/signup");
    await page.getByLabel("First name").fill("E2E");
    await page.getByLabel("Last name").fill(`Tester${unique}`);
    await page.getByLabel("Phone").fill("+60129999999");
    await page.getByLabel("Email").fill(`e2e-student-${unique}@studyabroad.test`);
    await page.getByRole("textbox", { name: "Password" }).fill("Test@12345");
    await page.getByRole("button", { name: "Create account" }).click();

    await page.waitForURL(/\/my-applications/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { level: 1, name: "My Applications" })).toBeVisible();
  });

  test("partner signup form renders all fields", async ({ page }) => {
    await page.goto("/partner/signup");
    for (const label of [
      "Agency / company name",
      "First name",
      "Last name",
      "Phone",
      "Country",
      "Email",
    ]) {
      await expect(page.getByLabel(label)).toBeVisible();
    }
    await expect(page.getByRole("textbox", { name: "Password" })).toBeVisible();
    await expect(page.getByText(/review and approve/i)).toBeVisible();
  });
});
