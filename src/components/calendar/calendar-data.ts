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
    duration_minutes?: number;
    location?: string;
    recurrence?: string;
    color: EventColor;
}

export interface DayCell {
    date: number;
    outside?: boolean;
    today?: boolean;
    events?: CalendarEvent[];
    overflow?: number;
    band?: { name: string; color: EventColor; span: number };
    bandSpacer?: boolean;
}

export const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export const MONTH_ABBR = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

export function buildMonthDays(year: number, month: number): DayCell[] {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: DayCell[] = [];

    for (let i = firstDow - 1; i >= 0; i--) {
        cells.push({ date: prevMonthDays - i, outside: true });
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const isToday = year === todayYear && month === todayMonth && d === todayDate;
        cells.push({ date: d, today: isToday ? true : undefined });
    }

    const trailing = 42 - cells.length;
    for (let d = 1; d <= trailing; d++) {
        cells.push({ date: d, outside: true });
    }

    return cells;
}
