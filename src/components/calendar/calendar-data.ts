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
  | "yellow";

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
  {
    date: 4,
    events: [
      { name: "Coffee with Ali", time: "4:30 AM", color: "neutral" },
      { name: "Marketing sit…", time: "7:30 AM", color: "neutral" },
    ],
  },
  { date: 5 },
  { date: 6 },
  {
    date: 7,
    events: [
      { name: "All-hands me…", time: "9:00 AM", color: "neutral" },
      { name: "Dinner with …", time: "11:30 AM", color: "neutral" },
    ],
  },
  { date: 8 },
  { date: 9 },

  // Week 3: May 10 – 16
  {
    date: 10,
    today: true,
    events: [{ name: "Ava's engag…", time: "6:00 AM", color: "purple" }],
  },
  {
    date: 11,
    events: [
      { name: "Monday stan…", time: "2:00 AM", color: "neutral" },
      { name: "Content plan…", time: "4:00 AM", color: "blue" },
    ],
  },
  {
    date: 12,
    events: [
      { name: "Product demo", time: "3:30 AM", color: "blue" },
      { name: "Catch up w/ …", time: "7:30 AM", color: "pink" },
    ],
  },
  {
    date: 13,
    events: [
      { name: "Deep work", time: "2:00 AM", color: "blue" },
      { name: "One-on-one …", time: "3:00 AM", color: "red" },
      { name: "Design sync", time: "3:30 AM", color: "blue" },
    ],
    overflow: 2,
  },
  {
    date: 14,
    events: [{ name: "Lunch with Ol…", time: "5:00 AM", color: "green" }],
  },
  {
    date: 15,
    events: [
      { name: "Friday standup", time: "2:00 AM", color: "neutral" },
      { name: "Olivia x Riley", time: "3:00 AM", color: "purple" },
      { name: "Product demo", time: "6:30 AM", color: "blue" },
    ],
  },
  {
    date: 16,
    events: [{ name: "House inspec…", time: "4:00 AM", color: "orange" }],
  },

  // Week 4: May 17 – 23
  { date: 17 },
  {
    date: 18,
    events: [{ name: "Team lunch", time: "5:15 AM", color: "pink" }],
  },
  { date: 19 },
  {
    date: 20,
    events: [{ name: "Product plan…", time: "2:30 AM", color: "blue" }],
  },
  {
    date: 21,
    events: [
      { name: "Amélie's first …", time: "3:00 AM", color: "red" },
      { name: "All-hands me…", time: "9:00 AM", color: "neutral" },
    ],
  },
  {
    date: 22,
    events: [
      { name: "Coffee w/ Am…", time: "2:30 AM", color: "red" },
      { name: "Design feedb…", time: "7:30 AM", color: "pink" },
    ],
  },
  {
    date: 23,
    events: [{ name: "Half marathon", time: "12:00 AM", color: "green" }],
  },

  // Week 5: May 24 – 30
  { date: 24 },
  {
    date: 25,
    band: { name: "Team offsite", color: "green", span: 2 },
    events: [{ name: "Deep work", time: "2:15 AM", color: "blue" }],
  },
  {
    date: 26,
    bandSpacer: true,
    events: [
      { name: "Quarterly revi…", time: "4:30 AM", color: "orange" },
      { name: "Lunch with Z…", time: "6:00 AM", color: "green" },
    ],
  },
  {
    date: 27,
    events: [
      { name: "Deep work", time: "2:00 AM", color: "blue" },
      { name: "Design sync", time: "7:30 AM", color: "blue" },
    ],
  },
  {
    date: 28,
    events: [
      { name: "Amélie coffee", time: "3:00 AM", color: "red" },
      { name: "Dinner with …", time: "12:00 PM", color: "neutral" },
    ],
  },
  {
    date: 29,
    events: [
      { name: "Accountant", time: "6:45 AM", color: "yellow" },
      { name: "Marketing sit…", time: "7:30 AM", color: "neutral" },
    ],
  },
  { date: 30 },

  // Week 6: May 31 – Jun 6
  {
    date: 31,
    events: [{ name: "Drive to Sydn…", time: "2:00 AM", color: "orange" }],
  },
  {
    date: 1,
    outside: true,
    events: [{ name: "Content plan…", time: "4:00 AM", color: "blue" }],
  },
  {
    date: 2,
    outside: true,
    events: [{ name: "Lunch with Ali", time: "5:45 AM", color: "purple" }],
  },
  {
    date: 3,
    outside: true,
    events: [{ name: "Product plan…", time: "2:30 AM", color: "blue" }],
  },
  {
    date: 4,
    outside: true,
    events: [
      { name: "All-hands me…", time: "9:00 AM", color: "neutral" },
      { name: "Team dinner", time: "10:30 AM", color: "pink" },
    ],
  },
  { date: 5, outside: true },
  { date: 6, outside: true },
];
