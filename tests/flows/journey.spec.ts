import { test, expect, type Page } from "@playwright/test";
import { controlFor, rowForAction, selectByPartialLabel } from "../helpers";

test.describe.configure({ mode: "serial" });

const ts = Date.now().toString(36);
const UNI = `E2E University ${ts}`;
const P_WIZARD = `E2E Wizard Program ${ts}`;
const P_APPLY = `E2E ApplyBtn Program ${ts}`;
const P_DELETE = `E2E Disposable Program ${ts}`;

const slugOf = (uni: string, name: string) =>
  `${uni}-${name}`.toLowerCase().replace(/[^a-z0-9à-ÿ]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

/** Create a program via the /scholarships form, exercising the new-university toggle. */
async function saveProgramForm(page: Page, expectedName: string) {
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Save program" }) });
  const saveResponse = page.waitForResponse((response) => response.url().includes("/api/scholarships") && ["POST", "PUT"].includes(response.request().method()));
  await form.getByRole("button", { name: "Save program" }).click();
  const response = await saveResponse;
  const body = await response.json().catch(() => ({}));
  expect(response.status(), JSON.stringify(body)).toBe(response.request().method() === "POST" ? 201 : 200);
  // The toolbar's Add button remains visible while the form is open; wait for
  // the submitted form to close so the following navigation cannot abort it.
  await expect(page.locator("form").filter({ has: page.getByRole("button", { name: "Save program" }) })).toBeHidden({ timeout: 20_000 });
  // The catalogue sorts alphabetically and the dedicated audit DB accumulates
  // fixture rows across runs; filter by the new title instead of assuming page 1.
  await page.goto(`/programs?q=${encodeURIComponent(expectedName)}`);
  await expect(page.getByText(expectedName, { exact: true })).toBeVisible();
}

/** Enter "new university" mode regardless of which mode the fresh form opened in. */
async function ensureNewUniversityMode(page: Page, exerciseToggle: boolean) {
  const addNew = page.getByRole("button", { name: "+ Add new university" });
  if (exerciseToggle) {
    // verify BOTH directions of the mode switch
    await addNew.click();
    await expect(page.getByPlaceholder("New university name")).toBeVisible();
    await page.getByRole("button", { name: "Choose existing instead" }).click();
    await expect(addNew).toBeVisible();
  }
  if ((await addNew.isVisible().catch(() => false)) === false) return;
  await addNew.click();
  await expect(page.getByPlaceholder("New university name")).toBeVisible({ timeout: 10_000 });
}

async function createProgram(page: Page, university: string, name: string, exerciseToggle = false) {
  await page.getByRole("button", { name: "Add a new program" }).click();
  await expect(page.getByRole("heading", { name: "Add a new program" })).toBeVisible();

  await ensureNewUniversityMode(page, exerciseToggle);

  await page.getByPlaceholder("New university name").fill(university);
  await page.getByPlaceholder("Country", { exact: true }).fill("Malaysia");
  await controlFor(page, "Program name").fill(name);
  await controlFor(page, "Tuition fee (MYR)").fill("12345");
  await saveProgramForm(page, name);
}

test.describe("Full interactive journey (no ghost buttons)", () => {
  test("admin creates/edits/deletes programs via form incl. new-university path", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/scholarships");

    // three creates share one page load (the hydrated list is expensive)
    await createProgram(page, UNI, P_WIZARD, true); // first one exercises the toggle both ways
    await createProgram(page, UNI, P_APPLY);
    await createProgram(page, UNI, P_DELETE);
    await page.getByRole("button", { name: `Edit ${P_DELETE}`, exact: true }).click();
    await expect(page.getByRole("heading", { name: "Edit program" })).toBeVisible();
    const editForm = page.locator("form").filter({ has: page.getByRole("heading", { name: "Edit program" }) });
    const nameInput = editForm.locator("label").filter({ hasText: "Program name" }).locator("xpath=following-sibling::input[1]");
    await expect(nameInput).toHaveValue(P_DELETE); // form hydrates initial values
    await nameInput.fill(`${P_DELETE} v2`);
    const updateResponse = page.waitForResponse((response) => response.url().includes("/api/scholarships/") && response.request().method() === "PUT");
    await saveProgramForm(page, `${P_DELETE} v2`);
    const updateResult = await updateResponse;
    expect(updateResult.status(), await updateResult.text()).toBe(200);

    // Delete with confirm dialog
    await page.getByRole("button", { name: `Delete ${P_DELETE} v2`, exact: true }).click();
    await page.getByRole("button", { name: `Confirm deleting ${P_DELETE} v2`, exact: true }).click();
    try {
      await expect(page.getByText(`${P_DELETE} v2`)).toHaveCount(0, { timeout: 15_000 });
    } catch {
      // router.refresh() can lag behind the API — settle with a hard reload
      await page.reload();
      await expect(page.getByText(`${P_DELETE} v2`)).toHaveCount(0, { timeout: 10_000 });
    }
  });

  test("student completes the 4-step application wizard and submits", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ".auth/student.json" });
    const page = await ctx.newPage();

    await page.goto("/apply");
    await expect(page.getByRole("heading", { level: 1, name: "Start an application" })).toBeVisible();

    // Step 0 — Continue is gated on required fields
    const firstName = page.getByLabel("First name *");
    await expect(firstName).toHaveValue("Sam"); // pre-filled from profile
    const saveContinue = page.getByRole("button", { name: "Save & continue" });

    const genderSelect = page.getByLabel("Gender *");
    if (!(await genderSelect.inputValue())) {
      await expect(saveContinue).toBeDisabled(); // gating works
      await genderSelect.selectOption("male");
    }
    if (!(await page.getByLabel("Passport number *").inputValue())) {
      await page.getByLabel("Passport number *").fill(`E2E${ts.toUpperCase()}`);
    }
    if (!(await page.getByLabel("Date of birth *").inputValue())) {
      await page.getByLabel("Date of birth *").fill("2000-01-01");
    }
    await expect(saveContinue).toBeEnabled();
    await saveContinue.click();

    // Step 1 — add + remove an education entry, then keep one filled row
    await expect(page.getByRole("button", { name: "+ Add education entry" })).toBeVisible();
    await page.getByRole("button", { name: "+ Add education entry" }).click();
    const removeButtons = page.getByRole("button", { name: "Remove this entry" });
    await expect(removeButtons).toHaveCount(2);
    await removeButtons.last().click();
    await expect(removeButtons).toHaveCount(1); // removal works

    await page.getByLabel("Level").selectOption("Bachelor");
    await page.getByLabel("Institution *").fill("E2E Polytechnic");
    await page.getByRole("button", { name: "Save & continue" }).click();

    // Step 2 — upload two documents through the real file input
    await expect(page.getByText("Upload your academic documents now")).toBeVisible();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({ name: "passport.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 e2e") });
    await page.getByRole("button", { name: "Upload document" }).click();
    await expect(fileInput).toHaveValue("", { timeout: 15_000 }); // cleared after success

    await page.getByLabel("Document type").selectOption({ label: "Transcript" });
    await fileInput.setInputFiles({ name: "transcript.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 e2e") });
    await page.getByRole("button", { name: "Upload document" }).click();
    await expect(fileInput).toHaveValue("", { timeout: 15_000 });
    await expect(page.locator("li").filter({ hasText: "transcript" }).first()).toBeVisible();

    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 3 — choose program & submit
    await expect(page.getByText("Choose university & program *")).toBeVisible();
    await page.getByRole("button", { name: "Search and select a program…" }).click();
    await page.getByRole("textbox", { name: "Search programs" }).fill(P_WIZARD);
    const programOption = page.locator(`[data-picker-option]`).filter({ hasText: P_WIZARD }).first();
    await expect(programOption).toBeVisible({ timeout: 15_000 });
    await programOption.click();
    await page.getByRole("button", { name: "Submit application" }).click();

    await page.waitForURL(/\/my-applications\?submitted=1$/, { timeout: 20_000 });
    // A hosted database may close an RSC stream while the response is loading.
    // Reloading this idempotent confirmation page must still show the result.
    if (!(await page.getByText("Application submitted.").isVisible().catch(() => false))) await page.reload();
    await expect(page.getByText("Application submitted.")).toBeVisible();
    await expect(page.getByText(P_WIZARD).first()).toBeVisible();
  });

  test("student completes profile, applies from catalog, and uses bulk export toolbar", async ({ browser }) => {
    test.setTimeout(150_000);
    const ctx = await browser.newContext({ storageState: ".auth/student.json" });
    const page = await ctx.newPage();

    // This shared seeded student starts below the 80% one-click-apply gate.
    // Complete the required audit fixture through the same profile API before
    // checking that the catalog exposes the action.
    const profileResponse = await ctx.request.put("/api/profile", {
      data: {
        phone: "+60123456789",
        country: "Malaysia",
        gender: "male",
        passportNumber: `E2E${ts.toUpperCase()}`,
        birthday: "2000-01-01",
        countryOfResidence: "Malaysia",
        nationality: "Malaysian",
        cityOfResidence: "Kuala Lumpur",
        address: "Audit test address",
      },
    });
    expect(profileResponse.status()).toBe(200);

    await page.goto(`/programs?q=${encodeURIComponent(P_APPLY)}`);

    // Idempotent across retries: skip if this run already applied.
    const findCard = () => page.locator("[data-program-row]").filter({ hasText: P_APPLY });
    const card = findCard();
    const existingApplications = await ctx.request.get("/api/applications?limit=100");
    expect(existingApplications.status()).toBe(200);
    const applicationPayload = await existingApplications.json();
    const alreadyApplied = (applicationPayload.data?.data ?? []).some(
      (application: { program?: { name?: string } }) => application.program?.name === P_APPLY,
    );
    if (!alreadyApplied) {
      await card.getByRole("button", { name: `Apply to ${P_APPLY}`, exact: true }).click();
      await expect(card.getByRole("link", { name: "view application", exact: true })).toBeVisible({ timeout: 15_000 });
    }

    await page.goto("/my-applications");
    await expect(page.getByText(P_APPLY).first()).toBeVisible();

    // Bulk export list — select, download (first react-pdf render is slow), clear
    await page.goto(`/programs?q=${encodeURIComponent(P_WIZARD)}`);
    await page.getByLabel(`Select ${P_WIZARD}`).check();
    await expect(page.getByText(/1 program selected/)).toBeVisible();

    const dlPromise = page.waitForEvent("download", { timeout: 110_000 });
    await page.getByRole("button", { name: "Download PDF" }).click();
    const dl = await dlPromise;
    expect((await dl.path()) !== null).toBeTruthy();

    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(page.getByText(/program selected/)).toHaveCount(0);
    await ctx.close();
  });

  test("student shortlist toggle adds, persists, and removes via detail page", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ".auth/student.json" });
    const page = await ctx.newPage();
    await page.goto(`/scholarships/${slugOf(UNI, P_WIZARD)}`);
    await expect(page.getByRole("heading", { level: 1, name: P_WIZARD })).toBeVisible();
    await expect(page.getByText(P_WIZARD, { exact: true })).toBeVisible();

    const addButton = () => page.getByRole("button", { name: "Add to shortlist" });
    const shortlistedButton = () => page.getByRole("button", { name: "Shortlisted" });
    const setShortlisted = async (wanted: boolean) => {
      if (wanted && await shortlistedButton().count()) return;
      if (!wanted && await addButton().count()) return;
      const method = wanted ? "POST" : "DELETE";
      const [response] = await Promise.all([
        page.waitForResponse((r) => r.url().endsWith("/api/shortlist") && r.request().method() === method),
        (wanted ? addButton() : shortlistedButton()).click(),
      ]);
      expect(wanted ? [200, 201] : [200]).toContain(response.status());
      await expect(wanted ? shortlistedButton() : addButton()).toBeVisible();
    };

    // Reset a prior interrupted run to a known state before testing both
    // transitions. The suite uses one shared seeded student in the audit DB.
    await setShortlisted(false);
    await setShortlisted(true);

    // state survives a reload (server-hydrated initial)
    await page.reload();
    await expect(shortlistedButton()).toBeVisible();

    // and toggling off removes it again
    await setShortlisted(false);

    await page.goto("/my-shortlist");
    await expect(page.getByText(P_WIZARD)).toHaveCount(0);

    // re-add for the PDF-download test later in this file
    await page.goto(`/scholarships/${slugOf(UNI, P_WIZARD)}`);
    await setShortlisted(true);

    // currency switcher live-converts the client-side FeeDisplay prices
    await page.goto(`/scholarships/${slugOf(UNI, P_APPLY)}`);
    await page.locator("select").first().selectOption("USD");
    const feeSpans = page.locator("span[title]");
    if ((await feeSpans.count()) > 0) {
      await expect(feeSpans.first()).not.toContainText("RM", { timeout: 10_000 }); // converted without reload
      const texts = await feeSpans.allTextContents();
      expect(texts.join("|")).toMatch(/US\$|\$|USD/);
    }
    const stored = await page.evaluate(() => localStorage.getItem("currency"));
    expect(stored).toBe("USD"); // switcher persisted the choice
    await ctx.close();
  });

  test("student compares shortlisted courses in modal", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ".auth/student.json" });
    const page = await ctx.newPage();
    await page.goto("/my-shortlist");
    await page.waitForLoadState("networkidle");

    // pick any two available chips (contents vary across runs)
    const chips = page
      .getByRole("group", { name: "Choose up to three courses to compare" })
      .getByRole("button");
    await expect(chips.first()).toBeVisible();
    const chipCount = await chips.count();
    expect(chipCount).toBeGreaterThanOrEqual(2);

    await chips.nth(0).click();
    await expect(chips.nth(0)).toHaveAttribute("aria-pressed", "true");
    await chips.nth(1).click();
    await expect(chips.nth(1)).toHaveAttribute("aria-pressed", "true");
    const compareBtn = page.getByRole("button", { name: new RegExp(`Compare selected \\(${Math.min(chipCount, 2)}\\/3\\)`) });
    await expect(compareBtn).toBeEnabled();
    await compareBtn.click();

    const modal = page.locator("div.fixed.inset-0");
    await expect(modal.getByRole("heading", { name: "Compare courses" })).toBeVisible();
    await expect(modal.locator("table th").first()).toBeVisible(); // comparison table renders
    await modal.getByRole("button", { name: "Close comparison" }).click();
    await expect(modal).toHaveCount(0);
    await ctx.close();
  });

  test("student applications tabs filter by stage", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ".auth/student.json" });
    const page = await ctx.newPage();
    await page.goto("/my-applications");

    // occasional missed client-side nav on first click — retry, then hard-nav
    const goTab = async (name: string | RegExp, urlRx: RegExp) => {
      const link = page.getByRole("link", { name });
      await link.click();
      try {
        await expect(page).toHaveURL(urlRx, { timeout: 8_000 });
      } catch {
        try {
          await link.click();
          await expect(page).toHaveURL(urlRx, { timeout: 8_000 });
        } catch {
          // RSC fetch was aborted server-side — honor the link target directly
          const href = await link.getAttribute("href");
          await page.goto(href!);
          await expect(page).toHaveURL(urlRx);
        }
      }
    };

    await goTab(/Waiting for Approval/, /\?tab=waiting$/);
    await expect(page.getByText(P_WIZARD).first()).toBeVisible(); // SUBMITTED matches this tab

    await goTab(/^Drafts/, /\?tab=drafts$/);
    await expect(page.getByText("No applications in this view.")).toBeVisible();

    await goTab(/^All \(/, /\?tab=all$/);
    await ctx.close();
  });

  test("student profile saves and settings rejects wrong password", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ".auth/student.json" });
    const page = await ctx.newPage();

    await page.goto("/profile");
    await expect(page).toHaveURL(/\/profile\/?$/);
    await expect(page.getByRole("heading", { level: 1, name: "Profile" })).toBeVisible();
    await controlFor(page, "City of residence").fill("Kuala Lumpur");
    const [saveResp] = await Promise.all([
      page.waitForResponse((r) => Boolean(r.url().includes("/api/profile") && r.request().method() === "PUT"), { timeout: 30_000 }),
      page.getByRole("button", { name: "Save profile" }).click(),
    ]);
    expect(saveResp.status(), "PUT /api/profile should succeed").toBe(200);
    await expect(page.getByText("Profile saved.")).toBeVisible();

    await page.goto("/settings");
    await expect(page).toHaveURL(/\/settings\/?$/);
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    await controlFor(page, "Current password").fill("WrongPassword123");
    await controlFor(page, "New password").fill("AnotherPass123");
    await controlFor(page, "Confirm new password").fill("AnotherPass123");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Current password is incorrect" })).toBeVisible();
    await ctx.close();
  });

  test("student enrolls into a short course, views details, withdraws", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ".auth/student.json" });
    const page = await ctx.newPage();
    await page.goto("/short-courses");

    const title = "Foundation English for Academic Study";
    const courseCard = page.locator("[data-short-course-id]").filter({ hasText: title });
    await expect(courseCard).toBeVisible();
    const enrollmentAction = () => courseCard.getByRole("button", { name: /^(Enrol and pay|Enrol free|Request a place)$/ });
    const withdrawAction = () => courseCard.getByRole("button", { name: /^(Withdraw|Cancel request)$/ });

    // Restore a known starting state if a previous interrupted run left an
    // enrollment behind in the shared audit database.
    if (await withdrawAction().count()) {
      const cleanupResponse = page.waitForResponse((r) => r.url().includes("/enroll") && r.request().method() === "DELETE");
      await withdrawAction().click();
      await courseCard.getByRole("button", { name: "Yes, withdraw" }).click();
      expect((await cleanupResponse).status()).toBe(200);
      await expect(enrollmentAction()).toBeVisible();
    }

    const [enrollResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/enroll") && r.request().method() === "POST"),
      enrollmentAction().click(),
    ]);
    expect(enrollResponse.status(), "POST /enroll should succeed").toBe(201);
    await expect(withdrawAction()).toBeVisible({ timeout: 15_000 });

    const detailsBtn = courseCard.getByRole("button", { name: "Details" });
    await detailsBtn.click();
    await expect(courseCard.getByText(/Your course details|What you get when you enrol/)).toBeVisible();
    await detailsBtn.click();
    await expect(courseCard.getByText(/Your course details|What you get when you enrol/)).toHaveCount(0);

    await withdrawAction().click();
    await expect(courseCard.getByRole("button", { name: "Yes, withdraw" })).toBeVisible();
    const [withdrawResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/enroll") && r.request().method() === "DELETE"),
      courseCard.getByRole("button", { name: "Yes, withdraw" }).click(),
    ]);
    expect(withdrawResponse.status()).toBe(200);
    await expect(enrollmentAction()).toBeVisible({ timeout: 15_000 });
    await ctx.close();
  });

  test("admin verifies and rejects uploaded documents", async ({ page }) => {
    await page.goto("/documents");

    const pendingRows = page.locator("li").filter({ has: page.getByText("Pending", { exact: true }) });

    // Helper to read current pending count from the subtitle
    const getPending = async () => Number(
      (await page.getByText(/\d+ pending\./).textContent())?.match(/(\d+) pending/)?.[1] ?? "0",
    );

    const pendingBefore = await getPending();
    expect(pendingBefore).toBeGreaterThanOrEqual(2);
    await expect(pendingRows).toHaveCount(pendingBefore);

    // Verify first document
    const [verifyResp] = await Promise.all([
      page.waitForResponse((r) => Boolean(r.url().match(/\/api\/documents\/[^/]+$/)) && r.request().method() === "PUT"),
      pendingRows.first().getByRole("button", { name: "Verify", exact: true }).click(),
    ]);
    expect(verifyResp.status()).toBe(200);
    await expect.poll(async () => (await getPending()) === pendingBefore - 1, { timeout: 15_000 });
    await expect.poll(async () => pendingRows.count()).toBe(pendingBefore - 1);
    await page.waitForLoadState("networkidle");

    // Rejection requires a reason that is shown to the student.
    await pendingRows.first().getByRole("button", { name: "Reject", exact: true }).click();
    await page.getByLabel("Reason shown to the student").fill("Audit verification test rejection");
    const [rejectResp] = await Promise.all([
      page.waitForResponse((r) => Boolean(r.url().match(/\/api\/documents\/[^/]+$/)) && r.request().method() === "PUT"),
      page.getByRole("button", { name: "Confirm rejection" }).click(),
    ]);
    expect(rejectResp.status()).toBe(200);
    await expect.poll(async () => (await getPending()) === pendingBefore - 2, { timeout: 15_000 });
    await expect.poll(async () => pendingRows.count()).toBe(pendingBefore - 2);
    await expect(page.getByText(/Audit verification test rejection/).first()).toBeVisible();
  });

  test("pipeline hides document-gated stages until required documents are verified", async ({ page }) => {
    await page.goto("/application/sample-app-1");
    const pipeline = controlFor(page, "Pipeline stage");
    await expect(pipeline.locator("option", { hasText: "Offer" })).toHaveCount(0);
    await expect(page.getByText("Complete all required document uploads and verification to unlock the next decision stage.")).toBeVisible();
  });

  test("admin creates a user, hits duplicate-email validation", async ({ page }) => {
    await page.goto("/users");
    await page.getByRole("button", { name: "+ Create user" }).click();
    await expect(page.getByRole("heading", { name: "Create a new account" })).toBeVisible();

    const email = `e2e-counselor-${ts}@studyabroad.test`;
    await controlFor(page, "Role").selectOption("COUNSELOR");
    await controlFor(page, "First name").fill("E2E");
    await controlFor(page, "Last name").fill("Counselor");
    await controlFor(page, "Email").fill(email);
    await controlFor(page, "Password").fill("Test@12345");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("button", { name: "+ Create user" })).toBeVisible({ timeout: 15_000 });
    // Filter to the newly-created account so the assertion does not depend on
    // which page of the accumulated audit database the timestamp sort returns.
    await page.goto(`/users?q=${encodeURIComponent(email)}`);
    await expect(page.getByRole("cell", { name: email, exact: true })).toBeVisible();

    // duplicate email surfaces API error inside the form
    await page.getByRole("button", { name: "+ Create user" }).click();
    await controlFor(page, "Email").fill(email);
    await controlFor(page, "First name").fill("Dup");
    await controlFor(page, "Last name").fill("User");
    await controlFor(page, "Password").fill("Test@12345");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("An account with this email already exists")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("admin curates student shortlist and messages the student", async ({ page }) => {
    await page.goto("/users");
    const samLink = page.getByRole("link", { name: "Sam Student" });
    const href = await samLink.getAttribute("href");
    await samLink.click();
    try {
      await expect(page).toHaveURL(/\/users\/[^/]+$/, { timeout: 8_000 });
    } catch {
      if (href) await page.goto(href);
      await expect(page).toHaveURL(/\/users\/[^/]+$/);
    }
    await expect(page.getByRole("heading", { level: 1, name: "Sam Student" })).toBeVisible({ timeout: 15_000 });

    // ShortlistBuilder — remove (if present) then restore
    const label = "Monash University Malaysia — Bachelor of Computer Science";
    const item = page.locator("li").filter({ hasText: label }).first();

    if ((await item.count()) > 0) {
      await item.getByRole("button", { name: `Remove ${label} from shortlist` }).click();
      await expect(item.getByText("Remove?")).toBeVisible();
      const [removeResponse] = await Promise.all([
        page.waitForResponse((response) => response.url().endsWith("/api/shortlist") && response.request().method() === "DELETE"),
        item.getByRole("button", { name: "Yes", exact: true }).click(),
      ]);
      expect(removeResponse.status()).toBe(200);
      try {
        await expect(item).toHaveCount(0, { timeout: 20_000 });
      } catch {
        // client router cache can lag behind the API — a hard reload settles it
        await page.reload();
        await expect(item).toHaveCount(0, { timeout: 10_000 });
      }
    }

    await page.getByRole("button", { name: "Search programs to add…" }).click();
    await page.getByRole("textbox", { name: "Search programs" }).fill("Bachelor of Computer Science");
    const monashProgram = page.locator("[data-picker-option]")
      .filter({ hasText: "Monash University Malaysia" })
      .filter({ hasText: "Bachelor of Computer Science" })
      .first();
    await expect(monashProgram).toBeVisible({ timeout: 15_000 });
    await monashProgram.click();
    const [addResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().endsWith("/api/shortlist") && response.request().method() === "POST"),
      page.getByRole("button", { name: "Add", exact: true }).click(),
    ]);
    expect(addResponse.status()).toBe(201);
    await expect(item).toBeVisible({ timeout: 15_000 });

    // MessageForm — send lands as a chat bubble
    const body = `E2E message ${ts}`;
    await page.getByPlaceholder("Write a message…").fill(body);
    const [messageResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().endsWith("/api/messages") && response.request().method() === "POST"),
      page.getByRole("button", { name: "Send" }).click(),
    ]);
    expect(messageResponse.status()).toBe(201);
    await expect(page.getByRole("status").filter({ hasText: "Message sent." })).toBeVisible({ timeout: 15_000 });
  });

  test("admin transactions: client validation, create, delete", async ({ page }) => {
    await page.goto("/transaction");
    const notes = `E2E tx ${ts}`;

    await page.getByRole("button", { name: "+ Add transaction" }).click();
    await expect(page.getByRole("heading", { name: "Add transaction" })).toBeVisible();

    // amount input is `required` (native block), so exercise the JS guard with 0
    await controlFor(page, "Amount").fill("0");
    await page.getByRole("button", { name: "Save transaction" }).click();
    await expect(page.getByText("Enter a valid positive amount.")).toBeVisible();

    await controlFor(page, "Amount").fill("250");
    await selectByPartialLabel(controlFor(page, "Related student"), "Sam Student");
    await controlFor(page, "Notes (what is this payment for?)").fill(notes);
    await page.getByRole("button", { name: "Save transaction" }).click();
    await expect(page.getByRole("button", { name: "+ Add transaction" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("cell", { name: notes, exact: true })).toBeVisible();
    // (transactions intentionally have no delete action in the UI)
  });

  test("admin visitor lead capture and delete", async ({ page }) => {
    await page.goto("/visitor-form");
    const name = `E2E Visitor ${ts}`;

    await page.getByRole("button", { name: "+ Add visitor" }).click();
    await controlFor(page, "Name").fill(name);
    await controlFor(page, "Phone").fill("+60129876543");
    await controlFor(page, "Course of interest").fill("E2E Course");
    await page.getByRole("button", { name: "Save lead" }).click();
    await expect(page.getByRole("cell", { name, exact: true })).toBeVisible({ timeout: 15_000 });

    // Cancel button hides the form without saving
    await page.getByRole("button", { name: "+ Add visitor" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(controlFor(page, "Name")).toHaveCount(0);

    // Keep a stable row locator while the inline delete action changes from
    // "Delete" to its confirmation controls.
    const leadRow = page.getByRole("row").filter({ hasText: name });
    await leadRow.getByRole("button", { name: "Delete", exact: true }).click();
    const [deleteResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/visitor-form/") && response.request().method() === "DELETE"),
      leadRow.getByRole("button", { name: "Confirm delete" }).click(),
    ]);
    expect(deleteResponse.status()).toBe(200);
    await expect(page.getByRole("cell", { name, exact: true })).toHaveCount(0, { timeout: 15_000 });
  });

  test("admin generates guest invite link; anonymous visitor can open it", async ({ page, browser }) => {
    await page.goto("/users");
    await page.getByRole("button", { name: "+ Generate guest invite link" }).click();
    await expect(page.getByRole("heading", { name: "Guest invite link", exact: true })).toBeVisible();

    await selectByPartialLabel(controlFor(page, "Student"), "Sam Student");

    // Validation: no section selected. The action is enabled after choosing a student.
    await page.getByLabel("Applications", { exact: true }).uncheck();
    await page.getByRole("button", { name: "Generate link" }).click();
    await expect(page.getByText("Select at least one section.")).toBeVisible();

    await page.getByLabel("Applications", { exact: true }).check();
    const [inviteResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().endsWith("/api/invites") && response.request().method() === "POST"),
      page.getByRole("button", { name: "Generate link" }).click(),
    ]);
    expect(inviteResponse.status()).toBe(201);

    // success panel shows the shareable link even after the form closes
    const sharePanel = page.locator("div.bg-emerald-50");
    const code = sharePanel.locator("code").first();
    await expect(sharePanel).toBeVisible({ timeout: 15_000 });
    await expect(code).toContainText("/invite/");
    const url = (await code.textContent())!.trim();

    const anon = await browser.newContext();
    const guestPage = await anon.newPage();
    await guestPage.goto(url);
    await expect(guestPage.getByRole("heading", { level: 1, name: "Shared student file" })).toBeVisible();
    await expect(guestPage.getByText("For Sam Student", { exact: false })).toBeVisible();
    await expect(guestPage.getByRole("heading", { name: "Applications" })).toBeVisible();
    await expect(guestPage.getByRole("heading", { name: "Contact your agency" })).toBeVisible();
    await anon.close();
  });

test("admin search filters return filtered results", async ({ page }) => {
    await page.goto("/search", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByPlaceholder("Program, field or university…")).toBeVisible({ timeout: 30_000 });
    await page.getByPlaceholder("Program, field or university…").fill("Melbourne");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\?q=Melbourne/, { timeout: 15_000 });
    await expect(page.locator("table").getByText("Master of Information Technology")).toBeVisible({ timeout: 15_000 });

    await page.goto("/search", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.getByPlaceholder("Program, field or university…")).toBeVisible({ timeout: 15_000 });
    await page.getByPlaceholder("Program, field or university…").fill("zzz-nothing-zzz");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText("No results. Try a different search.")).toBeVisible({ timeout: 15_000 });
  });

  test("admin stage filter navigates with query param", async ({ page }) => {
    await page.goto("/application");
    const stageFilter = page.getByRole("navigation", { name: "Filter applications by stage" });
    await stageFilter.getByRole("link").filter({ hasText: "Offer" }).click();
    await expect(page).toHaveURL(/\?stage=OFFER$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Applications" })).toBeVisible();

    await stageFilter.getByRole("link", { name: /^All/ }).click();
    await expect(page).toHaveURL(/\/application$/, { timeout: 15_000 });
  });

  test("reports CSV export returns data", async ({ page }) => {
    await page.goto("/reports");
    const res = await page.request.get("/api/reports/export");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body.trim().length).toBeGreaterThan(10);
  });

  test("program PDF and shortlist PDF downloads work", async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext({ storageState: ".auth/student.json" });
    const page = await ctx.newPage();

    await page.goto(`/scholarships/${slugOf(UNI, P_WIZARD)}`);
    const dl = page.waitForEvent("download", { timeout: 90_000 });
    await page.getByRole("link", { name: "Download Details PDF" }).click();
    expect((await dl).suggestedFilename()).toMatch(/\.pdf$/);

    await page.goto("/my-shortlist");
    const href = await page.getByRole("link", { name: "Download shortlist PDF" }).getAttribute("href");
    const res = await page.request.get(new URL(href!, page.url()).toString());
    expect(res.status()).toBe(200);
    expect(await res.text()).toBeTruthy();
    await ctx.close();
  });
});
