/**
 * JSON Schemas mirroring `api-spect.tsp`. Registered as shared schemas ($id)
 * so Fastify can both validate requests/responses and feed Swagger UI.
 */

export const eventTypeSchema = {
  $id: "EventType",
  type: "object",
  description: "Модель типа события (шаблон)",
  required: ["id", "title", "durationMinutes"],
  properties: {
    id: { type: "string", description: "Уникальный идентификатор" },
    title: { type: "string", description: "Название типа встречи" },
    description: { type: "string", description: "Описание типа встречи" },
    durationMinutes: {
      type: "integer",
      minimum: 1,
      description: "Длительность встречи в минутах",
    },
  },
} as const;

/**
 * Body accepted when creating/updating an event type. `id` is optional here
 * because it may be generated server-side, matching the previous mock.
 */
export const eventTypeInputSchema = {
  $id: "EventTypeInput",
  type: "object",
  required: ["title", "durationMinutes"],
  properties: {
    id: { type: "string" },
    title: { type: "string", minLength: 1 },
    description: { type: "string" },
    durationMinutes: { type: "integer", minimum: 1 },
  },
} as const;

export const bookingCreateSchema = {
  $id: "BookingCreate",
  type: "object",
  description: "Модель создания бронирования (то, что присылает гость)",
  required: ["eventTypeId", "startTime"],
  properties: {
    eventTypeId: {
      type: "string",
      description: "ID типа события, которое хочет забронировать гость",
    },
    startTime: {
      type: "string",
      format: "date-time",
      description: "Дата и время начала (UTC)",
    },
  },
} as const;

export const bookingSchema = {
  $id: "Booking",
  type: "object",
  description: "Полная модель бронирования (возвращается сервером)",
  required: ["id", "eventType", "startTime", "createdAt"],
  properties: {
    id: { type: "string" },
    eventType: { $ref: "EventType" },
    startTime: { type: "string", format: "date-time" },
    createdAt: { type: "string", format: "date-time" },
  },
} as const;

export const availableSlotSchema = {
  $id: "AvailableSlot",
  type: "object",
  description: "Модель свободного слота",
  required: ["startTime", "endTime"],
  properties: {
    startTime: { type: "string", format: "date-time" },
    endTime: { type: "string", format: "date-time" },
  },
} as const;

export const errorSchema = {
  $id: "Error",
  type: "object",
  required: ["error"],
  properties: {
    error: { type: "string" },
  },
} as const;

export const sharedSchemas = [
  eventTypeSchema,
  eventTypeInputSchema,
  bookingCreateSchema,
  bookingSchema,
  availableSlotSchema,
  errorSchema,
];
