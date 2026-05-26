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
  const t = tints[event.color];
  return (
    <div
      className={`flex cursor-pointer items-center justify-between gap-1.5 rounded-md border px-1.5 py-0.5 text-xs ${t.bg} ${t.border}`}
    >
      <span className={`truncate font-medium ${t.text}`}>{event.name}</span>
      {event.time && (
        <span className="shrink-0 text-[11px] text-tertiary">{event.time}</span>
      )}
    </div>
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
