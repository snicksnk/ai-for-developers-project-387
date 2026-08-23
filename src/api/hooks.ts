import { useQuery, useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import type { components } from "@/api/types";
import { apiGet, apiPost, apiPut, apiDelete } from "@/api/client";

dayjs.extend(utc);

export type EventType = components["schemas"]["EventType"];
export type AvailableSlot = components["schemas"]["AvailableSlot"];
export type BookingCreate = components["schemas"]["BookingCreate"];
export type Booking = components["schemas"]["Booking"];

export const eventTypesQueryKey = ["eventTypes"] as const;

export function useEventTypes() {
  return useQuery<EventType[]>({
    queryKey: eventTypesQueryKey,
    queryFn: () => apiGet("/event-types"),
  });
}

export function useAvailability(
  eventTypeId: string | null,
  date: string | null
) {
  return useQuery<AvailableSlot[]>({
    queryKey: ["availability", eventTypeId, date],
    queryFn: () => {
      const query = new URLSearchParams({
        eventTypeId: eventTypeId!,
        date: date!,
      });
      return apiGet(`/availability?${query}`);
    },
    enabled: Boolean(eventTypeId && date),
  });
}

export function useCreateBooking() {
  return useMutation<Booking, Error, BookingCreate>({
    mutationFn: (body) => apiPost("/bookings", body),
  });
}

export function useCreateEventType() {
  return useMutation<EventType, Error, EventType>({
    mutationFn: (body) => apiPost("/event-types", body),
  });
}

export function useUpdateEventType() {
  return useMutation<EventType, Error, EventType>({
    mutationFn: (body) => apiPut(`/event-types/${body.id}`, body),
  });
}

export function useDeleteEventType() {
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiDelete(`/event-types/${id}`),
  });
}

export function useSchedule(days: number = 14, fromDate?: string) {
  const from = fromDate ?? dayjs.utc().startOf("day").toISOString();
  const query = new URLSearchParams({
    days: String(days),
    fromDate: from,
  });
  return useQuery<Booking[]>({
    queryKey: ["schedule", days, from],
    queryFn: () => apiGet(`/schedule?${query}`),
  });
}
