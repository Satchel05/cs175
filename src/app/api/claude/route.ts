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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: prompt }),
        });

        const result = await response.json();
        console.log("Full result:", JSON.stringify(result));
        let rawOutput = result[0]?.generated_text ?? "";
        console.log("Raw output:", rawOutput);

        if (!rawOutput.trim().startsWith("{")) {
            rawOutput = `{${rawOutput}}`;
        }
        console.log("After wrapping:", rawOutput);

        rawOutput = rawOutput.replace(/^```json|^```|```$/gm, "").trim();
        console.log("After regex:", rawOutput);

        const parsedJson = JSON.parse(rawOutput);
        console.log("Parsed:", parsedJson);

        const sanitized = {
            title: parsedJson.title ?? "Untitled Event",
            date: parsedJson.date ?? today,
            time: parsedJson.time ?? "00:00",
            duration_minutes: parsedJson.duration_minutes ?? 60,
            location: parsedJson.location?.trim() ?? "",
            recurrence: parsedJson.recurrence ?? "none",
        };

        return NextResponse.json(sanitized, { status: 200 });
    } catch (error) {
        console.error("Error processing HuggingFace request:", error);
        return NextResponse.json({ error: "Failed to extract calendar event" }, { status: 500 });
    }
}
