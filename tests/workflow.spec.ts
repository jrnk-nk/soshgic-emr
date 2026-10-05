import { test, expect } from "@playwright/test";
test("nurse handover, doctor signing and traceable amendment", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open visit for Abena Owusu" })
    .click();
  await page
    .getByRole("button", { name: "Send to doctor", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Confirm");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("textbox", { name: "Nurse assessment", exact: true })
    .fill("Fictional assessment for workflow review.");
  await page
    .getByRole("button", { name: "Send to doctor", exact: true })
    .click();
  await expect(page.locator(".drawer-meta")).toContainText("Awaiting doctor");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByLabel("Demo staff role").selectOption("Doctor");
  await page
    .getByRole("button", { name: "Open visit for Abena Owusu" })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Nurse assessment", exact: true }),
  ).toBeDisabled();
  await page.getByRole("tab", { name: "Consultation", exact: true }).click();
  await page.getByRole("button", { name: "Begin consultation" }).click();
  await page
    .getByRole("textbox", { name: "Assessment and diagnosis", exact: true })
    .fill("Fictional doctor assessment.");
  await page
    .getByLabel("Care plan", { exact: true })
    .fill("Fictional follow-up plan.");
  await page
    .getByLabel("Follow-up and return instructions")
    .fill("Fictional return instructions.");
  await page.getByRole("button", { name: "Sign doctor visit" }).click();
  await expect(page.getByText("Original · Doctor")).toBeVisible();
  await page
    .getByLabel("Add an amendment")
    .fill("Corrected fictional onset time; transcription error.");
  await page.getByRole("button", { name: "Save amendment" }).click();
  await expect(page.getByText("Original · Doctor")).toBeVisible();
  await expect(page.getByText("Amendment · Doctor")).toBeVisible();
  await page.getByRole("tab", { name: "Consultation", exact: true }).click();
  await expect(
    page.getByRole("textbox", {
      name: "Assessment and diagnosis",
      exact: true,
    }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});
test("treatment events stay separate and urgent care bypasses queue", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open visit for Akosua Mensah" })
    .click();
  await page.getByRole("button", { name: "Urgent care", exact: true }).click();
  await expect(page.locator(".drawer-meta")).toContainText("Urgent care");
  await page.getByRole("checkbox").check();
  await page.getByRole("tab", { name: "Treatment" }).click();
  await page
    .getByLabel("Medication or treatment details")
    .fill("Fictional treatment event for demonstration.");
  await page.getByRole("button", { name: "Record event" }).click();
  await expect(page.locator(".timeline-note")).toHaveCount(1);
  await expect(page.locator(".timeline-note")).toContainText("Administered");
  await expect(page.locator(".timeline-note")).not.toContainText("Prescribed");
});
test("student search and follow-up completion", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New visit", exact: true }).click();
  await page.getByLabel("Find student", { exact: true }).fill("ST-0332");
  await page.getByRole("button", { name: /Yaw Osei/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Yaw Osei");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page
    .locator("nav")
    .getByRole("button", { name: /Follow-ups/ })
    .click();
  await page
    .getByRole("button", {
      name: "Complete Review student in observation",
      exact: true,
    })
    .click();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
});
test("desktop and mobile surfaces render without page overflow", async ({
  page,
}) => {
  await page.goto("/");
  await page.screenshot({
    path: "/workspace/scratch/clinic-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "New visit", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "/workspace/scratch/clinic-mobile.png",
    fullPage: true,
  });
});
