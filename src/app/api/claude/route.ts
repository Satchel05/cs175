import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const SCHEMA = {
    type: "object",
    properties: {
        title: { type: "string" },
        date: { type: "string" },
        time: { anyOf: [{ type: "string" }, { type: "null" }] },
        start_time: { anyOf: [{ type: "string" }, { type: "null" }] },
        end_time: { anyOf: [{ type: "string" }, { type: "null" }] },
        duration_minutes: { anyOf: [{ type: "integer" }, { type: "null" }] },
        location: { anyOf: [{ type: "string" }, { type: "null" }] },
        recurrence: { type: "string", enum: ["none", "daily", "weekly", "monthly", "yearly"] },
    },
    required: ["title", "date", "time", "start_time", "end_time", "duration_minutes", "location", "recurrence"],
    additionalProperties: false,
} as const;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { text } = body;

        if (!text) {
            return NextResponse.json({ error: "The 'text' field is required." }, { status: 400 });
        }

        const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
        const today = new Date().toISOString().split("T")[0];

        const response = await client.messages.create({
            model: "claude-haiku-4-5",
            max_tokens: 512,
            system: `You are a calendar event parser. Today is ${today}. Extract event details from the user's natural language input. Resolve relative dates ("tomorrow", "next Monday", weekday names) based on today's date. Use 24-hour HH:MM for time fields. If a time range is given (e.g. "2pm–4pm"), populate start_time and end_time. Use null for any field not mentioned.`,
            messages: [{ role: "user", content: text }],
            output_config: { format: { type: "json_schema", schema: SCHEMA } },
        });

        const block = response.content[0];
        if (block.type !== "text") {
            throw new Error("Unexpected content type from Claude");
        }

        const parsed = JSON.parse(block.text);

        return NextResponse.json(
            {
                title: parsed.title ?? "Untitled Event",
                date: parsed.date ?? today,
                time: parsed.time ?? null,
                start_time: parsed.start_time ?? null,
                end_time: parsed.end_time ?? null,
                duration_minutes: parsed.duration_minutes ?? null,
                location: parsed.location ?? null,
                recurrence: parsed.recurrence ?? "none",
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("Claude API error:", error);
        return NextResponse.json({ error: "Failed to extract calendar event" }, { status: 500 });
    }
}
