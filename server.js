import express from "express";
import cors from "cors";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4010;

const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;

let eventTypes = [
  {
    id: "et-1",
    title: "Intro call",
    description: "Short introduction meeting",
    durationMinutes: 30,
  },
  {
    id: "et-2",
    title: "Deep dive",
    description: "Detailed technical discussion",
    durationMinutes: 60,
  },
];

let bookings = [];

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseIsoDateTime(value) {
  const d = dayjs.utc(value);
  return d.isValid() ? d : null;
}

function parsePlainDate(value) {
  if (!value || typeof value !== "string") return null;
  const d = dayjs.utc(`${value}T00:00:00Z`);
  return d.isValid() ? d : null;
}

function intervalsOverlap(startA, endA, startB, endB) {
  return startA.isBefore(endB) && endA.isAfter(startB);
}

function findBookingConflict(startTime, endTime) {
  return bookings.find((booking) => {
    const existingStart = dayjs.utc(booking.startTime);
    const existingEnd = existingStart.add(
      booking.eventType.durationMinutes,
      "minute"
    );
    return intervalsOverlap(startTime, endTime, existingStart, existingEnd);
  });
}

app.get("/event-types", (_req, res) => {
  res.json(eventTypes);
});

app.post("/event-types", (req, res) => {
  const body = req.body;
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }
  if (
    typeof body.durationMinutes !== "number" ||
    !Number.isFinite(body.durationMinutes) ||
    body.durationMinutes < 1
  ) {
    return res.status(400).json({ error: "durationMinutes must be at least 1" });
  }

  const eventType = {
    id: body.id || generateId(),
    title: body.title.trim(),
    description:
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : undefined,
    durationMinutes: Math.floor(body.durationMinutes),
  };

  eventTypes.push(eventType);
  res.json(eventType);
});

app.put("/event-types/:id", (req, res) => {
  const { id } = req.params;
  const body = req.body;
  const index = eventTypes.findIndex((et) => et.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Event type not found" });
  }
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }
  if (
    typeof body.durationMinutes !== "number" ||
    !Number.isFinite(body.durationMinutes) ||
    body.durationMinutes < 1
  ) {
    return res.status(400).json({ error: "durationMinutes must be at least 1" });
  }

  eventTypes[index] = {
    id,
    title: body.title.trim(),
    description:
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : undefined,
    durationMinutes: Math.floor(body.durationMinutes),
  };

  res.json(eventTypes[index]);
});

app.delete("/event-types/:id", (req, res) => {
  const { id } = req.params;
  const index = eventTypes.findIndex((et) => et.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Event type not found" });
  }
  eventTypes.splice(index, 1);
  res.status(204).send();
});

app.get("/bookings", (_req, res) => {
  res.json(bookings);
});

app.post("/bookings", (req, res) => {
  const body = req.body;
  if (!body || typeof body.eventTypeId !== "string" || !body.eventTypeId) {
    return res.status(400).json({ error: "eventTypeId is required" });
  }
  if (!body.startTime || typeof body.startTime !== "string") {
    return res.status(400).json({ error: "startTime is required" });
  }

  const eventType = eventTypes.find((et) => et.id === body.eventTypeId);
  if (!eventType) {
    return res.status(400).json({ error: "Event type not found" });
  }

  const startTime = parseIsoDateTime(body.startTime);
  if (!startTime) {
    return res.status(400).json({ error: "Invalid startTime" });
  }

  const endTime = startTime.add(eventType.durationMinutes, "minute");

  const conflict = findBookingConflict(startTime, endTime);
  if (conflict) {
    return res.status(409).json({ error: "Time slot is already booked" });
  }

  const booking = {
    id: generateId(),
    eventType,
    startTime: startTime.toISOString(),
    createdAt: dayjs.utc().toISOString(),
  };
  bookings.push(booking);
  res.json(booking);
});

app.get("/schedule", (req, res) => {
  const days = Math.max(1, parseInt(req.query.days, 10) || 14);
  const fromDate = req.query.fromDate
    ? parseIsoDateTime(req.query.fromDate)
    : dayjs.utc().startOf("day");

  if (!fromDate) {
    return res.status(400).json({ error: "Invalid fromDate" });
  }

  const toDate = fromDate.add(days, "day");

  const result = bookings.filter((booking) => {
    const start = dayjs.utc(booking.startTime);
    return (
      (start.isAfter(fromDate) || start.isSame(fromDate)) &&
      start.isBefore(toDate)
    );
  });

  res.json(result);
});

app.get("/availability", (req, res) => {
  const { eventTypeId, date } = req.query;

  if (!eventTypeId || typeof eventTypeId !== "string") {
    return res.status(400).json({ error: "eventTypeId is required" });
  }
  if (!date || typeof date !== "string") {
    return res.status(400).json({ error: "date is required" });
  }

  const eventType = eventTypes.find((et) => et.id === eventTypeId);
  if (!eventType) {
    return res.status(400).json({ error: "Event type not found" });
  }

  const requestedDate = parsePlainDate(date);
  if (!requestedDate) {
    return res.status(400).json({ error: "Invalid date" });
  }

  const dayStart = requestedDate.startOf("day").add(DAY_START_HOUR, "hour");
  const dayEnd = requestedDate.startOf("day").add(DAY_END_HOUR, "hour");
  const duration = eventType.durationMinutes;

  const slots = [];
  let cursor = dayStart;
  while (!cursor.add(duration, "minute").isAfter(dayEnd)) {
    const slotStart = cursor;
    const slotEnd = cursor.add(duration, "minute");
    const conflict = findBookingConflict(slotStart, slotEnd);
    if (!conflict) {
      slots.push({
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
      });
    }
    cursor = slotEnd;
  }

  res.json(slots);
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Booking calendar backend listening on http://localhost:${PORT}`);
});
