import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function resolveDate(text: string): string | null {
    const lower = text.toLowerCase();
    const now = new Date();

    if (lower.includes("today")) {
        return now.toISOString().split("T")[0];
    }

    if (lower.includes("tomorrow")) {
        const d = new Date(now);
        d.setDate(d.getDate() + 1);
        return d.toISOString().split("T")[0];
    }

    const inDaysMatch = lower.match(/\bin\s+(\d+)\s+days?\b/);
    if (inDaysMatch) {
        const d = new Date(now);
        d.setDate(d.getDate() + parseInt(inDaysMatch[1]));
        return d.toISOString().split("T")[0];
    }

    const inWeeksMatch = lower.match(/\bin\s+(\d+)\s+weeks?\b/);
    if (inWeeksMatch) {
        const d = new Date(now);
        d.setDate(d.getDate() + parseInt(inWeeksMatch[1]) * 7);
        return d.toISOString().split("T")[0];
    }

    if (lower.includes("next week")) {
        const d = new Date(now);
        d.setDate(d.getDate() + 7);
        return d.toISOString().split("T")[0];
    }

    const weekdayIdx = WEEKDAYS.findIndex((w) => lower.includes(w));
    if (weekdayIdx !== -1) {
        const diff = ((weekdayIdx - now.getDay() + 7) % 7) || 7;
        const d = new Date(now);
        d.setDate(d.getDate() + diff);
        return d.toISOString().split("T")[0];
    }

    const dayNumMatch = lower.match(/\b(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b|\bon\s+the\s+(\d{1,2})\b|\bon\s+(\d{1,2})\b/);
    if (dayNumMatch) {
        const dayNum = parseInt(dayNumMatch[1] ?? dayNumMatch[2] ?? dayNumMatch[3]);
        if (dayNum >= 1 && dayNum <= 31) {
            let d = new Date(now.getFullYear(), now.getMonth(), dayNum);
            if (d <= now) d = new Date(now.getFullYear(), now.getMonth() + 1, dayNum);
            return d.toISOString().split("T")[0];
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

        const today = new Date().toISOString().split("T")[0];
        const prompt = `Extract a calendar event as JSON with fields: title, date (YYYY-MM-DD), time (HH:MM), duration_minutes, location, recurrence. Output JSON only, no explanation. Today is ${today}.\n\nInput: ${text}`;

        const HF_MODEL_URL = process.env.HF_MODEL_URL ?? "http://localhost:8000/predict";
        const response = await fetch(HF_MODEL_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: prompt }),
        });

        const result = await response.json();
        console.log(`Json from flan: ${JSON.stringify(result, null, 2)}`);
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

        // Override model's date with one resolved directly from the user's text
        const resolvedDate = resolveDate(text);
        parsedJson.date = resolvedDate ?? today;

        return NextResponse.json(parsedJson, { status: 200 });
    } catch (error) {
        console.error("Error processing HuggingFace request:", error);
        return NextResponse.json({ error: "Failed to extract calendar event" }, { status: 500 });
    }
}
