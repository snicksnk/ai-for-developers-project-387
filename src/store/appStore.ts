import { create } from "zustand";

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

interface AppState {
  eventTypes: EventType[];
  bookings: Booking[];
  setEventTypes: (eventTypes: EventType[]) => void;
  addBooking: (booking: Booking) => void;
  setBookings: (bookings: Booking[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  eventTypes: [],
  bookings: [],
  setEventTypes: (eventTypes) => set({ eventTypes }),
  addBooking: (booking) =>
    set((state) => ({ bookings: [...state.bookings, booking] })),
  setBookings: (bookings) => set({ bookings }),
}));
