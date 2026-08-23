import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { TextInput, NumberInput, Textarea } from "@mantine/core";
import { Button } from "@/components/ui/button";
import {
  useEventTypes,
  useCreateEventType,
  useUpdateEventType,
  useDeleteEventType,
  useSchedule,
  eventTypesQueryKey,
  type EventType,
  type Booking,
} from "@/api/hooks";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

interface EventTypeFormData {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
}

function emptyForm(): EventTypeFormData {
  return {
    id: "",
    title: "",
    description: "",
    durationMinutes: 30,
  };
}

function formToEventType(data: EventTypeFormData): EventType {
  return {
    id: data.id || crypto.randomUUID(),
    title: data.title,
    description: data.description || undefined,
    durationMinutes: data.durationMinutes,
  };
}

function eventTypeToForm(eventType: EventType): EventTypeFormData {
  return {
    id: eventType.id,
    title: eventType.title,
    description: eventType.description || "",
    durationMinutes: eventType.durationMinutes,
  };
}

export interface OwnerPageViewProps {
  eventTypes?: EventType[];
  isLoadingEventTypes: boolean;
  eventTypesError: Error | null;
  schedule?: Booking[];
  isLoadingSchedule: boolean;
  scheduleError: Error | null;
  form: EventTypeFormData;
  isEditing: boolean;
  onFormChange: (form: EventTypeFormData) => void;
  onSubmit: () => void;
  onEdit: (eventType: EventType) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  isSaving: boolean;
  isDeleting: boolean;
  saveError: Error | null;
  deleteError: Error | null;
}

export function OwnerPageView({
  eventTypes,
  isLoadingEventTypes,
  eventTypesError,
  schedule,
  isLoadingSchedule,
  scheduleError,
  form,
  isEditing,
  onFormChange,
  onSubmit,
  onEdit,
  onCancel,
  onDelete,
  isSaving,
  isDeleting,
  saveError,
  deleteError,
}: OwnerPageViewProps) {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Owner dashboard</h1>
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          Back to booking
        </Link>
      </div>

      <div className="mb-8 rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-medium">
          {isEditing ? "Edit event type" : "Create event type"}
        </h2>
        <div className="space-y-4">
          <TextInput
            label="Title"
            value={form.title}
            onChange={(e) =>
              onFormChange({ ...form, title: e.currentTarget.value })
            }
            required
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) =>
              onFormChange({ ...form, description: e.currentTarget.value })
            }
            minRows={2}
          />
          <NumberInput
            label="Duration (minutes)"
            value={form.durationMinutes}
            onChange={(value) =>
              onFormChange({
                ...form,
                durationMinutes: typeof value === "number" ? value : 0,
              })
            }
            min={1}
            required
          />
          {saveError && (
            <p className="text-sm text-destructive">{saveError.message}</p>
          )}
          <div className="flex gap-2">
            <Button onClick={onSubmit} disabled={isSaving || !form.title}>
              {isEditing ? "Save changes" : "Create event type"}
            </Button>
            {isEditing && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-medium">Event types</h2>
        {isLoadingEventTypes && <p>Loading event types...</p>}
        {eventTypesError && (
          <p className="text-destructive">
            Failed to load event types: {eventTypesError.message}
          </p>
        )}
        {deleteError && (
          <p className="mb-3 text-sm text-destructive">{deleteError.message}</p>
        )}
        <div className="space-y-2">
          {eventTypes?.map((eventType) => (
            <div
              key={eventType.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div>
                <p className="font-medium">{eventType.title}</p>
                <p className="text-sm text-muted-foreground">
                  {eventType.durationMinutes} min
                  {eventType.description && ` · ${eventType.description}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(eventType)}
                  disabled={isDeleting}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(eventType.id)}
                  disabled={isDeleting}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {eventTypes && eventTypes.length === 0 && (
            <p className="text-muted-foreground">No event types yet.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-medium">Schedule (next 14 days)</h2>
        {isLoadingSchedule && <p>Loading schedule...</p>}
        {scheduleError && (
          <p className="text-destructive">
            Failed to load schedule: {scheduleError.message}
          </p>
        )}
        <div className="space-y-2">
          {schedule?.map((booking) => (
            <div
              key={booking.id}
              className="rounded-md border p-3"
            >
              <p className="font-medium">{booking.eventType.title}</p>
              <p className="text-sm text-muted-foreground">
                {dayjs.utc(booking.startTime).format("MMMM D, YYYY HH:mm")} UTC
              </p>
            </div>
          ))}
          {schedule && schedule.length === 0 && (
            <p className="text-muted-foreground">No bookings in this range.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function OwnerPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EventTypeFormData>(emptyForm);
  const [isEditing, setIsEditing] = useState(false);

  const {
    data: eventTypes,
    isLoading: isLoadingEventTypes,
    error: eventTypesError,
  } = useEventTypes();
  const {
    data: schedule,
    isLoading: isLoadingSchedule,
    error: scheduleError,
  } = useSchedule();

  const {
    mutate: createEventType,
    isPending: isCreating,
    error: createError,
  } = useCreateEventType();
  const {
    mutate: updateEventType,
    isPending: isUpdating,
    error: updateError,
  } = useUpdateEventType();
  const {
    mutate: deleteEventType,
    isPending: isDeleting,
    error: deleteError,
  } = useDeleteEventType();

  const handleSubmit = () => {
    const eventType = formToEventType(form);
    if (isEditing) {
      updateEventType(eventType, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: eventTypesQueryKey });
          setForm(emptyForm());
          setIsEditing(false);
        },
      });
    } else {
      createEventType(eventType, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: eventTypesQueryKey });
          setForm(emptyForm());
        },
      });
    }
  };

  const handleEdit = (eventType: EventType) => {
    setForm(eventTypeToForm(eventType));
    setIsEditing(true);
  };

  const handleCancel = () => {
    setForm(emptyForm());
    setIsEditing(false);
  };

  const handleDelete = (id: string) => {
    deleteEventType(id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: eventTypesQueryKey });
      },
    });
  };

  return (
    <OwnerPageView
      eventTypes={eventTypes}
      isLoadingEventTypes={isLoadingEventTypes}
      eventTypesError={eventTypesError}
      schedule={schedule}
      isLoadingSchedule={isLoadingSchedule}
      scheduleError={scheduleError}
      form={form}
      isEditing={isEditing}
      onFormChange={setForm}
      onSubmit={handleSubmit}
      onEdit={handleEdit}
      onCancel={handleCancel}
      onDelete={handleDelete}
      isSaving={isCreating || isUpdating}
      isDeleting={isDeleting}
      saveError={createError || updateError}
      deleteError={deleteError}
    />
  );
}
