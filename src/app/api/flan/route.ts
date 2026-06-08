import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
];

function resolveTime(text: string): string | null {
    const lower = text.toLowerCase();

    if (/\bnoon\b/.test(lower)) return "12:00";
    if (/\bmidnight\b/.test(lower)) return "00:00";

    const colonAmPm = lower.match(/\b(\d{1,2}):(\d{2})\s*([ap]m)\b/);
    if (colonAmPm) {
        let h = parseInt(colonAmPm[1]);
        const m = parseInt(colonAmPm[2]);

        if (colonAmPm[3] === "pm" && h !== 12) h += 12;
        if (colonAmPm[3] === "am" && h === 12) h = 0;

        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }

    const colon24 = lower.match(/\b(\d{1,2}):(\d{2})\b/);
    if (colon24) {
        const h = parseInt(colon24[1]);
        const m = parseInt(colon24[2]);

        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
            return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        }
    }

    const simple = lower.match(/\b(\d{1,2})\s*([ap]m)\b/);
    if (simple) {
        let h = parseInt(simple[1]);

        if (simple[2] === "pm" && h !== 12) h += 12;
        if (simple[2] === "am" && h === 12) h = 0;

        return `${String(h).padStart(2, "0")}:00`;
    }

    return null;
}

function addMinutes(time: string, minutes: number): string {
    const [h, m] = time.split(":").map(Number);
    const total = h * 60 + m + minutes;
    const newH = Math.floor(total / 60) % 24;
    const newM = total % 60;

    return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function resolveTimeRange(text: string): { start_time: string | null; end_time: string | null } {
    const lower = text.toLowerCase();

    const range = lower.match(/\bfrom\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|noon|midnight)\s+(?:to|until|-)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|noon|midnight)\b/);

    if (range) {
        const start = resolveTime(range[1]);
        const end = resolveTime(range[2]);

        return { start_time: start, end_time: end };
    }

    return { start_time: resolveTime(text), end_time: null };
}

function localDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${y}-${m}-${day}`;
}

function resolveDate(text: string): string | null {
    const lower = text.toLowerCase();
    const now = new Date();

    if (lower.includes("today")) {
        return localDateString(now);
    }

    if (lower.includes("tomorrow")) {
        const d = new Date(now);
        d.setDate(d.getDate() + 1);
        return localDateString(d);
    }

    const inDaysMatch = lower.match(/\bin\s+(\d+)\s+days?\b/);
    if (inDaysMatch) {
        const d = new Date(now);
        d.setDate(d.getDate() + parseInt(inDaysMatch[1]));
        return localDateString(d);
    }

    const inWeeksMatch = lower.match(/\bin\s+(\d+)\s+weeks?\b/);
    if (inWeeksMatch) {
        const d = new Date(now);
        d.setDate(d.getDate() + parseInt(inWeeksMatch[1]) * 7);
        return localDateString(d);
    }

    if (lower.includes("next week")) {
        const d = new Date(now);
        d.setDate(d.getDate() + 7);
        return localDateString(d);
    }

    const weekdayIdx = WEEKDAYS.findIndex((w) => lower.includes(w));
    if (weekdayIdx !== -1) {
        const diff = ((weekdayIdx - now.getDay() + 7) % 7) || 7;
        const d = new Date(now);
        d.setDate(d.getDate() + diff);
        return localDateString(d);
    }

    for (let mi = 0; mi < MONTHS.length; mi++) {
        const mon = MONTHS[mi];

        if (!lower.includes(mon)) continue;

        const withMonth = lower.match(
            new RegExp(`(?:${mon}\\s+(\\d{1,2})(?:st|nd|rd|th)?|(\\d{1,2})(?:st|nd|rd|th)?\\s+${mon})`)
        );

        if (withMonth) {
            const dayNum = parseInt(withMonth[1] ?? withMonth[2]);

            if (dayNum >= 1 && dayNum <= 31) {
                let year = now.getFullYear();

                if (mi < now.getMonth() || (mi === now.getMonth() && dayNum <= now.getDate())) {
                    year++;
                }

                return localDateString(new Date(year, mi, dayNum));
            }
        }
    }

    const dayNumMatch = lower.match(
        /\b(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b|\bon\s+the\s+(\d{1,2})\b|\bon\s+(\d{1,2})\b/
    );

    if (dayNumMatch) {
        const dayNum = parseInt(dayNumMatch[1] ?? dayNumMatch[2] ?? dayNumMatch[3]);

        if (dayNum >= 1 && dayNum <= 31) {
            let d = new Date(now.getFullYear(), now.getMonth(), dayNum);

            if (d <= now) {
                d = new Date(now.getFullYear(), now.getMonth() + 1, dayNum);
            }

            return localDateString(d);
        }
    }

    return null;
}

function resolveTitle(text: string): string | null {
    // Handles: "Create an event called Team Lunch on June 20..."
    const calledMatch = text.match(
        /\bcalled\s+(.+?)(?:\s+on\s+|\s+tomorrow\b|\s+today\b|\s+at\s+|\s+for\s+\d+|\s+in\s+)/i
    );

    if (calledMatch) {
        return calledMatch[1].trim();
    }

    // Handles: "Team meeting at Luna grill tomorrow at 3 pm about new project"
    let cleaned = text
        .replace(/^(create|add|schedule|make)\s+(an?\s+)?((event|meeting|calendar event|appointment)\s*)?/i, "")
        .trim();

    const titleMatch = cleaned.match(
        /^(.+?)(?:\s+at\s+|\s+on\s+|\s+tomorrow\b|\s+today\b|\s+in\s+\d+\s+(?:days?|weeks?)|\s+next\s+week\b)/i
    );

    if (titleMatch) {
        return titleMatch[1].trim();
    }

    return cleaned.length > 0 ? cleaned : null;
}

function resolveDuration(text: string): number | null {
    const lower = text.toLowerCase();

    const minutes = lower.match(/\b(\d+)\s*(?:min|minute|minutes)\b/);
    if (minutes) return parseInt(minutes[1]);

    const hours = lower.match(/\b(\d+)\s*(?:hour|hours|hr|hrs)\b/);
    if (hours) return parseInt(hours[1]) * 60;

    if (lower.includes("hour and a half") || lower.includes("an hour and a half")) return 90;
    if (lower.includes("half an hour")) return 30;

    return null;
}

function resolveLocation(text: string): string | null {
    const matches = [
        ...text.matchAll(/\bat\s+([^.,]+?)(?=\s+(?:tomorrow|today|on|for|at|in|about|every|weekly|daily|monthly|yearly)\b|[.,]|$)/gi),
    ];

    for (let i = matches.length - 1; i >= 0; i--) {
        const location = matches[i][1].trim();

        const isTime =
            /^\d/.test(location) ||
            /^noon\b/i.test(location) ||
            /^midnight\b/i.test(location) ||
            /\bam\b|\bpm\b/i.test(location);

        if (!isTime) {
            return location;
        }
    }

    return null;
}

function resolveRecurrence(text: string): string | null {
    const lower = text.toLowerCase();

    if (lower.includes("every day") || lower.includes("daily")) {
        return "daily";
    }

    if (lower.includes("every week") || lower.includes("weekly")) {
        return "weekly";
    }

    if (lower.includes("every month") || lower.includes("monthly")) {
        return "monthly";
    }

    if (lower.includes("every year") || lower.includes("yearly") || lower.includes("annually")) {
        return "yearly";
    }

    return null;
}

function stringOrNull(value: unknown): string | null {
    if (typeof value !== "string") return null;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function numberOrNull(value: unknown): number | null {
    if (typeof value === "number" && !Number.isNaN(value)) return value;

    if (typeof value === "string") {
        const parsed = parseInt(value);
        return Number.isNaN(parsed) ? null : parsed;
    }

    return null;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { text } = body;

        if (!text) {
            return NextResponse.json({ error: "The 'text' field is required." }, { status: 400 });
        }

        const today = localDateString(new Date());

        const HF_MODEL_URL = process.env.HF_MODEL_URL ?? "http://127.0.0.1:8000/predict";

        const response = await fetch(HF_MODEL_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            throw new Error(`Model server returned status ${response.status}`);
        }

        const result = await response.json();
        const output = result.output !== undefined ? result.output : result[0]?.generated_text;

        let parsedJson: Record<string, unknown> = {};

        if (output !== null && typeof output === "object") {
            parsedJson = output as Record<string, unknown>;
        } else if (typeof output === "string") {
            let rawOutput = output.replace(/^```json\s*|^```\s*|\s*```$/gm, "").trim();

            const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                rawOutput = jsonMatch[0];
            } else if (!rawOutput.startsWith("{")) {
                rawOutput = `{${rawOutput}}`;
            }

            try {
                parsedJson = JSON.parse(rawOutput);
            } catch {
                const obj: Record<string, unknown> = {};
                const pairs = rawOutput.matchAll(
                    /"([^"]+)"\s*:\s*("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false|null)/g
                );

                for (const [, key, val] of pairs) {
                    try {
                        obj[key] = JSON.parse(val);
                    } catch {
                        // Skip malformed fields from the model output.
                    }
                }

                parsedJson = obj;
            }
        }

        const resolvedDate = resolveDate(text);
        const resolvedTimeRange = resolveTimeRange(text);
        const resolvedStartTime = resolvedTimeRange.start_time;
        let resolvedEndTime = resolvedTimeRange.end_time;
        const resolvedTitle = resolveTitle(text);
        const resolvedDuration = resolveDuration(text);
        if (!resolvedEndTime && resolvedStartTime && resolvedDuration) {
            resolvedEndTime = addMinutes(resolvedStartTime, resolvedDuration);
        }
        const resolvedLocation = resolveLocation(text);
        const resolvedRecurrence = resolveRecurrence(text);

        const finalEvent = {
            title: resolvedTitle ?? stringOrNull(parsedJson.title) ?? "Untitled Event",
            date: resolvedDate ?? stringOrNull(parsedJson.date) ?? today,
            start_time: resolvedStartTime ?? stringOrNull(parsedJson.start_time),
            end_time: resolvedEndTime ?? stringOrNull(parsedJson.end_time),
            duration_minutes: resolvedDuration ?? numberOrNull(parsedJson.duration_minutes),
            location: resolvedLocation ?? stringOrNull(parsedJson.location),
            recurrence: resolvedRecurrence ?? null,
        };

        return NextResponse.json(finalEvent, { status: 200 });
    } catch (error) {
        console.error("Error processing HuggingFace request:", error);
        return NextResponse.json({ error: "Failed to extract calendar event" }, { status: 500 });
    }
}