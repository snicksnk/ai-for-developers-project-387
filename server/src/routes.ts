import type { FastifyInstance } from "fastify";
import * as store from "./store.js";

/**
 * Registers all API routes described by `api-spect.tsp`.
 * Each route carries a JSON schema so Fastify validates traffic and
 * @fastify/swagger can render accurate documentation.
 */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // ==== Owner: event types ====

  app.get(
    "/event-types",
    {
      schema: {
        tags: ["Owner"],
        summary: "Получить все типы событий",
        response: {
          200: { type: "array", items: { $ref: "EventType" } },
        },
      },
    },
    async () => store.listEventTypes()
  );

  app.post<{ Body: store.EventType }>(
    "/event-types",
    {
      schema: {
        tags: ["Owner"],
        summary: "Создать новый тип события",
        body: { $ref: "EventTypeInput" },
        response: {
          200: { $ref: "EventType" },
          400: { $ref: "Error" },
        },
      },
    },
    async (request) => store.createEventType(request.body)
  );

  app.put<{ Params: { id: string }; Body: store.EventType }>(
    "/event-types/:id",
    {
      schema: {
        tags: ["Owner"],
        summary: "Обновить тип события",
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" } },
        },
        body: { $ref: "EventTypeInput" },
        response: {
          200: { $ref: "EventType" },
          404: { $ref: "Error" },
        },
      },
    },
    async (request, reply) => {
      const updated = store.updateEventType(request.params.id, request.body);
      if (!updated) {
        return reply.code(404).send({ error: "Event type not found" });
      }
      return updated;
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/event-types/:id",
    {
      schema: {
        tags: ["Owner"],
        summary: "Удалить тип события",
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" } },
        },
        response: {
          204: { type: "null" },
          404: { $ref: "Error" },
        },
      },
    },
    async (request, reply) => {
      const removed = store.deleteEventType(request.params.id);
      if (!removed) {
        return reply.code(404).send({ error: "Event type not found" });
      }
      return reply.code(204).send();
    }
  );

  // ==== Guest: bookings ====

  app.get(
    "/bookings",
    {
      schema: {
        tags: ["Guest"],
        summary: "Получить список ВСЕХ бронирований (для отладки или админа)",
        response: {
          200: { type: "array", items: { $ref: "Booking" } },
        },
      },
    },
    async () => store.listBookings()
  );

  app.post<{ Body: store.CreateBookingBody }>(
    "/bookings",
    {
      schema: {
        tags: ["Guest"],
        summary: "Создать новое бронирование (занятие слота)",
        body: { $ref: "BookingCreate" },
        response: {
          200: { $ref: "Booking" },
          400: { $ref: "Error" },
          409: { $ref: "Error" },
        },
      },
    },
    async (request, reply) => {
      const result = store.createBooking(request.body);
      if (result.ok) return result.booking;

      if (result.reason === "conflict") {
        return reply.code(409).send({ error: "Time slot is already booked" });
      }
      if (result.reason === "event-type-not-found") {
        return reply.code(400).send({ error: "Event type not found" });
      }
      return reply.code(400).send({ error: "Invalid startTime" });
    }
  );

  // ==== Owner: schedule ====

  app.get<{ Querystring: { days?: number; fromDate?: string } }>(
    "/schedule",
    {
      schema: {
        tags: ["Owner"],
        summary: "Получить расписание владельца на ближайшие N дней",
        querystring: {
          type: "object",
          properties: {
            days: { type: "integer", default: 14 },
            fromDate: { type: "string", format: "date-time" },
          },
        },
        response: {
          200: { type: "array", items: { $ref: "Booking" } },
        },
      },
    },
    async (request) => {
      const { days = 14, fromDate } = request.query;
      return store.getSchedule(days, fromDate);
    }
  );

  // ==== Guest: availability ====

  app.get<{ Querystring: { eventTypeId: string; date: string } }>(
    "/availability",
    {
      schema: {
        tags: ["Guest"],
        summary:
          "Получить доступные (свободные) слоты для выбранного типа события в указанный день",
        querystring: {
          type: "object",
          required: ["eventTypeId", "date"],
          properties: {
            eventTypeId: { type: "string" },
            date: { type: "string", format: "date" },
          },
        },
        response: {
          200: { type: "array", items: { $ref: "AvailableSlot" } },
          400: { $ref: "Error" },
        },
      },
    },
    async (request, reply) => {
      const { eventTypeId, date } = request.query;
      const slots = store.getAvailability(eventTypeId, date);
      if (slots === null) {
        return reply.code(400).send({ error: "Event type not found" });
      }
      return slots;
    }
  );
}
