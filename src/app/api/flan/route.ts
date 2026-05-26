import dns from "node:dns";
import https from "node:https";
import { NextRequest, NextResponse } from "next/server";

// macOS uses a link-local IPv6 DNS server that Node's getaddrinfo can't use.
// Override to use public DNS and a custom lookup for https.request.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

function httpsPost(url: string, headers: Record<string, string>, body: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const req = https.request(
            {
                hostname: parsed.hostname,
                path: parsed.pathname + parsed.search,
                method: "POST",
                headers: { ...headers, "Content-Length": Buffer.byteLength(body) },
                lookup: (hostname, _opts, cb) => {
                    dns.resolve4(hostname, (err, addresses) => {
                        if (err) cb(err, "", 4);
                        else cb(null, addresses[0], 4);
                    });
                },
            },
            (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                });
            },
        );
        req.on("error", reject);
        req.write(body);
        req.end();
    });
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

        const HF_MODEL_URL =
            process.env.HF_MODEL_URL ??
            "https://api-inference.huggingface.co/models/google/flan-t5-base";

        const result = (await httpsPost(
            HF_MODEL_URL,
            {
                Authorization: `Bearer ${process.env.HF_API_KEY}`,
                "Content-Type": "application/json",
            },
            JSON.stringify({ inputs: prompt }),
        )) as Array<{ generated_text: string }>;

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
