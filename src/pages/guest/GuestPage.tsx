import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { DatePicker } from "@mantine/dates";
import { Button } from "@/components/ui/button";
import {
  useEventTypes,
  useAvailability,
  useCreateBooking,
  type EventType,
  type AvailableSlot,
  type Booking,
} from "@/api/hooks";
import { ApiError } from "@/api/client";

dayjs.extend(utc);

export interface GuestPageViewProps {
  eventTypes?: EventType[];
  selectedEventType: EventType | null;
  onSelectEventType: (eventType: EventType) => void;
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
  slots?: AvailableSlot[];
  onBook: (slot: AvailableSlot) => void;
  isBooking: boolean;
  booked: Booking | null;
  onReset: () => void;
  eventTypesError: Error | null;
  slotsError: Error | null;
  bookingError: Error | null;
  isLoadingEventTypes: boolean;
  isLoadingSlots: boolean;
}

export function GuestPageView({
  eventTypes,
  selectedEventType,
  onSelectEventType,
  selectedDate,
  onSelectDate,
  slots,
  onBook,
  isBooking,
  booked,
  onReset,
  eventTypesError,
  slotsError,
  bookingError,
  isLoadingEventTypes,
  isLoadingSlots,
}: GuestPageViewProps) {
  const today = dayjs.utc().startOf("day").toDate();
  const maxDate = dayjs.utc().add(13, "day").endOf("day").toDate();

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Book an appointment</h1>

      {booked ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-900">
            <p className="font-medium">Booking confirmed</p>
            <p className="text-sm">
              {booked.eventType.title} on{" "}
              {dayjs(booked.startTime).format("MMMM D, YYYY HH:mm")}
            </p>
          </div>
          <Button variant="outline" onClick={onReset}>
            ← Book another appointment
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-medium">1. Select an event type</h2>
            {isLoadingEventTypes && <p>Loading event types...</p>}
            {eventTypesError && (
              <p className="text-destructive">
                Failed to load event types: {eventTypesError.message}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {eventTypes?.map((eventType) => (
                <Button
                  key={eventType.id}
                  variant={
                    selectedEventType?.id === eventType.id ? "default" : "outline"
                  }
                  onClick={() => onSelectEventType(eventType)}
                >
                  {eventType.title}
                  <span className="ml-1 text-xs opacity-70">
                    ({eventType.durationMinutes} min)
                  </span>
                </Button>
              ))}
            </div>
          </section>

          {selectedEventType && (
            <section>
              <h2 className="mb-3 text-lg font-medium">2. Pick a date</h2>
              <p className="mb-3 text-sm text-muted-foreground">
                Availability is shown for the next 14 days.
              </p>
              <DatePicker
                value={selectedDate}
                onChange={onSelectDate}
                minDate={today}
                maxDate={maxDate}
                allowDeselect
              />
            </section>
          )}

          {selectedDate && (
            <section>
              <h2 className="mb-3 text-lg font-medium">3. Choose a time slot</h2>
              {isLoadingSlots && <p>Loading available slots...</p>}
              {slotsError && (
                <p className="text-destructive">
                  Failed to load slots: {slotsError.message}
                </p>
              )}
              {slots && slots.length === 0 && !isLoadingSlots && (
                <p className="text-muted-foreground">
                  No available slots for this date.
                </p>
              )}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots?.map((slot, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    disabled={isBooking}
                    onClick={() => onBook(slot)}
                  >
                    {dayjs(slot.startTime).format("HH:mm")}
                  </Button>
                ))}
              </div>
              {bookingError && (
                <p className="mt-3 text-sm text-destructive">
                  {bookingError instanceof ApiError && bookingError.status === 409
                    ? "This slot has just been booked by someone else. Please choose another one."
                    : bookingError.message}
                </p>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export function GuestPage() {
  const queryClient = useQueryClient();
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [booked, setBooked] = useState<Booking | null>(null);

  const {
    data: eventTypes,
    isLoading: isLoadingEventTypes,
    error: eventTypesError,
  } = useEventTypes();

  const availabilityDate = selectedDate
    ? dayjs(selectedDate).format("YYYY-MM-DD")
    : null;

  const {
    data: slots,
    isLoading: isLoadingSlots,
    error: slotsError,
  } = useAvailability(
    selectedEventType?.id ?? null,
    availabilityDate
  );

  const {
    mutate: createBooking,
    isPending: isBooking,
    error: bookingError,
    reset: resetBookingMutation,
  } = useCreateBooking();

  const handleBook = (slot: AvailableSlot) => {
    if (!selectedEventType) return;
    createBooking(
      {
        eventTypeId: selectedEventType.id,
        startTime: dayjs.utc(slot.startTime).toISOString(),
      },
      {
        onSuccess: (booking) => {
          setBooked(booking);
          queryClient.invalidateQueries({ queryKey: ["availability"] });
          queryClient.invalidateQueries({ queryKey: ["schedule"] });
        },
      }
    );
  };

  const handleReset = () => {
    setBooked(null);
    setSelectedEventType(null);
    setSelectedDate(null);
    resetBookingMutation();
  };

  return (
    <GuestPageView
      eventTypes={eventTypes}
      selectedEventType={selectedEventType}
      onSelectEventType={setSelectedEventType}
      selectedDate={selectedDate}
      onSelectDate={setSelectedDate}
      slots={slots}
      onBook={handleBook}
      isBooking={isBooking}
      booked={booked}
      onReset={handleReset}
      eventTypesError={eventTypesError}
      slotsError={slotsError}
      bookingError={bookingError}
      isLoadingEventTypes={isLoadingEventTypes}
      isLoadingSlots={isLoadingSlots}
    />
  );
}
