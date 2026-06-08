"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Plus, SearchLg } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { buildMonthDays, weekdays, MONTH_NAMES, MONTH_ABBR, expandRecurringEvents  } from "./calendar-data";
import type { CalendarEvent } from "./calendar-data";
import { BandPill, EventPill } from "./event-pill";
import { useCalendarEvents } from "@/providers/calendar-events-provider";

function getWeekOfMonth(date: Date): number {
    return Math.ceil(date.getDate() / 7);
}

export function Calendar() {
    const { events, addEvent } = useCalendarEvents();
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const days = useMemo(() => {
    const expandedEvents = expandRecurringEvents(events, year, month); // ← add this

    return buildMonthDays(year, month).map((cell) => {
        if (cell.outside) return cell;
        const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(cell.date).padStart(2, "0")}`;
        const cellEvents = expandedEvents[key]; // ← use expandedEvents, not events
        return cellEvents?.length ? { ...cell, events: cellEvents } : cell;
    });
    }, [year, month, events]);

    function goTo(newYear: number, newMonth: number) {
        setYear(newYear);
        setMonth(newMonth);
    }

    function prevMonth() {
        const d = new Date(year, month - 1, 1);
        goTo(d.getFullYear(), d.getMonth());
    }

    function nextMonth() {
        const d = new Date(year, month + 1, 1);
        goTo(d.getFullYear(), d.getMonth());
    }

    function goToday() {
        const t = new Date();
        goTo(t.getFullYear(), t.getMonth());
    }

    const today = new Date();
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
    const weekNum = isCurrentMonth ? getWeekOfMonth(today) : null;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dateRangeLabel = `${MONTH_NAMES[month]} 1, ${year} – ${MONTH_NAMES[month]} ${daysInMonth}, ${year}`;

    async function handleAddEvent() {
        const trimmed = input.trim();
        if (!trimmed) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/flan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: trimmed }),
            });

            if (!res.ok) {
                setError("Couldn't parse that event — try rephrasing.");
                return;
            }

            const ev = await res.json();

            const evDate = new Date(ev.date + "T00:00:00");
            const evMonth = evDate.getMonth();
            const evYear = evDate.getFullYear();

            const newEvent: CalendarEvent = {
                name: ev.title,
                time: ev.time ?? undefined,
                duration_minutes: ev.duration_minutes ?? undefined,
                location: ev.location ?? undefined,
                recurrence: ev.recurrence ?? undefined,
                color: "brand",
            };

            addEvent(ev.date, newEvent);
            setYear(evYear);
            setMonth(evMonth);
            setInput("");
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }

    }


    return (
        <div className="overflow-hidden rounded-2xl border border-secondary bg-primary shadow-sm">
            {/* ---------- Header ---------- */}
            <div className="flex items-center gap-4 border-b border-secondary px-5 py-4">
                {/* Date card on the left */}
                <div className="flex flex-col items-center rounded-lg border border-secondary px-3.5 py-1.5 leading-none">
                    <span className="mb-1 text-[10px] font-semibold tracking-wider text-tertiary">{MONTH_ABBR[month]}</span>
                    <span className="text-[22px] font-semibold text-brand-secondary">
                        {isCurrentMonth ? today.getDate() : 1}
                    </span>
                </div>

                {/* Title + range */}
                <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-[17px] font-semibold tracking-tight text-primary">
                            {MONTH_NAMES[month]} {year}
                        </h1>
                        {weekNum && (
                            <Badge color="gray" type="pill-color" size="sm">
                                Week {weekNum}
                            </Badge>
                        )}
                    </div>
                    <div className="text-[12.5px] text-tertiary">{dateRangeLabel}</div>
                </div>

                {/* Right-side actions */}
                <div className="flex items-center gap-2">
                    <Button size="sm" color="secondary" iconLeading={SearchLg} aria-label="Search events" />

                    <div className="inline-flex h-8 items-center overflow-hidden rounded-lg border border-secondary bg-primary">
                        <button
                            aria-label="Previous month"
                            onClick={prevMonth}
                            className="flex h-full w-8 items-center justify-center text-tertiary hover:bg-secondary hover:text-primary"
                        >
                            <ChevronLeft className="size-3.5" />
                        </button>
                        <button
                            onClick={goToday}
                            className="h-full border-x border-secondary px-3.5 text-[13px] font-medium text-primary hover:bg-secondary"
                        >
                            Today
                        </button>
                        <button
                            aria-label="Next month"
                            onClick={nextMonth}
                            className="flex h-full w-8 items-center justify-center text-tertiary hover:bg-secondary hover:text-primary"
                        >
                            <ChevronRight className="size-3.5" />
                        </button>
                    </div>

                    <Button size="sm" color="secondary" iconTrailing={ChevronDown}>
                        Month view
                    </Button>
                </div>
            </div>

            {/* ---------- Natural-language event input ---------- */}
            <div className="flex flex-col gap-1.5 border-b border-secondary px-5 py-3">
                <div className="flex items-center gap-2">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddEvent()}
                        placeholder={`e.g. "Team lunch on ${MONTH_NAMES[month]} 20 at noon"`}
                        className="h-8 flex-1 rounded-lg border border-secondary bg-primary px-3 text-sm text-primary placeholder:text-placeholder focus:border-brand focus:outline-none"
                    />
                    <Button size="sm" color="primary" iconLeading={Plus} isLoading={loading} onClick={handleAddEvent}>
                        Add event
                    </Button>
                </div>
                {error && <p className="text-xs text-error-primary">{error}</p>}
            </div>

            {/* ---------- Weekday header row ---------- */}
            <div className="grid grid-cols-7 border-b border-secondary">
                {weekdays.map((d) => (
                    <div key={d} className="px-3 py-2.5 text-xs text-tertiary">
                        {d}
                    </div>
                ))}
            </div>

            {/* ---------- Month grid ---------- */}
            <div className="grid auto-rows-[minmax(118px,auto)] grid-cols-7">
                {days.map((day, i) => {
                    const lastCol = (i + 1) % 7 === 0;
                    const lastRow = i >= days.length - 7;
                    return (
                        <div
                            key={i}
                            className={`relative flex min-h-29.5 flex-col gap-0.75 border-secondary bg-primary p-2 ${
                                lastCol ? "" : "border-r"
                            } ${lastRow ? "" : "border-b"}`}
                        >
                            {day.today ? (
                                <span className="inline-flex size-5.5 items-center justify-center rounded-full bg-brand-solid text-[12.5px] font-medium text-white">
                                    {day.date}
                                </span>
                            ) : (
                                <span className={`px-0.5 text-[12.5px] ${day.outside ? "text-quaternary" : "text-primary"}`}>{day.date}</span>
                            )}

                            {day.band && <BandPill {...day.band} />}
                            {(day.band || day.bandSpacer) && <div className="h-5.5" />}
                            {day.events?.map((ev, j) => (
                                <EventPill key={j} event={ev} />
                            ))}

                            {day.overflow && <div className="cursor-pointer px-1.5 text-xs text-tertiary hover:text-primary">{day.overflow} more…</div>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
