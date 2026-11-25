import { test, expect } from "@playwright/test";

test.describe("Public pages (no auth)", () => {
  test("landing page shows both role cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Welcome. Let’s get you to the right place." })).toBeVisible();

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

  test("password recovery pages are reachable without an account", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByRole("heading", { level: 1, name: "Reset password" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();

    await page.goto("/reset-password");
    await expect(page).toHaveURL(/\/reset-password$/);
    await expect(page.getByRole("heading", { level: 1, name: "Choose a new password" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Request a new link" })).toBeVisible();

    await page.goto("/reset-password?token=smoke-test-token");
    await expect(page).toHaveURL(/\/reset-password\?token=/);
    await expect(page.getByRole("textbox", { name: "New password", exact: true })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Confirm new password", exact: true })).toBeVisible();
  });

  test("keyboard users can navigate the landing page and login controls with visible focus", async ({ page }) => {
    await page.goto("/");
    const studentCard = page.getByRole("link", { name: /I am a Student/ });
    await page.keyboard.press("Tab");
    await expect(studentCard).toBeFocused();
    expect(await studentCard.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return style.outlineStyle !== "none" || style.boxShadow !== "none";
    })).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/student\/login$/);

    const backLink = page.getByRole("link", { name: "← Back" });
    const email = page.getByRole("textbox", { name: "Email" });
    const forgotPassword = page.getByRole("link", { name: "Forgot password?" });
    const password = page.getByRole("textbox", { name: "Password" });
    const showPassword = page.getByRole("button", { name: "Show password" });

    await page.keyboard.press("Tab");
    await expect(backLink).toBeFocused();
    expect(await backLink.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return style.outlineStyle !== "none" || style.boxShadow !== "none";
    })).toBe(true);
    await page.keyboard.press("Tab");
    await expect(email).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(forgotPassword).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(password).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(showPassword).toBeFocused();
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: "Hide password" })).toBeFocused();
    await expect(password).toHaveAttribute("type", "text");
  });

  for (const [path, heading] of [
    ["/student/login", "Student Login"],
    ["/partner/login", "Partner Login"],
    ["/student/signup", "Student Signup"],
    ["/partner/signup", "Partner Signup"],
  ] as const) {
    test(`${path} renders with back link`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await page.getByRole("link", { name: "← Back" }).click();
      await expect(page).toHaveURL(/\/$/);
    });
  }

  for (const path of [
    "/student/login",
    "/partner/login",
    "/student/signup",
    "/partner/signup",
  ]) {
    test(`${path} shows visible keyboard focus on the back link`, async ({ page }) => {
      await page.goto(path);
      const backLink = page.getByRole("link", { name: "← Back" });
      await page.keyboard.press("Tab");
      await expect(backLink).toBeFocused();
      expect(await backLink.evaluate((element) => {
        const style = window.getComputedStyle(element);
        return style.outlineStyle !== "none" || style.boxShadow !== "none";
      })).toBe(true);
    });
  }

  for (const [path, firstControl] of [
    ["/forgot-password", "Email"],
    ["/reset-password?token=keyboard-smoke-token", "New password"],
  ] as const) {
    test(`${path} supports keyboard navigation into the form`, async ({ page, browserName }) => {
      await page.goto(path);
      const backLink = page.getByRole("link", { name: "← Back" });
      const firstControlLocator = page.getByRole("textbox", { name: firstControl, exact: true });
      if (browserName === "webkit") {
        // Safari/WebKit's default keyboard preference skips links while tabbing.
        expect(await backLink.evaluate((element) => (element as HTMLAnchorElement).tabIndex)).toBe(0);
        await page.keyboard.press("Tab");
      } else {
        await page.keyboard.press("Tab");
        await expect(backLink).toBeFocused();
        await page.keyboard.press("Tab");
      }
      await expect(firstControlLocator).toBeFocused();
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
    await page.getByRole("textbox", { name: "Password", exact: true }).fill("Test@12345");
    await page.getByRole("textbox", { name: "Confirm password" }).fill("Test@12345");
    await page.getByRole("checkbox", { name: /agree to the terms/i }).check();
    await page.getByRole("button", { name: "Create account" }).click();

    await page.waitForURL(/\/my-applications/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { level: 1, name: "My applications" })).toBeVisible();
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
    await expect(page.getByRole("textbox", { name: "Password", exact: true })).toBeVisible();
    await expect(page.getByText(/review and approve/i)).toBeVisible();
  });
});
