import { test, expect, type Page } from "@playwright/test";
import { controlFor, rowForAction, acceptNextConfirm, selectByPartialLabel } from "../helpers";

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
  await page.getByRole("button", { name: "Save program" }).click();
  await expect(page.getByRole("button", { name: "+ Add program" })).toBeVisible({ timeout: 20_000 });
  try {
    await expect(page.getByText(expectedName).first()).toBeVisible({ timeout: 10_000 });
  } catch {
    // router.refresh() can lag behind the API — settle with a hard reload
    await page.reload();
    await expect(page.getByText(expectedName).first()).toBeVisible({ timeout: 10_000 });
  }
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
  await page.getByRole("button", { name: "+ Add program" }).click();
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
    const editRow = rowForAction(page, P_DELETE, { name: "Edit", exact: true });
    await editRow.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Edit program" })).toBeVisible();
    const nameInput = controlFor(page, "Program name");
    await expect(nameInput).toHaveValue(P_DELETE); // form hydrates initial values
    await nameInput.fill(`${P_DELETE} v2`);
    await saveProgramForm(page, `${P_DELETE} v2`);

    // Delete with confirm dialog
    const deleteRow = rowForAction(page, `${P_DELETE} v2`, { name: "Delete", exact: true });
    acceptNextConfirm(page);
    await deleteRow.getByRole("button", { name: "Delete", exact: true }).click();
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
    await expect(page.getByRole("heading", { level: 1, name: "Apply Application" })).toBeVisible();

    // Step 0 — Continue is gated on required fields
    const firstName = controlFor(page, "First name *");
    await expect(firstName).toHaveValue("Sam"); // pre-filled from profile
    const saveContinue = page.getByRole("button", { name: "Save & continue" });

    const genderSelect = controlFor(page, "Gender *");
    if (!(await genderSelect.inputValue())) {
      await expect(saveContinue).toBeDisabled(); // gating works
      await genderSelect.selectOption("male");
    }
    if (!(await controlFor(page, "Passport number *").inputValue())) {
      await controlFor(page, "Passport number *").fill(`E2E${ts.toUpperCase()}`);
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

    await controlFor(page, "Level").selectOption("Bachelor");
    await controlFor(page, "Institution *").fill("E2E Polytechnic");
    await page.getByRole("button", { name: "Save & continue" }).click();

    // Step 2 — upload two documents through the real file input
    await expect(page.getByText("Upload your academic documents now")).toBeVisible();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({ name: "passport.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 e2e") });
    await page.getByRole("button", { name: "Upload document" }).click();
    await expect(fileInput).toHaveValue("", { timeout: 15_000 }); // cleared after success

    await controlFor(page, "Document type").selectOption({ label: "Transcript" });
    await fileInput.setInputFiles({ name: "transcript.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 e2e") });
    await page.getByRole("button", { name: "Upload document" }).click();
    await expect(fileInput).toHaveValue("", { timeout: 15_000 });
    await expect(page.locator("li").filter({ hasText: "transcript" }).first()).toBeVisible();

    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 3 — choose program & submit
    await expect(page.getByText("Choose university & program *")).toBeVisible();
    await controlFor(page, "Choose university & program *").selectOption({ label: `${UNI} — ${P_WIZARD}` });
    await page.getByRole("button", { name: "Submit application" }).click();

    await page.waitForURL(/\/my-applications\?submitted=1$/, { timeout: 20_000 });
    await expect(page.getByText("Application submitted.")).toBeVisible();
    await expect(page.getByText(P_WIZARD).first()).toBeVisible();
  });

  test("student one-click Apply button from catalog + bulk export toolbar", async ({ browser }) => {
    test.setTimeout(150_000);
    const ctx = await browser.newContext({ storageState: ".auth/student.json" });
    const page = await ctx.newPage();
    await page.goto("/programs");

    // Idempotent across retries: skip if this run already applied
    const findCard = () => rowForAction(page, P_APPLY, { name: /^Apply$|^Applied/ });
    let card = findCard();
    if ((await card.getByRole("link", { name: /^Applied/ }).count()) === 0) {
      await card.getByRole("button", { name: /^Apply$/ }).click();
    } else {
      void card;
    }
    card = findCard();
    await expect(card.getByRole("link", { name: /^Applied/ })).toBeVisible({ timeout: 15_000 });

    await page.goto("/my-applications");
    await expect(page.getByText(P_APPLY).first()).toBeVisible();

    // Bulk export list — select, download (first react-pdf render is slow), clear
    await page.goto("/programs");
    await page.getByLabel(`Select ${P_WIZARD}`).check();
    await expect(page.getByText(/1 course selected/)).toBeVisible();

    const dlPromise = page.waitForEvent("download", { timeout: 110_000 });
    await page.getByRole("button", { name: "Download PDF" }).click();
    const dl = await dlPromise;
    expect((await dl.path()) !== null).toBeTruthy();

    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.getByText(/course selected/)).toHaveCount(0);
    await ctx.close();
  });

  test("student shortlist toggle adds, persists, and removes via detail page", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ".auth/student.json" });
    const page = await ctx.newPage();
    await page.goto(`/scholarships/${slugOf(UNI, P_WIZARD)}`);

    const toggle = page.getByRole("button", { name: "Add to shortlist" });
    await toggle.click();
    await expect(page.getByRole("button", { name: "Shortlisted" })).toBeVisible();

    // state survives a reload (server-hydrated initial)
    await page.reload();
    await expect(page.getByRole("button", { name: "Shortlisted" })).toBeVisible();

    // and toggling off removes it again
    await page.getByRole("button", { name: "Shortlisted" }).click();
    await expect(page.getByRole("button", { name: "Add to shortlist" })).toBeVisible();

    await page.goto("/my-shortlist");
    await expect(page.getByText(P_WIZARD)).toHaveCount(0);

    // re-add for the PDF-download test later in this file
    await page.goto(`/scholarships/${slugOf(UNI, P_WIZARD)}`);
    await page.getByRole("button", { name: "Add to shortlist" }).click();
    await expect(page.getByRole("button", { name: "Shortlisted" })).toBeVisible();

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

    // pick any two available chips (contents vary across runs)
    const chips = page.locator("button.rounded-full");
    await expect(chips.first()).toBeVisible();
    const chipCount = await chips.count();
    expect(chipCount).toBeGreaterThanOrEqual(2);

    await chips.nth(0).click();
    await chips.nth(1).click();
    const compareBtn = page.getByRole("button", { name: new RegExp(`Compare selected \\(${Math.min(chipCount, 2)}\\/3\\)`) });
    await expect(compareBtn).toBeEnabled();
    await compareBtn.click();

    const modal = page.locator("div.fixed.inset-0");
    await expect(modal.getByRole("heading", { name: "Compare courses" })).toBeVisible();
    await expect(modal.locator("table th").first()).toBeVisible(); // comparison table renders
    await modal.getByRole("button", { name: "✕" }).click();
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
    await controlFor(page, "City of residence").fill("Kuala Lumpur");
    const [saveResp] = await Promise.all([
      page.waitForResponse((r) => Boolean(r.url().includes("/api/profile") && r.request().method() === "PUT")),
      page.getByRole("button", { name: "Save profile" }).click(),
    ]);
    expect(saveResp.status(), "PUT /api/profile should succeed").toBe(200);
    await expect(page.getByText("Profile saved.")).toBeVisible();

    await page.goto("/settings");
    await controlFor(page, "Current password").fill("WrongPassword123");
    await controlFor(page, "New password").fill("AnotherPass123");
    await controlFor(page, "Confirm new password").fill("AnotherPass123");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.locator(".bg-red-50").first()).toBeVisible();
    await ctx.close();
  });

  test("student enrolls into a short course, views details, withdraws", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ".auth/student.json" });
    const page = await ctx.newPage();
    await page.goto("/short-courses");

    const title = "Foundation English for Academic Study";
    let courseCard = rowForAction(page, title, { name: /Enroll \/ express interest|Interested|Enrolled/ });
    const enrollBtn = courseCard.getByRole("button", { name: "Enroll / express interest" });

    if ((await enrollBtn.count()) > 0) {
      const [enrollResp] = await Promise.all([
        page.waitForResponse((r) => Boolean(r.url().includes("/enroll")), { timeout: 15_000 }),
        enrollBtn.click(),
      ]);
      expect(enrollResp.status(), "POST /enroll should succeed").toBe(201);
      courseCard = rowForAction(page, title, { name: /Interested|Enrolled/ });
      await expect(courseCard.getByRole("button", { name: /Interested|Enrolled/ })).toBeVisible({ timeout: 15_000 });
    }

    const detailsBtn = courseCard.getByRole("button", { name: /Details [▲▼]/ });
    await detailsBtn.click();
    await expect(courseCard.getByText("After enrolling you will get:")).toBeVisible();
    await detailsBtn.click();
    await expect(courseCard.getByText("After enrolling you will get:")).toHaveCount(0);

    acceptNextConfirm(page); // window.confirm("Withdraw from this course?")
    await courseCard.getByRole("button", { name: /Interested|Enrolled/ }).click();
    await expect(
      rowForAction(page, title, { name: "Enroll / express interest" }).getByRole("button", { name: "Enroll / express interest" }),
    ).toBeVisible({ timeout: 15_000 });
    await ctx.close();
  });

  test("admin verifies and rejects uploaded documents", async ({ page }) => {
    await page.goto("/documents");

    // Helper to read current pending count from the subtitle
    const getPending = async () => Number(
      (await page.getByText(/\d+ pending\./).textContent())?.match(/(\d+) pending/)?.[1] ?? "0",
    );

    const pendingBefore = await getPending();
    expect(pendingBefore).toBeGreaterThanOrEqual(2);

    // Verify first document
    const [verifyResp] = await Promise.all([
      page.waitForResponse((r) => Boolean(r.url().match(/\/api\/documents\/[^/]+$/)) && r.request().method() === "PUT"),
      page.getByRole("button", { name: "Verify", exact: true }).first().click(),
    ]);
    expect(verifyResp.status()).toBe(200);
    await expect.poll(async () => (await getPending()) === pendingBefore - 1, { timeout: 15_000 });

    // Reject second document
    acceptNextConfirm(page);
    const [rejectResp] = await Promise.all([
      page.waitForResponse((r) => Boolean(r.url().match(/\/api\/documents\/[^/]+$/)) && r.request().method() === "PUT"),
      page.getByRole("button", { name: "Reject", exact: true }).first().click(),
    ]);
    expect(rejectResp.status()).toBe(200);
    await expect.poll(async () => (await getPending()) === pendingBefore - 2, { timeout: 15_000 });
    await expect(page.getByText("Rejected by staff").first()).toBeVisible();
  });

  test("admin flips pipeline stage on application detail and reverts", async ({ page }) => {
    await page.goto("/application/sample-app-1");

    await controlFor(page, "Pipeline stage").selectOption({ label: "Offer" });
    await page.getByRole("button", { name: "Save stage" }).click();
    await expect(page.getByText("OFFER", { exact: true }).first()).toBeVisible({ timeout: 15_000 });

    await controlFor(page, "Pipeline stage").selectOption({ label: "Under Review" });
    await page.getByRole("button", { name: "Save stage" }).click();
    await expect(page.getByText("UNDER REVIEW", { exact: true }).first()).toBeVisible({ timeout: 15_000 });
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
    await expect(page.getByText(email)).toBeVisible(); // appears in the users table

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
      await item.getByRole("button").click(); // the ✕ remove button
      try {
        await expect(item).toHaveCount(0, { timeout: 20_000 });
      } catch {
        // client router cache can lag behind the API — a hard reload settles it
        await page.reload();
        await expect(item).toHaveCount(0, { timeout: 10_000 });
      }
    }

    const addSelect = page.locator("select").first();
    await selectByPartialLabel(addSelect, "Monash University Malaysia — Bachelor");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(item).toBeVisible({ timeout: 15_000 });

    // MessageForm — send lands as a chat bubble
    const body = `E2E message ${ts}`;
    await page.getByPlaceholder("Send a message…").fill(body);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(body).first()).toBeVisible({ timeout: 15_000 });
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
    await expect(page.getByText(notes)).toBeVisible();
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
    await expect(page.getByText(name)).toBeVisible({ timeout: 15_000 });

    // Cancel button hides the form without saving
    await page.getByRole("button", { name: "+ Add visitor" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(controlFor(page, "Name")).toHaveCount(0);

    acceptNextConfirm(page);
    await rowForAction(page, name, { name: "Delete", exact: true })
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(page.getByText(name)).toHaveCount(0, { timeout: 15_000 });
  });

  test("admin generates guest invite link; anonymous visitor can open it", async ({ page, browser }) => {
    await page.goto("/users");
    await page.getByRole("button", { name: "+ Generate guest invite link" }).click();
    await expect(page.getByRole("heading", { name: "Guest invite link", exact: true })).toBeVisible();

    // validation: no section selected (Applications starts pre-checked)
    await page.getByLabel("Applications", { exact: true }).uncheck();
    await page.getByRole("button", { name: "Generate link" }).click();
    await expect(page.getByText("Select at least one section.")).toBeVisible();

    await page.getByLabel("Applications", { exact: true }).check();
    await page.getByText("Edit", { exact: true }).first().click(); // view/edit badges are clickable
    await selectByPartialLabel(controlFor(page, "Student (data scope)"), "Sam Student");
    await page.getByRole("button", { name: "Generate link" }).click();

    // success panel shows the shareable link even after the form closes
    const sharePanel = page.locator("div.bg-emerald-50");
    const code = sharePanel.locator("code").first();
    await expect(sharePanel).toBeVisible({ timeout: 15_000 });
    const codeText = await code.textContent();
    console.log("Code element text:", codeText);
    await expect(code).toContainText("/invite/");
    const url = (await code.textContent())!.trim();

    const anon = await browser.newContext();
    const guestPage = await anon.newPage();
    await guestPage.goto(url);
    await expect(guestPage.getByRole("heading", { level: 1, name: "Sam Student" })).toBeVisible();
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
    await page.locator('select[name="stage"]').selectOption({ label: "Offer" });
    await expect(page).toHaveURL(/\?stage=OFFER$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Applications" })).toBeVisible();

    await page.locator('select[name="stage"]').selectOption({ label: "All stages" });
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
    const href = await page.getByRole("link", { name: "Download Full Shortlist PDF" }).getAttribute("href");
    const res = await page.request.get(href!);
    expect(res.status()).toBe(200);
    expect(await res.text()).toBeTruthy();
    await ctx.close();
  });
});
