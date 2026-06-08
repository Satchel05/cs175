"use client";

import { createContext, useContext, useState } from "react";
import type { CalendarEvent } from "@/components/calendar/calendar-data";

type EventMap = Record<string, CalendarEvent[]>;

interface CalendarEventsContextValue {
    events: EventMap;
    addEvent: (date: string, event: CalendarEvent) => void;
}

const CalendarEventsContext = createContext<CalendarEventsContextValue | null>(null);

export function CalendarEventsProvider({ children }: { children: React.ReactNode }) {
    const [events, setEvents] = useState<EventMap>({});

    function addEvent(date: string, event: CalendarEvent) {
        setEvents((prev) => ({
            ...prev,
            [date]: [...(prev[date] ?? []), event],
        }));
    }

    return (
        <CalendarEventsContext.Provider value={{ events, addEvent }}>
            {children}
        </CalendarEventsContext.Provider>
    );
}

export function useCalendarEvents() {
    const ctx = useContext(CalendarEventsContext);
    if (!ctx) throw new Error("useCalendarEvents must be inside CalendarEventsProvider");
    return ctx;
}
