/**
 * Integration tests for the Flan-T5 model via the /api/flan route.
 *
 * These tests do NOT mock fetch — they hit the real Flask server on
 * localhost:8000. Requires `python3 serve.py` to be running before running.
 *
 * Run: npx jest flan-integration
 */

import { POST } from "../flan/route";
import { NextRequest } from "next/server";

function makeReq(body: unknown): NextRequest {
    return new NextRequest("http://localhost/api/flan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

function isValidDate(str: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(Date.parse(str));
}

jest.setTimeout(30000);

describe("Flan-T5 Integration Tests (requires serve.py on :8000)", () => {
    // ── Response shape ──────────────────────────────────────────────────────

    it("returns a valid JSON response for a simple prompt", async () => {
        const res = await POST(makeReq({ text: "team lunch at 1pm" }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty("title");
        expect(body).toHaveProperty("date");
        expect(body).toHaveProperty("time");
        expect(body).toHaveProperty("duration_minutes");
        expect(body).toHaveProperty("location");
        expect(body).toHaveProperty("recurrence");
    });

    // ── Time parsing ────────────────────────────────────────────────────────

    it("parses '1pm' as 13:00", async () => {
        const res = await POST(makeReq({ text: "team lunch at 1pm" }));
        const body = await res.json();
        expect(body.time).toBe("13:00");
    });

    it("parses '12pm' as 12:00", async () => {
        const res = await POST(makeReq({ text: "lunch at 12pm" }));
        const body = await res.json();
        expect(body.time).toBe("12:00");
    });

    it("parses '9am' as 09:00", async () => {
        const res = await POST(makeReq({ text: "standup at 9am" }));
        const body = await res.json();
        expect(body.time).toBe("09:00");
    });

    it("parses '3:30pm' as 15:30", async () => {
        const res = await POST(makeReq({ text: "meeting at 3:30pm" }));
        const body = await res.json();
        expect(body.time).toBe("15:30");
    });

    // ── Date format ─────────────────────────────────────────────────────────

    it("always returns date in YYYY-MM-DD format", async () => {
        const res = await POST(makeReq({ text: "meeting tomorrow at 2pm" }));
        const body = await res.json();
        expect(isValidDate(body.date)).toBe(true);
    });

    it("'today' resolves to today's date", async () => {
        const today = new Date().toISOString().split("T")[0];
        const res = await POST(makeReq({ text: "call at 4pm today" }));
        const body = await res.json();
        expect(body.date).toBe(today);
    });

    it("'tomorrow' resolves to tomorrow's date", async () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const tomorrow = d.toISOString().split("T")[0];
        const res = await POST(makeReq({ text: "dentist tomorrow at 10am" }));
        const body = await res.json();
        expect(body.date).toBe(tomorrow);
    });

    it("'on the 12th' resolves to the 12th of the current or next month", async () => {
        const res = await POST(makeReq({ text: "team lunch at 1pm on the 12th" }));
        const body = await res.json();
        expect(isValidDate(body.date)).toBe(true);
        expect(new Date(body.date).getDate()).toBe(12);
    });

    // ── Day-of-week resolution ──────────────────────────────────────────────

    const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

    test.each(weekdays)("'%s' resolves to the correct weekday", async (day) => {
        const dayIndex = weekdays.indexOf(day);
        const res = await POST(makeReq({ text: `meeting on ${day} at 10am` }));
        const body = await res.json();
        expect(isValidDate(body.date)).toBe(true);
        expect(new Date(body.date + "T12:00:00").getDay()).toBe(dayIndex);
        expect(new Date(body.date).getTime()).toBeGreaterThan(Date.now());
    });

    // ── Hallucination guards ────────────────────────────────────────────────

    it("does not hallucinate a location when none is mentioned", async () => {
        const res = await POST(makeReq({ text: "team lunch at 1pm on tuesday" }));
        const body = await res.json();
        expect(body.location).toBeNull();
    });

    it("does not hallucinate a duration when none is mentioned", async () => {
        const res = await POST(makeReq({ text: "team lunch at 1pm on tuesday" }));
        const body = await res.json();
        expect(body.duration_minutes).toBeNull();
    });

    // ── Title extraction ────────────────────────────────────────────────────

    it("extracts 'Lunch' from 'team lunch at 1pm'", async () => {
        const res = await POST(makeReq({ text: "team lunch at 1pm" }));
        const body = await res.json();
        expect(body.title.toLowerCase()).toContain("lunch");
    });

    it("extracts 'Standup' from 'morning standup at 9am'", async () => {
        const res = await POST(makeReq({ text: "morning standup at 9am" }));
        const body = await res.json();
        expect(body.title.toLowerCase()).toMatch(/standup|stand.?up/);
    });
});
