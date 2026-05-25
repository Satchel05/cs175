import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json({ error: "The 'text' field is required." }, { status: 400 });
    }

    // needed for JSON format
    const today = new Date().toISOString().split('T')[0];

    // process and parse the call
    const messageContent = text;
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