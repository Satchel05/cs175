import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const APIKEY = process.env.CLAUDE_API_KEY;
const MODEL = process.env.CLAUDE_MODEL;

const anthropic = new Anthropic({apiKey: APIKEY, });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json({ error: "The 'text' field is required." }, { status: 400 });
    }

    // needed for JSON format
    const today = new Date().toISOString().split('T')[0];

    // baseline claude call
    const response = await anthropic.messages.create({
      model:"claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: `Extract a calendar event as JSON with fields: title, date (YYYY-MM-DD), time (HH:MM), duration_minutes, location, recurrence. Output JSON only. Today is ${today}.`,
      messages: [{ role: "user", content: text }],
    });

    // process and parse the call
    const messageContent = response.content[0];
    let rawOutput = messageContent.type === 'text' ? messageContent.text.trim() : '';

    if (rawOutput.startsWith("```json")) {
      rawOutput = rawOutput.slice(7, -3).trim();
    } else if (rawOutput.startsWith("```")) {
      rawOutput = rawOutput.slice(3, -3).trim();
    }

    const parsedJson = JSON.parse(rawOutput);

    return NextResponse.json(parsedJson, { status: 200 });

  } catch (error) {
    console.error("Error processing Claude request:", error);
    return NextResponse.json({ error: "Failed to extract calendar event" }, { status: 500 });
  }
}