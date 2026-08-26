import { existsSync, mkdirSync, statSync } from "node:fs";
import { expect, test as setup, type Page } from "@playwright/test";
import { ADMIN, STUDENT, TEST_PASSWORD } from "./helpers";

const AGENCY = { email: "agency@studyabroad.test", password: TEST_PASSWORD };

const STUDENT_FILE = ".auth/student.json";
const ADMIN_FILE = ".auth/admin.json";
const AGENCY_FILE = ".auth/agency.json";

// The app rate-limits logins (10 / email / 15 min, in-memory), so reuse a
// recently-written storage state instead of signing in again on every run.
const FRESH_MS = 14 * 60 * 1000;

function isFresh(file: string) {
  return existsSync(file) && Date.now() - statSync(file).mtimeMs < FRESH_MS;
}

async function uiLogin(page: Page, path: string, email: string, password: string, landing: RegExp) {
  await page.goto(path);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  try {
    await page.waitForURL(landing, { timeout: 20_000 });
    return true;
  } catch {
    return false;
  }
}

async function ensureSession(
  page: Page,
  file: string,
  path: string,
  email: string,
  password: string,
  landing: RegExp,
) {
  let loggedIn = false;
  if (!isFresh(file)) {
    mkdirSync(".auth", { recursive: true });
    setup.setTimeout(90_000);
    loggedIn = await uiLogin(page, path, email, password, landing);
    if (loggedIn) await page.context().storageState({ path: file });
  }

  // Sanity-check whichever state we ended up with actually authenticates.
  const probe = loggedIn
    ? page.request
    : (
        await page.context().browser()!.newContext({ storageState: existsSync(file) ? file : undefined })
      ).request;

  try {
    const res = await probe.get("/api/notifications/unread-count");
    expect(res.status()).toBe(200); // 401 would mean the session is not valid
  } finally {
    if (!loggedIn) await page.context().close();
  }
}

setup("create student session", async ({ page }) => {
  await ensureSession(page, STUDENT_FILE, "/student/login", STUDENT.email, STUDENT.password, /\/my-applications/);
});

setup("create admin session", async ({ page }) => {
  await ensureSession(page, ADMIN_FILE, "/partner/login", ADMIN.email, ADMIN.password, /\/home/);
});

setup("create agency session", async ({ page }) => {
  await ensureSession(page, AGENCY_FILE, "/partner/login", AGENCY.email, AGENCY.password, /\/home/);
});
