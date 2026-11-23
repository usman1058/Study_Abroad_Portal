import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { CONTRAST_JS, METRICS_JS } from "../.audit-lib";

test("admin builds a short course and enrolled student receives its schedule and materials", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const title = `QA short course ${Date.now()}`;
  const materialTitle = "Week one study guide";
  const meetingLink = "https://meet.example.test/qa-session";
  const materialBytes = Buffer.from("%PDF-1.4\n% short-course material QA\n");
  const receiptBytes = Buffer.from("%PDF-1.4\n% short-course receipt QA\n");
  let courseId: string | null = null;
  let studentContext: Awaited<ReturnType<typeof browser.newContext>> | null = null;
  mkdirSync(".audit-shots/course-workflow", { recursive: true });

  await page.goto("/short-courses");
  await page.screenshot({ path: ".audit-shots/course-workflow/admin-course-list.png", fullPage: true });
  const origin = new URL(page.url()).origin;
  try {
    await page.getByRole("button", { name: "+ Add short course" }).click();
    const courseForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Save draft" }) });
    await expect(courseForm.getByLabel("Title")).toBeFocused();
    await page.screenshot({ path: ".audit-shots/course-workflow/admin-course-create.png", fullPage: true });
    await courseForm.getByLabel("Title").fill(title);
    await courseForm.getByLabel("Provider").fill("Portal QA Instructor");
    await courseForm.getByLabel("Duration").fill("4 weeks");
    await courseForm.getByLabel("Fee (MYR)").fill("250");
    await courseForm.getByLabel("Payment Type").selectOption("PAID");
    await courseForm.getByLabel("Payment instructions").fill("E2E dummy bank transfer details");
    await courseForm.getByLabel("Class schedule overview").fill("Weekly live online classes");
    await courseForm.getByLabel("Course meeting link (optional)").fill(meetingLink);
    await courseForm.getByLabel("Description").fill("A short test course used to verify the complete learning workflow.");

    const createResponsePromise = page.waitForResponse((response) => response.url().endsWith("/api/short-courses") && response.request().method() === "POST");
    await courseForm.getByRole("button", { name: "Save draft" }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);
    courseId = (await createResponse.json()).data.id as string;
    await expect(page.locator(`[data-short-course-id="${courseId}"]`)).toContainText("Draft");
    await expect(page.getByRole("button", { name: "+ Add short course" })).toBeFocused();
    await page.locator(`[data-short-course-id="${courseId}"]`).getByRole("link", { name: "More details" }).click();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    const adminMetrics = JSON.parse(await page.evaluate(METRICS_JS));
    const adminContrast = JSON.parse(await page.evaluate(CONTRAST_JS));
    expect(adminMetrics).toMatchObject({ overflow: 0, unlabeled: 0, h1: 1, targets: [] });
    expect(adminContrast).toEqual([]);
    await page.screenshot({ path: ".audit-shots/course-workflow/admin-course-classroom.png", fullPage: true });

    await page.getByLabel("Class or lesson title").fill("Orientation session");
    await page.getByLabel("Starts").fill("2026-12-10T09:30");
    await page.getByLabel("Ends").fill("2026-12-10T10:30");
    await page.getByLabel("Class time zone").fill("Asia/Kuala_Lumpur");
    await page.getByLabel("Meeting link (optional)").fill(meetingLink);
    const sessionResponsePromise = page.waitForResponse((response) => response.url().includes(`/api/short-courses/${courseId}/sessions`) && response.request().method() === "POST");
    await page.getByRole("button", { name: "Add class session" }).click();
    expect((await sessionResponsePromise).status()).toBe(201);
    await expect(page.getByText("Orientation session", { exact: true }).first()).toBeVisible();

    await page.getByLabel("Material title").fill(materialTitle);
    await page.locator("input[type=file]").setInputFiles({ name: "week-one-guide.pdf", mimeType: "application/pdf", buffer: materialBytes });
    await page.getByRole("checkbox", { name: "Publish now so enrolled students can access it" }).check();
    const materialResponsePromise = page.waitForResponse((response) => response.url().includes(`/api/short-courses/${courseId}/materials`) && response.request().method() === "POST");
    await page.getByRole("button", { name: "Upload material" }).click();
    const materialResponse = await materialResponsePromise;
    expect(materialResponse.status()).toBe(201);
    const materialId = (await materialResponse.json()).data.id as string;
    await expect(page.getByText(materialTitle)).toBeVisible();

    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const editForm = page.locator("form").filter({ hasText: "Edit short course" });
    await editForm.getByLabel("Course visibility").selectOption("active");
    const publishResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/short-courses/${courseId}`) && response.request().method() === "PUT");
    await editForm.getByRole("button", { name: "Publish course" }).click();
    expect((await publishResponsePromise).status()).toBe(200);

    studentContext = await browser.newContext({ storageState: ".auth/student.json", viewport: { width: 390, height: 844 } });
    const studentPage = await studentContext.newPage();
    const courseApiUrl = `${origin}/api/short-courses/${courseId}`;
    const unpublishedDetails = await studentPage.request.get(courseApiUrl);
    expect(unpublishedDetails.status()).toBe(200);
    const publicCourse = (await unpublishedDetails.json()).data;
    expect(publicCourse.bankDetails).toBeUndefined();
    expect(publicCourse.meetingLink).toBeUndefined();
    const lockedMaterial = await studentPage.request.get(`${origin}/api/short-courses/${courseId}/materials/${materialId}`);
    expect(lockedMaterial.status()).toBe(403);

    await studentPage.goto(`${origin}/settings`);
    const currencySave = studentPage.waitForResponse((response) => response.url().endsWith("/api/profile") && response.request().method() === "PUT");
    await studentPage.getByLabel("Currency").last().selectOption("USD");
    expect((await currencySave).status()).toBe(200);

    await studentPage.goto(`${origin}/short-courses/${courseId}`);
    await expect(studentPage.getByRole("heading", { level: 1, name: title })).toBeVisible();
    const studentMetrics = JSON.parse(await studentPage.evaluate(METRICS_JS));
    const studentContrast = JSON.parse(await studentPage.evaluate(CONTRAST_JS));
    expect(studentMetrics).toMatchObject({ overflow: 0, unlabeled: 0, h1: 1, targets: [] });
    expect(studentContrast).toEqual([]);
    await studentPage.screenshot({ path: ".audit-shots/course-workflow/student-course-locked-mobile.png", fullPage: true });
    await expect(studentPage.getByText("Join link unlocks after enrollment confirmation")).toBeVisible();
    await expect(studentPage.getByText(materialTitle)).toHaveCount(0);
    const [calendarDownload] = await Promise.all([
      studentPage.waitForEvent("download"),
      studentPage.getByRole("button", { name: "Add all classes to calendar" }).click(),
    ]);
    const calendar = await readFile((await calendarDownload.path())!, "utf8");
    expect(calendar).toContain("BEGIN:VCALENDAR");
    expect(calendar).toContain("DTSTART:20261210T013000Z");
    expect(calendar).toContain("DTEND:20261210T023000Z");
    expect(calendar).not.toContain(meetingLink);
    const convertedFee = studentPage.locator('span[title^="Approximate display conversion"]');
    await expect(convertedFee.first()).toContainText("US$59.52");
    await expect(convertedFee.first()).toHaveAttribute("title", /MYR/);

    const [enrollResponse] = await Promise.all([
      studentPage.waitForResponse((response) => response.url().endsWith(`/api/short-courses/${courseId}/enroll`) && response.request().method() === "POST"),
      studentPage.getByRole("button", { name: "Enrol and pay" }).click(),
    ]);
    expect(enrollResponse.status()).toBe(201);
    const enrollmentId = (await enrollResponse.json()).data.id as string;
    await expect(studentPage.getByText("Payment pending")).toBeVisible();
    await expect(studentPage.getByText("E2E dummy bank transfer details")).toBeVisible();
    await expect(studentPage.getByRole("link", { name: /Join class/ })).toHaveCount(0);

    const receiptUpload = await studentPage.request.post(`${origin}/api/short-courses/${courseId}/receipt`, {
      data: { fileName: "qa-receipt.pdf", base64: `data:application/pdf;base64,${receiptBytes.toString("base64")}` },
    });
    expect(receiptUpload.status()).toBe(201);
    await studentPage.reload();
    await expect(studentPage.getByText("Receipt under review")).toBeVisible();

    await page.goto("/short-courses");
    const reviewRow = page.getByRole("row").filter({ hasText: title });
    await expect(reviewRow).toBeVisible();
    await expect(reviewRow.getByRole("link", { name: /Open .*'s receipt/ })).toBeVisible();
    const [approvalResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().endsWith(`/api/short-courses/enrollments/${enrollmentId}`) && response.request().method() === "PATCH"),
      reviewRow.getByRole("button", { name: "Approve", exact: true }).click(),
    ]);
    expect(approvalResponse.status()).toBe(200);

    await studentPage.reload();
    await expect(studentPage.getByText("You are enrolled in this course!")).toBeVisible();
    await expect(studentPage.getByText(materialTitle)).toBeVisible();
    await expect(studentPage.getByRole("link", { name: /Join class/ })).toHaveCount(2);
    await studentPage.screenshot({ path: ".audit-shots/course-workflow/student-course-enrolled-mobile.png", fullPage: true });
    const materialDownload = await studentPage.request.get(`${origin}/api/short-courses/${courseId}/materials/${materialId}`);
    expect(materialDownload.status()).toBe(200);
    expect(await materialDownload.body()).toEqual(materialBytes);
  } finally {
    if (studentContext) {
      await studentContext.request.put(`${origin}/api/profile`, { data: { preferredCurrency: "MYR" }, timeout: 10_000 }).catch(() => {});
      await studentContext.close();
    }
    if (courseId) await page.request.delete(`${origin}/api/short-courses/${courseId}`, { timeout: 10_000 }).catch(() => {});
  }
});
