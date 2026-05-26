/**
 * Calendar types + seed data for May 2026.
 * Extracted from the component so it's easy to swap for a real data source later
 * (a server action, a `fetch` to your API, etc.) without touching the JSX.
 */

/**
 * Color names map to Untitled UI's utility color ramps in theme.css.
 * Available hues: brand, blue, neutral, red, yellow, green, orange,
 * indigo, fuchsia, pink, purple, sky, slate, emerald, amber.
 *
 * We expose a small curated subset that matches the original screenshot.
 */
export type EventColor =
  | "neutral"
  | "blue"
  | "indigo"
  | "purple"
  | "pink"
  | "orange"
  | "red"
  | "green"
  | "yellow"
  | "brand";

export interface CalendarEvent {
  name: string;
  time?: string;
  color: EventColor;
}

export interface DayCell {
  date: number;
  outside?: boolean;
  today?: boolean;
  events?: CalendarEvent[];
  overflow?: number;
  /** A multi-day band that starts on this cell and spans N columns to the right. */
  band?: { name: string; color: EventColor; span: number };
  /** Reserve a vertical slot because a band from an earlier day occupies this row. */
  bandSpacer?: boolean;
}

export const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const may2026Days: DayCell[] = [
  // Week 1: Apr 26 – May 2
  { date: 26, outside: true },
  { date: 27, outside: true },
  { date: 28, outside: true },
  { date: 29, outside: true },
  { date: 30, outside: true },
  { date: 1 },
  { date: 2 },

  // Week 2: May 3 – 9
  { date: 3 },
  { date: 4 },
  { date: 5 },
  { date: 6 },
  { date: 7 },
  { date: 8 },
  { date: 9 },

  // Week 3: May 10 – 16
  { date: 10, today: true },
  { date: 11 },
  { date: 12 },
  { date: 13 },
  { date: 14 },
  { date: 15 },
  { date: 16 },

  // Week 4: May 17 – 23
  { date: 17 },
  { date: 18 },
  { date: 19 },
  { date: 20 },
  { date: 21 },
  { date: 22 },
  { date: 23 },

  // Week 5: May 24 – 30
  { date: 24 },
  { date: 25 },
  { date: 26 },
  { date: 27 },
  { date: 28 },
  { date: 29 },
  { date: 30 },

  // Week 6: May 31 – Jun 6
  { date: 31 },
  { date: 1, outside: true },
  { date: 2, outside: true },
  { date: 3, outside: true },
  { date: 4, outside: true },
  { date: 5, outside: true },
  { date: 6, outside: true },
];
