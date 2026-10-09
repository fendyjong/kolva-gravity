import { expect, test, type Page } from "@playwright/test";

function region(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

test("add, complete, undo, move and drop a task", async ({ page }, testInfo) => {
  const name = `Write the report (${testInfo.project.name})`;
  await page.goto("/");
  const version = region(page, "Next version");
  const schedule = region(page, "Schedule");
  const row = (where: typeof version) => where.getByRole("button", { name, exact: true });

  // Add: Enter adds to the bottom of the quadrant.
  const input = version.getByRole("textbox", { name: "Add task to Next version" });
  await input.fill(name);
  await input.press("Enter");
  await expect(row(version)).toBeVisible();
  await expect(input).toHaveValue("");

  // Complete: the row leaves the quadrant and shows under Done today.
  await version.getByRole("checkbox", { name: `Complete ${name}` }).click();
  await expect(region(page, "Done today").getByText(name)).toBeVisible();
  await expect(row(version)).toHaveCount(0);

  // Undo: reopens it.
  await region(page, "Done today").getByRole("button", { name: `Undo ${name}` }).click();
  await expect(row(version)).toBeVisible();

  // Move down a quadrant through the inline ⋯ menu.
  await version.getByRole("button", { name: `Actions for ${name}` }).click();
  await version.getByRole("button", { name: "Move down a quadrant" }).click();
  await expect(row(schedule)).toBeVisible();
  await expect(row(version)).toHaveCount(0);

  // Drop, which asks for confirmation in place.
  await schedule.getByRole("button", { name: `Actions for ${name}` }).click();
  await schedule.getByRole("button", { name: "Drop", exact: true }).click();
  // Nothing is dropped until the confirmation.
  await expect(row(schedule)).toBeVisible();
  await schedule.getByRole("button", { name: "Confirm drop" }).click();
  await expect(page.getByText(name)).toHaveCount(0);
});

test("edits a description in place", async ({ page }, testInfo) => {
  const name = `Draft the plan (${testInfo.project.name})`;
  const renamed = `Draft the plan, v2 (${testInfo.project.name})`;
  await page.goto("/");
  const later = region(page, "Later");
  const input = later.getByRole("textbox", { name: "Add task to Later" });
  await input.fill(name);
  await input.press("Enter");
  await later.getByRole("button", { name, exact: true }).click();
  const editor = later.getByRole("textbox", { name: `Edit ${name}` });
  await editor.fill(renamed);
  await editor.press("Enter");
  await expect(later.getByRole("button", { name: renamed, exact: true })).toBeVisible();
});

test("re-renders from the server when the tab becomes visible again", async ({ page, context }, testInfo) => {
  const name = `Added in another tab (${testInfo.project.name})`;
  await page.goto("/");

  const other = await context.newPage();
  await other.goto("/");
  const input = region(other, "Delegate").getByRole("textbox", { name: "Add task to Delegate" });
  await input.fill(name);
  await input.press("Enter");
  await expect(region(other, "Delegate").getByRole("button", { name, exact: true })).toBeVisible();
  await other.close();

  const delegate = region(page, "Delegate");
  await expect(delegate.getByRole("button", { name, exact: true })).toHaveCount(0);
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(delegate.getByRole("button", { name, exact: true })).toBeVisible();
});

test("one column below 768px, a 2×2 grid above, and never a horizontal scroll", async ({ page }, testInfo) => {
  await page.goto("/");
  // A long unbroken word is the classic way to force horizontal scroll.
  const input = region(page, "Later").getByRole("textbox", { name: "Add task to Later" });
  await input.fill(`Read https://example.com/${"very-long-path-segment-".repeat(6)} (${testInfo.project.name})`);
  await input.press("Enter");

  const version = await region(page, "Next version").boundingBox();
  const schedule = await region(page, "Schedule").boundingBox();
  expect(version).not.toBeNull();
  expect(schedule).not.toBeNull();
  if (!version || !schedule) return;

  const width = page.viewportSize()?.width ?? 0;
  if (width < 768) {
    expect(schedule.y).toBeGreaterThanOrEqual(version.y + version.height);
    expect(Math.round(schedule.x)).toBe(Math.round(version.x));
  } else {
    expect(Math.round(schedule.y)).toBe(Math.round(version.y));
    expect(schedule.x).toBeGreaterThanOrEqual(version.x + version.width);
  }

  // The quadrant header sticks while scrolling the single column, and is plain in the grid.
  const headerPosition = await region(page, "Next version")
    .locator("header")
    .evaluate((element) => getComputedStyle(element).position);
  expect(headerPosition).toBe(width < 768 ? "sticky" : "static");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
