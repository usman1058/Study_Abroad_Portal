import { test, expect } from "@playwright/test";

const ADMIN_PAGES: [string, RegExp][] = [
  ["/home", /Good to see you/],
  ["/users", /^Users$/],
  ["/programs", /^Programs$/],
  ["/short-courses", /^Short courses$/],
  ["/search", /^Search$/],
  ["/application", /^Applications$/],
  ["/partner-commissions", /^Partner Commissions$/],
  ["/transaction", /^Transactions$/],
  ["/documents", /^Documents$/],
  ["/reports", /^Reports$/],
  ["/visitor-form", /^Visitor leads$/],
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
      await expect(page.getByRole("complementary", { name: "Main navigation" })).toBeVisible();
    });
  }

  test("sidebar shows partner nav only (no student sections)", async ({ page }) => {
    await page.goto("/home");
    const nav = page.getByRole("complementary", { name: "Main navigation" }).getByRole("navigation");
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
    await expect(page.getByRole("row").filter({ hasText: "student@studyabroad.test" })).toBeVisible();

    const studentRow = page.getByRole("row").filter({ hasText: "student@studyabroad.test" });
    await studentRow.getByRole("link", { name: "Sam Student" }).click();
    await expect(page).toHaveURL(/\/users\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1, name: "Sam Student" })).toBeVisible();
    await expect(page.getByText("Applications").first()).toBeVisible();
  });

  test("applications list shows seeded application and detail page opens", async ({ page }) => {
    await page.goto("/application");
    await expect(page.getByRole("link", { name: "Bachelor of Computer Science" }).first()).toBeVisible();

    await page.getByRole("link", { name: "Bachelor of Computer Science" }).first().click();
    await expect(page).toHaveURL(/\/application\/[^/]+$/);
    await expect(page.getByRole("heading", { name: "Pipeline" })).toBeVisible();
  });

  test("program with applications cannot be deleted", async ({ page }) => {
    const list = await page.request.get("/api/applications?limit=100");
    expect(list.status()).toBe(200);
    const payload = await list.json();
    const application = payload.data.data.find(
      (item: { program?: { name?: string } }) => item.program?.name === "Bachelor of Computer Science",
    );
    expect(application?.programId).toBeTruthy();

    const deletion = await page.request.delete(`/api/scholarships/${application.programId}`);
    expect(deletion.status()).toBe(409);
    const deletionBody = await deletion.json();
    expect(deletionBody.success).toBe(false);
    expect(deletionBody.error).toMatch(/applications? and cannot be deleted/i);

    const after = await page.request.get("/api/applications?limit=100");
    const afterPayload = await after.json();
    expect(afterPayload.data.data.some((item: { id: string }) => item.id === application.id)).toBe(true);
  });

  test("transactions list shows seeded transaction", async ({ page }) => {
    await page.goto("/transaction");
    await expect(page.getByText("Service fee for the Bachelor of Computer Science application").last()).toBeVisible();
  });

  test("super admin can edit a partner commission rate", async ({ page }) => {
    await page.goto("/partner-commissions");
    const editRate = page.getByRole("button", { name: /Edit commission/ }).first();
    await editRate.click();
    const rate = page.getByLabel("Commission rate (%)");
    const original = await rate.inputValue();
    await rate.fill("12.5");
    await page.getByRole("button", { name: "Save rate" }).click();
    await expect(page.getByText("12.5%", { exact: true }).last()).toBeVisible();

    await page.getByRole("button", { name: /Edit commission/ }).first().click();
    await page.getByLabel("Commission rate (%)").fill(original);
    await page.getByRole("button", { name: "Save rate" }).click();
  });

  test("admin cannot open student pages", async ({ page }) => {
    for (const route of ["/my-applications", "/apply", "/my-shortlist"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/home\/?$/);
      await expect(page.getByRole("complementary", { name: "Main navigation" })).toBeVisible();
    }
  });

  test("admin can upload, publish, and remove a dashboard carousel image", async ({ page }) => {
    const title = `E2E carousel ${Date.now()}`;
    await page.goto("/home");
    await page.getByRole("button", { name: "Manage advertisements" }).click();
    await page.getByRole("button", { name: "New" }).click();
    await page.locator("input[required]").fill(title);
    await page.getByLabel("Upload advertisement image").setInputFiles({
      name: "carousel.png",
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mNk+M/wHwAF/gL+4bY5WQAAAABJRU5ErkJggg==", "base64"),
    });
    await expect(page.getByAltText("Advertisement preview")).toBeVisible();
    await page.getByRole("button", { name: "Create announcement" }).click();
    const deleteButton = page.getByRole("button", { name: `Delete ${title}` });
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();
    await page.getByRole("button", { name: "Delete announcement" }).click();
    await expect(deleteButton).toHaveCount(0);
  });

  test("main dashboard renders the application trend graph", async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByRole("img", { name: "Applications over the last six months" })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Dashboard carousel" })).toBeVisible();
  });
});
