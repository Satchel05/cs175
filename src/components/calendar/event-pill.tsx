"use client";

import { useState } from "react";
import type { CalendarEvent, EventColor } from "./calendar-data";

/**
 * Tailwind utility tints per UUI color ramp.
 * These are *resolved* class strings (not template-built) so Tailwind's
 * compiler can see them and emit the CSS.
 *
 * If you add a new EventColor variant, add a row here.
 */
const tints: Record<EventColor, { bg: string; border: string; text: string }> = {
  neutral: { bg: "bg-utility-neutral-50", border: "border-utility-neutral-200", text: "text-utility-neutral-700" },
  blue:    { bg: "bg-utility-blue-50",    border: "border-utility-blue-200",    text: "text-utility-blue-700" },
  indigo:  { bg: "bg-utility-indigo-50",  border: "border-utility-indigo-200",  text: "text-utility-indigo-700" },
  purple:  { bg: "bg-utility-purple-50",  border: "border-utility-purple-200",  text: "text-utility-purple-700" },
  pink:    { bg: "bg-utility-pink-50",    border: "border-utility-pink-200",    text: "text-utility-pink-700" },
  orange:  { bg: "bg-utility-orange-50",  border: "border-utility-orange-200",  text: "text-utility-orange-700" },
  red:     { bg: "bg-utility-red-50",     border: "border-utility-red-200",     text: "text-utility-red-700" },
  green:   { bg: "bg-utility-green-50",   border: "border-utility-green-200",   text: "text-utility-green-700" },
  yellow:  { bg: "bg-utility-yellow-50",  border: "border-utility-yellow-200",  text: "text-utility-yellow-700" },
  brand:   { bg: "bg-brand-secondary",    border: "border-brand",               text: "text-brand-secondary" },
};

export function EventPill({ event }: { event: CalendarEvent }) {
  const [expanded, setExpanded] = useState(false);
  const t = tints[event.color];

  const formatTime = (time?: string | null) => {
    if (!time) return undefined;

    const [hourRaw, minuteRaw] = time.split(":");
    let hour = Number(hourRaw);
    const minute = minuteRaw ?? "00";
    const suffix = hour >= 12 ? "PM" : "AM";

    hour = hour % 12 || 12;

    return `${hour}:${minute} ${suffix}`;
  };

  const timeRange =
    event.start_time && event.end_time
      ? `${formatTime(event.start_time)} – ${formatTime(event.end_time)}`
      : event.start_time
        ? formatTime(event.start_time)
        : event.time
          ? formatTime(event.time)
          : undefined;

  const meta = [
    timeRange,
    event.duration_minutes ? `${event.duration_minutes} min` : undefined,
    event.location,
    event.recurrence && event.recurrence !== "none" ? event.recurrence : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={() => setExpanded((prev) => !prev)}
      aria-expanded={expanded}
      title={event.name}
      className={`group flex w-full cursor-pointer flex-col gap-1 rounded-lg border px-2 py-1.5 text-left text-xs shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-primary/30 ${t.bg} ${t.border}`}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={`font-semibold ${t.text} ${
            expanded ? "whitespace-normal break-words leading-snug" : "truncate"
          }`}
        >
          {event.name}
        </span>

        <span className={`shrink-0 text-[10px] font-bold ${t.text}`}>
          {expanded ? "−" : "+"}
        </span>
      </div>

      {meta && (
        <span
          className={`text-[11px] font-medium text-tertiary ${
            expanded ? "whitespace-normal break-words leading-snug" : "truncate"
          }`}
        >
          {meta}
        </span>
      )}

      {expanded && (
        <div className="mt-1 rounded-md bg-white/70 px-2 py-1 text-[11px] text-tertiary shadow-inner">
          <div>Start: {formatTime(event.start_time) ?? "N/A"}</div>
          <div>End: {formatTime(event.end_time) ?? "N/A"}</div>
          {event.duration_minutes && <div>Duration: {event.duration_minutes} min</div>}
          {event.location && <div>Location: {event.location}</div>}
        </div>
      )}
    </button>
  );
}

export function BandPill({
  name,
  color,
  span,
}: {
  name: string;
  color: EventColor;
  span: number;
}) {
  const t = tints[color];
  // The band is positioned absolutely so it can visually cross cell borders.
  // Width = span * 100% of one column, minus the 0.5rem cell padding offset.
  return (
    <div
      className={`absolute top-[30px] left-2 z-10 flex cursor-pointer items-center rounded-md border px-1.5 py-0.5 text-xs ${t.bg} ${t.border}`}
      style={{ width: `calc(${span * 100}% - 0.5rem)` }}
    >
      <span className={`truncate font-medium ${t.text}`}>{name}</span>
    </div>
  );
}
