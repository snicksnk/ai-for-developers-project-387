import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import {
  GuestPageView,
  type GuestPageViewProps,
} from "@/pages/guest/GuestPage";

dayjs.extend(utc);

const meta: Meta<typeof GuestPageView> = {
  title: "Pages/GuestPage",
  component: GuestPageView,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof GuestPageView>;

const mockEventTypes = [
  { id: "et-1", title: "30-min consultation", durationMinutes: 30 },
  { id: "et-2", title: "1-hour meeting", durationMinutes: 60 },
];

const baseDate = dayjs().startOf("day").add(1, "day").toDate();

const mockSlots = Array.from({ length: 6 }, (_, i) => {
  const start = dayjs(baseDate).add(9 + i, "hour");
  return {
    startTime: start.utc().toISOString(),
    endTime: start.add(30, "minute").utc().toISOString(),
  };
});

function InteractiveView(args: Partial<GuestPageViewProps>) {
  const [selectedEventType, setSelectedEventType] = useState(
    args.selectedEventType || null
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    args.selectedDate || null
  );
  const [booked, setBooked] = useState(args.booked || null);

  return (
    <GuestPageView
      eventTypes={args.eventTypes || mockEventTypes}
      selectedEventType={selectedEventType}
      onSelectEventType={setSelectedEventType}
      selectedDate={selectedDate}
      onSelectDate={setSelectedDate}
      slots={args.slots || (selectedDate ? mockSlots : undefined)}
      onBook={(slot) => {
        setBooked({
          id: "booking-1",
          eventType: selectedEventType || mockEventTypes[0],
          startTime: slot.startTime,
          createdAt: dayjs.utc().toISOString(),
        });
      }}
      isBooking={false}
      booked={booked}
      onReset={() => {
        setBooked(null);
        setSelectedEventType(null);
        setSelectedDate(null);
      }}
      eventTypesError={null}
      slotsError={null}
      bookingError={null}
      isLoadingEventTypes={false}
      isLoadingSlots={false}
    />
  );
}

export const Default: Story = {
  render: () => <InteractiveView />,
};

export const EventTypeSelected: Story = {
  render: () => <InteractiveView selectedEventType={mockEventTypes[0]} />,
};

export const DateSelected: Story = {
  render: () => (
    <InteractiveView
      selectedEventType={mockEventTypes[0]}
      selectedDate={baseDate}
    />
  ),
};

export const Conflict: Story = {
  render: () => (
    <InteractiveView
      selectedEventType={mockEventTypes[0]}
      selectedDate={baseDate}
      bookingError={new Error("This slot is already booked")}
    />
  ),
};

export const Booked: Story = {
  render: () => (
    <InteractiveView
      selectedEventType={mockEventTypes[0]}
      selectedDate={baseDate}
      booked={{
        id: "booking-1",
        eventType: mockEventTypes[0],
        startTime: dayjs.utc(baseDate).add(9, "hour").toISOString(),
        createdAt: dayjs.utc().toISOString(),
      }}
    />
  ),
};
