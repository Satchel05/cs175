import { InferenceClient } from "@huggingface/inference";
import { NextRequest, NextResponse } from "next/server";

const MODEL = "google/flan-t5-base";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { text } = body;

        if (!text) {
            return NextResponse.json({ error: "The 'text' field is required." }, { status: 400 });
        }

        const today = new Date().toISOString().split("T")[0];

        const prompt = `Extract a calendar event as JSON with fields: title, date (YYYY-MM-DD), time (HH:MM), duration_minutes, location, recurrence. Output JSON only, no explanation. Today is ${today}.\n\nInput: ${text}`;

        const HF_MODEL_URL = process.env.HF_MODEL_URL ?? "https://api-inference.huggingface.co/models/google/flan-t5-base";
        const response = await fetch(HF_MODEL_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.HF_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: prompt }),
        });
        const result = await response.json();
        let rawOutput = result[0]?.generated_text ?? "";

        if (rawOutput.startsWith("```json")) {
            rawOutput = rawOutput.slice(7, -3).trim();
        } else if (rawOutput.startsWith("```")) {
            rawOutput = rawOutput.slice(3, -3).trim();
        }

        const parsedJson = JSON.parse(rawOutput);

        return NextResponse.json(parsedJson, { status: 200 });
    } catch (error) {
        console.error("Error processing HuggingFace request:", error);
        return NextResponse.json({ error: "Failed to extract calendar event" }, { status: 500 });
    }
}
