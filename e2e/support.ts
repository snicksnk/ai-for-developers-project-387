import { expect, type Page } from "@playwright/test";

export { BACKEND_URL } from "./ports";

/** Matches a slot button's "HH:mm" label. */
export const TIME_SLOT = /^\d{2}:\d{2}$/;

/**
 * Guest flow steps 1-2: open the guest page, pick an event type, pick
 * today's date, and wait until at least one time slot is available.
 */
export async function selectEventTypeAndToday(page: Page, eventTypeName: string) {
  await page.goto("/");
  await page.getByRole("button", { name: eventTypeName }).click();
  await page.locator("button[data-today]").first().click();
  await expect(page.getByRole("button", { name: TIME_SLOT }).first()).toBeVisible();
}

/**
 * Locates the owner dashboard's event-type list row for a given title.
 * Matches the title element's exact text (not a substring, so "Foo" doesn't
 * also match a row titled "Foo (edited)") and requires Edit/Delete buttons
 * so it never matches a same-titled entry in the schedule list below.
 */
export function eventTypeRow(page: Page, title: string) {
  return page
    .locator("div.rounded-md.border.p-3")
    .filter({ has: page.getByText(title, { exact: true }) })
    .filter({ has: page.getByRole("button", { name: "Edit" }) });
}

/** Locates an owner dashboard schedule entry for a given event type title. */
export function scheduleRow(page: Page, title: string) {
  return page
    .locator("div.rounded-md.border.p-3")
    .filter({ has: page.getByText(title, { exact: true }) })
    .filter({ hasNot: page.getByRole("button", { name: "Edit" }) });
}
