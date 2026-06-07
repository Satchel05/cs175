import { NextRequest, NextResponse } from "next/server";

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
            headers: {
                "Content-Type": "application/json",
            },
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

        if (!parsedJson.date || !/^\d{4}-\d{2}-\d{2}$/.test(parsedJson.date as string)) {
            parsedJson.date = today;
        }

        return NextResponse.json(parsedJson, { status: 200 });
    } catch (error) {
        console.error("Error processing HuggingFace request:", error);
        return NextResponse.json({ error: "Failed to extract calendar event" }, { status: 500 });
    }
}
