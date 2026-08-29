import { test, expect } from "@playwright/test";
import { BACKEND_URL, TIME_SLOT, selectEventTypeAndToday } from "./support";

/**
 * Integration coverage for the core guest booking journey, driven through a
 * real browser against the real Fastify + SQLite backend (see
 * playwright.config.ts) — no mocks.
 */

test("guest can book an available slot end-to-end and start over", async ({
  page,
}) => {
  await selectEventTypeAndToday(page, "Intro call");

  const firstSlot = page.getByRole("button", { name: TIME_SLOT }).first();
  await firstSlot.click();

  // Confirmation reflects the booked event type.
  await expect(page.getByText("Booking confirmed")).toBeVisible();
  await expect(page.getByText(/Intro call on/)).toBeVisible();

  // The booking is real: it shows up for the owner's schedule/API too.
  const bookings = await page.request.get(`${BACKEND_URL}/bookings`).then((r) => r.json());
  expect(bookings).toHaveLength(1);
  expect(bookings[0].eventType.title).toBe("Intro call");

  // Back button returns the guest to step 1 to book another appointment.
  await page.getByRole("button", { name: /Book another appointment/ }).click();
  await expect(page.getByText("Booking confirmed")).toBeHidden();
  await expect(page.getByRole("button", { name: "Intro call" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Deep dive" })).toBeVisible();
});

test("double-booking the same slot is rejected for whoever loses the race", async ({
  browser,
}) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    await selectEventTypeAndToday(pageA, "Deep dive");
    await selectEventTypeAndToday(pageB, "Deep dive");

    const slotA = pageA.getByRole("button", { name: TIME_SLOT }).first();
    const slotB = pageB.getByRole("button", { name: TIME_SLOT }).first();
    await expect(slotA).toHaveText((await slotB.textContent()) ?? "");

    // Both guests race for the exact same time slot.
    await Promise.all([slotA.click(), slotB.click()]);

    const confirmedOnA = pageA.getByText("Booking confirmed");
    const confirmedOnB = pageB.getByText("Booking confirmed");
    const conflictOnA = pageA.getByText(/just been booked by someone else/);
    const conflictOnB = pageB.getByText(/just been booked by someone else/);

    await expect(confirmedOnA.or(conflictOnA)).toBeVisible();
    await expect(confirmedOnB.or(conflictOnB)).toBeVisible();

    const aWon = await confirmedOnA.isVisible();
    const bWon = await confirmedOnB.isVisible();

    // Exactly one guest gets the slot; the other sees the 409 conflict.
    expect(aWon).not.toBe(bWon);
    await expect(aWon ? conflictOnB : conflictOnA).toBeVisible();

    const bookings = await pageA.request.get(`${BACKEND_URL}/bookings`).then((r) => r.json());
    expect(bookings.filter((b: { eventType: { title: string } }) => b.eventType.title === "Deep dive")).toHaveLength(1);
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
