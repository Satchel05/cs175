"use client";

import { useCalendarEvents } from "@/providers/calendar-events-provider";
import { MONTH_NAMES } from "@/components/calendar/calendar-data";
import type { CalendarEvent, EventColor } from "@/components/calendar/calendar-data";

const dotColor: Record<EventColor, string> = {
    neutral: "bg-fg-quaternary",
    blue:    "bg-utility-blue-500",
    indigo:  "bg-utility-indigo-500",
    purple:  "bg-utility-purple-500",
    pink:    "bg-utility-pink-500",
    orange:  "bg-utility-orange-500",
    red:     "bg-utility-red-500",
    green:   "bg-utility-green-500",
    yellow:  "bg-utility-yellow-500",
    brand:   "bg-brand-solid",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(dateKey: string): { dayName: string; dayNum: number } {
    const d = new Date(dateKey + "T00:00:00");
    return { dayName: DAY_NAMES[d.getDay()], dayNum: d.getDate() };
}

function EventRow({ dateKey, event }: { dateKey: string; event: CalendarEvent }) {
    const { dayName, dayNum } = formatDate(dateKey);
    const meta = [
        event.time,
        event.duration_minutes ? `${event.duration_minutes} min` : undefined,
        event.location,
        event.recurrence && event.recurrence !== "none" ? event.recurrence : undefined,
    ].filter(Boolean).join(" · ");

    return (
        <div className="flex items-start gap-4 px-5 py-3">
            {/* Date column */}
            <div className="flex w-12 shrink-0 flex-col items-center gap-0.5 pt-0.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-tertiary">{dayName}</span>
                <span className="text-[18px] font-semibold leading-none text-primary">{dayNum}</span>
            </div>

            {/* Divider dot */}
            <div className="mt-1.5 flex flex-col items-center gap-1">
                <div className={`size-2 shrink-0 rounded-full ${dotColor[event.color]}`} />
            </div>

            {/* Event details */}
            <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[13.5px] font-semibold text-primary leading-snug">{event.name}</span>
                {meta ? (
                    <span className="text-[12px] text-tertiary">{meta}</span>
                ) : (
                    <span className="text-[12px] text-quaternary italic">No time set</span>
                )}
            </div>
        </div>
    );
}

interface MonthGroup {
    monthKey: string;
    year: number;
    month: number;
    entries: Array<{ dateKey: string; event: CalendarEvent }>;
}

function groupByMonth(events: Record<string, CalendarEvent[]>): MonthGroup[] {
    const map: Record<string, MonthGroup> = {};

    for (const [dateKey, evList] of Object.entries(events)) {
        const [y, m] = dateKey.split("-").map(Number);
        const monthKey = `${y}-${String(m).padStart(2, "0")}`;
        if (!map[monthKey]) {
            map[monthKey] = { monthKey, year: y, month: m - 1, entries: [] };
        }
        for (const event of evList) {
            map[monthKey].entries.push({ dateKey, event });
        }
    }

    // Sort groups by date, then entries within each group by day
    return Object.values(map)
        .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
        .map((group) => ({
            ...group,
            entries: group.entries.sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
        }));
}

function MonthBox({ group }: { group: MonthGroup }) {
    const count = group.entries.length;
    return (
        <div className="overflow-hidden rounded-xl border border-secondary bg-primary shadow-xs">
            {/* Month header */}
            <div className="flex items-center justify-between border-b border-secondary bg-secondary/40 px-5 py-3">
                <span className="text-[15px] font-semibold text-primary">
                    {MONTH_NAMES[group.month]} {group.year}
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11.5px] font-medium text-tertiary">
                    {count} {count === 1 ? "event" : "events"}
                </span>
            </div>

            {/* Event rows */}
            <div className="divide-y divide-secondary">
                {group.entries.map(({ dateKey, event }, i) => (
                    <EventRow key={`${dateKey}-${i}`} dateKey={dateKey} event={event} />
                ))}
            </div>
        </div>
    );
}

export function EventsView() {
    const { events } = useCalendarEvents();
    const groups = groupByMonth(events);

    return (
        <div className="flex h-full flex-col">
            {/* Page header */}
            <div className="border-b border-secondary px-8 py-6">
                <h1 className="text-[22px] font-bold tracking-tight text-primary">Events</h1>
                <p className="mt-0.5 text-[13px] text-tertiary">
                    All your scheduled events across every month
                </p>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
                {groups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
                        <span className="text-5xl">📅</span>
                        <p className="text-[15px] font-medium text-primary">No events yet</p>
                        <p className="text-[13px] text-tertiary">
                            Add events from the Calendar tab and they'll appear here.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-5">
                        {groups.map((group) => (
                            <MonthBox key={group.monthKey} group={group} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
