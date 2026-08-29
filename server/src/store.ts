/**
 * Data access + booking domain logic, backed by SQLite (see db.ts).
 *
 * Occupancy rule (per AGENTS.md): a booking blocks its time slot for ALL event
 * types. Double-booking an overlapping interval returns a conflict.
 */
import { randomUUID } from "node:crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { db } from "./db.js";

dayjs.extend(utc);

export interface EventType {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
}

export interface Booking {
  id: string;
  eventType: EventType;
  startTime: string;
  createdAt: string;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
}

const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;

export function generateId(): string {
  return randomUUID();
}

// ==== Row <-> domain mapping ====

interface EventTypeRow {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
}

function rowToEventType(row: EventTypeRow): EventType {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    durationMinutes: row.durationMinutes,
  };
}

interface BookingRow {
  id: string;
  startTime: string;
  createdAt: string;
  et_id: string;
  et_title: string;
  et_description: string | null;
  et_durationMinutes: number;
}

const BOOKING_SELECT = `
  SELECT
    b.id AS id,
    b.startTime AS startTime,
    b.createdAt AS createdAt,
    et.id AS et_id,
    et.title AS et_title,
    et.description AS et_description,
    et.durationMinutes AS et_durationMinutes
  FROM bookings b
  JOIN event_types et ON et.id = b.eventTypeId
`;

function rowToBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    startTime: row.startTime,
    createdAt: row.createdAt,
    eventType: rowToEventType({
      id: row.et_id,
      title: row.et_title,
      description: row.et_description,
      durationMinutes: row.et_durationMinutes,
    }),
  };
}

function intervalsOverlap(
  startA: dayjs.Dayjs,
  endA: dayjs.Dayjs,
  startB: dayjs.Dayjs,
  endB: dayjs.Dayjs
): boolean {
  return startA.isBefore(endB) && endA.isAfter(startB);
}

export function findBookingConflict(
  startTime: dayjs.Dayjs,
  endTime: dayjs.Dayjs
): Booking | undefined {
  const rows = db.prepare(BOOKING_SELECT).all() as BookingRow[];
  const conflicting = rows.find((row) => {
    const existingStart = dayjs.utc(row.startTime);
    const existingEnd = existingStart.add(row.et_durationMinutes, "minute");
    return intervalsOverlap(startTime, endTime, existingStart, existingEnd);
  });
  return conflicting ? rowToBooking(conflicting) : undefined;
}

// ==== Event types ====

export function listEventTypes(): EventType[] {
  const rows = db
    .prepare("SELECT * FROM event_types ORDER BY rowid")
    .all() as EventTypeRow[];
  return rows.map(rowToEventType);
}

export function createEventType(input: {
  id?: string;
  title: string;
  description?: string;
  durationMinutes: number;
}): EventType {
  const eventType: EventType = {
    id: input.id || generateId(),
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    durationMinutes: Math.floor(input.durationMinutes),
  };
  db.prepare(
    `INSERT INTO event_types (id, title, description, durationMinutes)
     VALUES (@id, @title, @description, @durationMinutes)`
  ).run({ ...eventType, description: eventType.description ?? null });
  return eventType;
}

export function updateEventType(
  id: string,
  input: { title: string; description?: string; durationMinutes: number }
): EventType | null {
  const existing = db
    .prepare("SELECT * FROM event_types WHERE id = ?")
    .get(id) as EventTypeRow | undefined;
  if (!existing) return null;

  const updated: EventType = {
    id,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    durationMinutes: Math.floor(input.durationMinutes),
  };
  db.prepare(
    `UPDATE event_types SET title = @title, description = @description, durationMinutes = @durationMinutes
     WHERE id = @id`
  ).run({ ...updated, description: updated.description ?? null });
  return updated;
}

export function deleteEventType(id: string): boolean {
  const result = db.prepare("DELETE FROM event_types WHERE id = ?").run(id);
  return result.changes > 0;
}

export function findEventType(id: string): EventType | undefined {
  const row = db
    .prepare("SELECT * FROM event_types WHERE id = ?")
    .get(id) as EventTypeRow | undefined;
  return row ? rowToEventType(row) : undefined;
}

// ==== Bookings ====

export function listBookings(): Booking[] {
  const rows = db
    .prepare(`${BOOKING_SELECT} ORDER BY b.startTime`)
    .all() as BookingRow[];
  return rows.map(rowToBooking);
}

export interface CreateBookingBody {
  eventTypeId: string;
  startTime: string;
}

export type CreateBookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: "event-type-not-found" | "invalid-start" | "conflict" };

export function createBooking(input: CreateBookingBody): CreateBookingResult {
  const eventType = findEventType(input.eventTypeId);
  if (!eventType) return { ok: false, reason: "event-type-not-found" };

  const startTime = dayjs.utc(input.startTime);
  if (!startTime.isValid()) return { ok: false, reason: "invalid-start" };

  const endTime = startTime.add(eventType.durationMinutes, "minute");
  if (findBookingConflict(startTime, endTime)) {
    return { ok: false, reason: "conflict" };
  }

  const booking: Booking = {
    id: generateId(),
    eventType,
    startTime: startTime.toISOString(),
    createdAt: dayjs.utc().toISOString(),
  };
  db.prepare(
    `INSERT INTO bookings (id, eventTypeId, startTime, createdAt)
     VALUES (@id, @eventTypeId, @startTime, @createdAt)`
  ).run({
    id: booking.id,
    eventTypeId: booking.eventType.id,
    startTime: booking.startTime,
    createdAt: booking.createdAt,
  });
  return { ok: true, booking };
}

// ==== Schedule ====

export function getSchedule(days: number, fromDate?: string): Booking[] {
  const from = fromDate ? dayjs.utc(fromDate) : dayjs.utc().startOf("day");
  if (!from.isValid()) return [];

  const safeDays = Math.max(1, Math.floor(days) || 14);
  const to = from.add(safeDays, "day");

  const rows = db
    .prepare(`${BOOKING_SELECT} WHERE b.startTime >= @from AND b.startTime < @to ORDER BY b.startTime`)
    .all({ from: from.toISOString(), to: to.toISOString() }) as BookingRow[];
  return rows.map(rowToBooking);
}

// ==== Availability ====

export function getAvailability(
  eventTypeId: string,
  date: string
): AvailableSlot[] | null {
  const eventType = findEventType(eventTypeId);
  if (!eventType) return null;

  const requestedDate = dayjs.utc(`${date}T00:00:00Z`);
  if (!requestedDate.isValid()) return null;

  const dayStart = requestedDate.startOf("day").add(DAY_START_HOUR, "hour");
  const dayEnd = requestedDate.startOf("day").add(DAY_END_HOUR, "hour");
  const duration = eventType.durationMinutes;

  const slots: AvailableSlot[] = [];
  let cursor = dayStart;
  while (!cursor.add(duration, "minute").isAfter(dayEnd)) {
    const slotStart = cursor;
    const slotEnd = cursor.add(duration, "minute");
    if (!findBookingConflict(slotStart, slotEnd)) {
      slots.push({
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
      });
    }
    cursor = slotEnd;
  }
  return slots;
}
