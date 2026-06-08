import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

function resolveTime(text: string): string | null {
    const lower = text.toLowerCase();

    if (/\bnoon\b/.test(lower)) return "12:00";
    if (/\bmidnight\b/.test(lower)) return "00:00";

    // "3:30pm", "10:30am"
    const colonAmPm = lower.match(/\b(\d{1,2}):(\d{2})\s*([ap]m)\b/);
    if (colonAmPm) {
        let h = parseInt(colonAmPm[1]);
        const m = parseInt(colonAmPm[2]);
        if (colonAmPm[3] === "pm" && h !== 12) h += 12;
        if (colonAmPm[3] === "am" && h === 12) h = 0;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }

    // "14:30", "9:00" (24-hour, no am/pm)
    const colon24 = lower.match(/\b(\d{1,2}):(\d{2})\b/);
    if (colon24) {
        const h = parseInt(colon24[1]);
        const m = parseInt(colon24[2]);
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59)
            return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }

    // "1pm", "9am", "12pm"
    const simple = lower.match(/\b(\d{1,2})\s*([ap]m)\b/);
    if (simple) {
        let h = parseInt(simple[1]);
        if (simple[2] === "pm" && h !== 12) h += 12;
        if (simple[2] === "am" && h === 12) h = 0;
        return `${String(h).padStart(2, "0")}:00`;
    }

    return null;
}

// toISOString() always returns UTC, which gives the wrong date in US timezones
// at night (e.g. 11pm Pacific = next day UTC). Use local calendar fields instead.
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

    // "june 24", "july 24th", "24th december", etc.
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
                if (mi < now.getMonth() || (mi === now.getMonth() && dayNum <= now.getDate())) year++;
                return localDateString(new Date(year, mi, dayNum));
            }
        }
    }

    // bare "the 24th" / "on the 12" — picks nearest upcoming day in current or next month
    const dayNumMatch = lower.match(/\b(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b|\bon\s+the\s+(\d{1,2})\b|\bon\s+(\d{1,2})\b/);
    if (dayNumMatch) {
        const dayNum = parseInt(dayNumMatch[1] ?? dayNumMatch[2] ?? dayNumMatch[3]);
        if (dayNum >= 1 && dayNum <= 31) {
            let d = new Date(now.getFullYear(), now.getMonth(), dayNum);
            if (d <= now) d = new Date(now.getFullYear(), now.getMonth() + 1, dayNum);
            return localDateString(d);
        }
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
        const prompt = `Extract a calendar event as JSON with fields: title, date (YYYY-MM-DD), time (HH:MM), duration_minutes, location, recurrence. Output JSON only, no explanation. Today is ${today}.\n\nInput: ${text}`;

        const HF_MODEL_URL = process.env.HF_MODEL_URL ?? "http://localhost:8000/predict";
        const response = await fetch(HF_MODEL_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: prompt }),
        });

        const result = await response.json();
        const output = result.output !== undefined ? result.output : result[0]?.generated_text;

        if (output == null) {
            throw new Error("Model returned null or empty output");
        }

        let parsedJson: Record<string, unknown>;
        if (output !== null && typeof output === "object") {
            parsedJson = output as Record<string, unknown>;
        } else {
            let rawOutput = (output ?? "") as string;
            rawOutput = rawOutput.replace(/^```json\s*|^```\s*|\s*```$/gm, "").trim();
            const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
            if (jsonMatch) rawOutput = jsonMatch[0];
            else if (!rawOutput.startsWith("{")) rawOutput = `{${rawOutput}}`;
            try {
                parsedJson = JSON.parse(rawOutput);
            } catch {
                const obj: Record<string, unknown> = {};
                const pairs = rawOutput.matchAll(/"([^"]+)"\s*:\s*("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false|null)/g);
                for (const [, key, val] of pairs) obj[key] = JSON.parse(val);
                if (Object.keys(obj).length === 0) throw new Error(`Unparseable model output: ${rawOutput}`);
                parsedJson = obj;
            }
        }

        // Override model's date and time with values parsed from the user's text
        const resolvedDate = resolveDate(text);
        parsedJson.date = resolvedDate ?? today;

        const resolvedTime = resolveTime(text);
        parsedJson.time = resolvedTime;

        return NextResponse.json(parsedJson, { status: 200 });
    } catch (error) {
        console.error("Error processing HuggingFace request:", error);
        return NextResponse.json({ error: "Failed to extract calendar event" }, { status: 500 });
    }
}
