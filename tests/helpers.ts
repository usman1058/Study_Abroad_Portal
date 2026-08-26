import { expect, type Page } from "@playwright/test";

export const TEST_PASSWORD = "Admin@12345";

export const STUDENT = { email: "student@studyabroad.test", password: TEST_PASSWORD };
export const ADMIN = { email: "admin@studyabroad.test", password: TEST_PASSWORD };

/** Locate the form control (input/select/textarea) that follows a plain <label> sibling. */
export function controlFor(page: Page, labelText: string) {
  return page
    .locator("label")
    .filter({ hasText: labelText })
    .first()
    .locator("xpath=following-sibling::*[self::input or self::select or self::textarea][1]");
}

/**
 * Find the smallest container (row/card) that holds BOTH the unique text and
 * the given action control — reliably scopes to one table row / list card.
 */
export function rowForAction(
  page: Page,
  uniqueText: string,
  action: { role?: "button" | "link"; name: string | RegExp; exact?: boolean },
) {
  const control =
    (action.role ?? "button") === "link"
      ? page.getByRole("link", { name: action.name as never, exact: action.exact })
      : page.getByRole("button", { name: action.name as never, exact: action.exact });
  return page
    .locator("div, li, tr, label")
    .filter({ has: page.getByText(uniqueText, { exact: false }) })
    .filter({ has: control })
    .last();
}

/** Select an option whose label merely *contains* the given text. */
export async function selectByPartialLabel(control: ReturnType<Page["locator"]>, partial: string) {
  const value = await control
    .locator("option")
    .filter({ hasText: partial })
    .first()
    .getAttribute("value");
  await control.selectOption(value!);
}

/** Auto-accept the next window.confirm dialog. */
export function acceptNextConfirm(page: Page) {
  page.once("dialog", (d) => d.accept());
}

export async function login(
  page: Page,
  creds: { email: string; password: string },
  landingUrl: RegExp,
  loginPath: "/student/login" | "/partner/login" = "/student/login",
) {
  await page.goto(loginPath);
  await page.getByRole("textbox", { name: "Email" }).fill(creds.email);
  await page.getByRole("textbox", { name: "Password" }).fill(creds.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(landingUrl);
}

export async function expectLanding(page: Page) {
  await page.waitForURL(/:\d+\/$|\/$/);
  await expect(page.getByRole("heading", { name: "StudyAbroad Portal" })).toBeVisible();
}
