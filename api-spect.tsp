import "@typespec/http";
import "@typespec/rest";

using Http;
using Rest;

/**
 * Модель типа события (шаблон)
 */
model EventType {
  @doc("Уникальный идентификатор")
  id: string;

  @doc("Название типа встречи")
  title: string;

  @doc("Описание типа встречи")
  description?: string;

  @doc("Длительность встречи в минутах")
  @minValue(1)
  durationMinutes: int32;
}

/**
 * Модель создания бронирования (то, что присылает гость)
 */
model BookingCreate {
  @doc("ID типа события, которое хочет забронировать гость")
  eventTypeId: string;

  @doc("Дата и время начала (UTC)")
  startTime: utcDateTime;
}

/**
 * Полная модель бронирования (возвращается сервером)
 */
model Booking {
  id: string;
  eventType: EventType; // Денормализовано для удобства фронта
  startTime: utcDateTime;
  createdAt: utcDateTime;
}

/**
 * Модель свободного слота
 */
model AvailableSlot {
  startTime: utcDateTime;
  endTime: utcDateTime;
}

// ==== ИНТЕРФЕЙСЫ ====

@tag("Owner")
@route("/event-types")
interface EventTypes {
  @summary("Получить все типы событий")
  @get list(): EventType[];

  @summary("Создать новый тип события")
  @post create(@body eventType: EventType): EventType;

  @summary("Обновить тип события")
  @put update(@path id: string, @body eventType: EventType): EventType;

  @summary("Удалить тип события")
  @delete delete(@path id: string): void;
}

@tag("Guest")
@route("/bookings")
interface GuestBookings {
  @summary("Получить список ВСЕХ бронирований (для отладки или админа)")
  @get list(): Booking[];

  @summary("Создать новое бронирование (занятие слота)")
  @post create(@body booking: BookingCreate): Booking;
}

@tag("Owner")
@route("/schedule")
interface OwnerSchedule {
  @summary("Получить расписание владельца на ближайшие N дней")
  @get list(
    @query days?: int32 = 14,
    @query fromDate?: utcDateTime
  ): Booking[];
}

@tag("Guest")
@route("/availability")
interface Availability {
  @summary("Получить доступные (свободные) слоты для выбранного типа события в указанный день")
  @get getSlots(
    @query eventTypeId: string,
    @query date: plainDate // используем plainDate для конкретного дня
  ): AvailableSlot[];
}
