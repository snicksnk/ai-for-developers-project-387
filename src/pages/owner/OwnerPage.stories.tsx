import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import {
  OwnerPageView,
  type OwnerPageViewProps,
} from "@/pages/owner/OwnerPage";

dayjs.extend(utc);

const meta: Meta<typeof OwnerPageView> = {
  title: "Pages/OwnerPage",
  component: OwnerPageView,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof OwnerPageView>;

const mockEventTypes = [
  { id: "et-1", title: "30-min consultation", durationMinutes: 30 },
  { id: "et-2", title: "1-hour meeting", durationMinutes: 60 },
];

const mockSchedule = [
  {
    id: "b-1",
    eventType: mockEventTypes[0],
    startTime: dayjs.utc().add(1, "day").add(9, "hour").toISOString(),
    createdAt: dayjs.utc().toISOString(),
  },
  {
    id: "b-2",
    eventType: mockEventTypes[1],
    startTime: dayjs.utc().add(2, "day").add(14, "hour").toISOString(),
    createdAt: dayjs.utc().toISOString(),
  },
];

const baseArgs: OwnerPageViewProps = {
  eventTypes: mockEventTypes,
  isLoadingEventTypes: false,
  eventTypesError: null,
  schedule: mockSchedule,
  isLoadingSchedule: false,
  scheduleError: null,
  form: { id: "", title: "", description: "", durationMinutes: 30 },
  isEditing: false,
  onFormChange: () => {},
  onSubmit: () => {},
  onEdit: () => {},
  onCancel: () => {},
  onDelete: () => {},
  isSaving: false,
  isDeleting: false,
  saveError: null,
  deleteError: null,
};

function InteractiveView(initialArgs: Partial<OwnerPageViewProps>) {
  const [eventTypes, setEventTypes] = useState(
    initialArgs.eventTypes ?? mockEventTypes
  );
  const [form, setForm] = useState(initialArgs.form ?? baseArgs.form);
  const [isEditing, setIsEditing] = useState(initialArgs.isEditing ?? false);

  return (
    <OwnerPageView
      {...baseArgs}
      {...initialArgs}
      eventTypes={eventTypes}
      form={form}
      isEditing={isEditing}
      onFormChange={setForm}
      onSubmit={() => {
        const newEventType = {
          id: isEditing ? form.id : `new-${Math.random().toString(36).slice(2)}`,
          title: form.title,
          description: form.description || undefined,
          durationMinutes: form.durationMinutes,
        };
        if (isEditing) {
          setEventTypes((prev) =>
            prev.map((et) => (et.id === form.id ? newEventType : et))
          );
          setIsEditing(false);
        } else {
          setEventTypes((prev) => [...prev, newEventType]);
        }
        setForm({ id: "", title: "", description: "", durationMinutes: 30 });
      }}
      onEdit={(et) => {
        setForm({
          id: et.id,
          title: et.title,
          description: et.description || "",
          durationMinutes: et.durationMinutes,
        });
        setIsEditing(true);
      }}
      onCancel={() => {
        setForm({ id: "", title: "", description: "", durationMinutes: 30 });
        setIsEditing(false);
      }}
      onDelete={(id) => {
        setEventTypes((prev) => prev.filter((et) => et.id !== id));
      }}
    />
  );
}

export const Default: Story = {
  render: () => <InteractiveView />,
};

export const Editing: Story = {
  render: () => (
    <InteractiveView
      isEditing
      form={{
        id: "et-1",
        title: "30-min consultation",
        description: "Updated description",
        durationMinutes: 45,
      }}
    />
  ),
};

export const Empty: Story = {
  render: () => <InteractiveView eventTypes={[]} schedule={[]} />,
};

export const ErrorState: Story = {
  render: () => (
    <InteractiveView
      eventTypes={[]}
      eventTypesError={new Error("Failed to load event types")}
      saveError={new Error("Failed to save event type")}
    />
  ),
};
