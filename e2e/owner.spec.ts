import { test, expect } from "@playwright/test";
import { TIME_SLOT, selectEventTypeAndToday, eventTypeRow, scheduleRow } from "./support";

/**
 * Integration coverage for the owner's event-type management, driven
 * through a real browser against the real Fastify + SQLite backend — no
 * mocks. Also checks that owner changes are immediately visible to guests,
 * since both roles read/write the same backend.
 */

test("owner can create, edit, and delete an event type, and it reflects on the guest page", async ({
  page,
}) => {
  await page.goto("/owner");

  // Create.
  await page.getByLabel("Title").fill("E2E Test Type");
  await page.getByLabel("Duration (minutes)").fill("20");
  await page.getByRole("button", { name: "Create event type" }).click();

  const created = eventTypeRow(page, "E2E Test Type");
  await expect(created).toBeVisible();
  await expect(created).toContainText("20 min");

  // The new event type is immediately bookable by a guest.
  await page.goto("/");
  await expect(page.getByRole("button", { name: "E2E Test Type" })).toBeVisible();

  // Edit.
  await page.goto("/owner");
  await created.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Title").fill("E2E Test Type (edited)");
  await page.getByLabel("Duration (minutes)").fill("25");
  await page.getByRole("button", { name: "Save changes" }).click();

  const edited = eventTypeRow(page, "E2E Test Type (edited)");
  await expect(edited).toBeVisible();
  await expect(edited).toContainText("25 min");
  await expect(eventTypeRow(page, "E2E Test Type")).toHaveCount(0);

  // Delete.
  await edited.getByRole("button", { name: "Delete" }).click();
  await expect(eventTypeRow(page, "E2E Test Type (edited)")).toHaveCount(0);

  // The deleted event type is no longer offered to guests.
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "E2E Test Type (edited)" })
  ).toHaveCount(0);
});

test("a guest booking made against the real backend shows up in the owner's schedule", async ({
  page,
}) => {
  await selectEventTypeAndToday(page, "Intro call");
  await page.getByRole("button", { name: TIME_SLOT }).first().click();
  await expect(page.getByText("Booking confirmed")).toBeVisible();

  await page.goto("/owner");
  await expect(
    page.getByRole("heading", { name: "Schedule (next 14 days)" })
  ).toBeVisible();
  // At least one schedule entry for this event type; other tests in this
  // suite may add further bookings on the same day, so don't assume count.
  await expect(scheduleRow(page, "Intro call").first()).toBeVisible();
});
