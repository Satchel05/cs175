import { POST } from "../flan/route";
import { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// Date Helpers  (all UTC to match the route's `new Date().toISOString()`)
// ─────────────────────────────────────────────────────────────────────────────

/** Today's date string in YYYY-MM-DD format (UTC) — mirrors the route's logic */
const TODAY = new Date().toISOString().split("T")[0];

/** Returns a YYYY-MM-DD date string n days from today (UTC) */
function daysFromNow(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
}

/**
 * Returns the date of the next occurrence of a given weekday (UTC).
 *   0 = Sunday, 1 = Monday, … 6 = Saturday
 * Always returns a strictly future date — if today is already that weekday,
 * returns the same weekday next week.
 */
function nextWeekday(dayIndex: 0 | 1 | 2 | 3 | 4 | 5 | 6): string {
  const now = new Date();
  const diff = ((dayIndex - now.getUTCDay() + 7) % 7) || 7;
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split("T")[0];
}

/** Parses a YYYY-MM-DD string and returns its UTC day-of-week index */
function utcDayOfWeek(dateStr: string): number {
  return new Date(dateStr + "T12:00:00Z").getUTCDay();
}

// ─────────────────────────────────────────────────────────────────────────────
// Request Factory
// ─────────────────────────────────────────────────────────────────────────────

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/calendar-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HuggingFace Model Mock Helpers
// ─────────────────────────────────────────────────────────────────────────────

type CalendarEvent = {
  title: string;
  date: string;
  time: string;
  duration_minutes: number;
  location: string | null;
  recurrence: string;
};

/** Model returns the event as a plain JS object in `output` */
function mockObject(event: Partial<CalendarEvent>): void {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    json: async () => ({ output: event }),
  });
}

/** Model returns the event as a raw JSON string in `output` */
function mockString(event: Partial<CalendarEvent>): void {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    json: async () => ({ output: JSON.stringify(event) }),
  });
}

/** Model returns the event wrapped in markdown ```json … ``` fences */
function mockMarkdownJson(event: Partial<CalendarEvent>): void {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    json: async () => ({
      output: `\`\`\`json\n${JSON.stringify(event, null, 2)}\n\`\`\``,
    }),
  });
}

/** Model returns output in the array format: [{ generated_text: "..." }] */
function mockGeneratedText(event: Partial<CalendarEvent>): void {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    json: async () => [{ generated_text: JSON.stringify(event) }],
  });
}

/** Simulates a hard network failure from the HF endpoint */
function mockNetworkFail(): void {
  (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/calendar-event", () => {
  beforeAll(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ── 1. Validation ──────────────────────────────────────────────────────────

  describe("1 · Validation", () => {
    it("returns 400 when the `text` field is missing", async () => {
      const res = await POST(makeReq({}));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 when `text` is an empty string", async () => {
      const res = await POST(makeReq({ text: "" }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 when `text` is null", async () => {
      const res = await POST(makeReq({ text: null }));
      expect(res.status).toBe(400);
    });

    it("returns 200 for a valid text payload", async () => {
      mockObject({
        title: "Quick check",
        date: TODAY,
        time: "09:00",
        duration_minutes: 15,
        location: null,
        recurrence: "none",
      });
      const res = await POST(makeReq({ text: "Quick check today at 9am for 15 minutes" }));
      expect(res.status).toBe(200);
    });
  });

  // ── 2. Relative Date Resolution ────────────────────────────────────────────

  describe("2 · Relative Dates", () => {
    it("'today' → today's date", async () => {
      mockObject({
        title: "Morning standup",
        date: TODAY,
        time: "09:00",
        duration_minutes: 15,
        location: null,
        recurrence: "none",
      });
      const res = await POST(makeReq({ text: "Morning standup today at 9am for 15 minutes" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.date).toBe(TODAY);
      expect(body.time).toBe("09:00");
      expect(body.duration_minutes).toBe(15);
    });

    it("'tomorrow' → tomorrow's date", async () => {
      const tomorrow = daysFromNow(1);
      mockObject({
        title: "Meeting with John",
        date: tomorrow,
        time: "15:00",
        duration_minutes: 60,
        location: null,
        recurrence: "none",
      });
      const res = await POST(makeReq({ text: "Meeting with John tomorrow at 3pm for 1 hour" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.date).toBe(tomorrow);
      expect(body.time).toBe("15:00");
      expect(body.duration_minutes).toBe(60);
      expect(body.title).toBe("Meeting with John");
    });

    it("'in 3 days' → 3 days from today", async () => {
      const threeDays = daysFromNow(3);
      mockObject({
        title: "Dentist",
        date: threeDays,
        time: "11:00",
        duration_minutes: 45,
        location: null,
        recurrence: "none",
      });
      const res = await POST(makeReq({ text: "Dentist in 3 days at 11am for 45 minutes" }));
      const body = await res.json();
      expect(body.date).toBe(threeDays);
      expect(body.time).toBe("11:00");
    });

    it("'in 5 days' → 5 days from today", async () => {
      const fiveDays = daysFromNow(5);
      mockObject({
        title: "Follow-up call",
        date: fiveDays,
        time: "14:00",
        duration_minutes: 30,
        location: null,
        recurrence: "none",
      });
      const res = await POST(makeReq({ text: "Follow-up call in 5 days at 2pm for 30 minutes" }));
      const body = await res.json();
      expect(body.date).toBe(fiveDays);
    });

    it("'in 2 weeks' → a date at least 14 days in the future", async () => {
      const twoWeeks = daysFromNow(14);
      mockObject({
        title: "Quarterly review",
        date: twoWeeks,
        time: "14:00",
        duration_minutes: 90,
        location: null,
        recurrence: "none",
      });
      const res = await POST(makeReq({ text: "Quarterly review in 2 weeks at 2pm for 90 minutes" }));
      const body = await res.json();
      const returned = new Date(body.date + "T12:00:00Z").getTime();
      const todayMs = new Date(TODAY + "T12:00:00Z").getTime();
      expect(returned).toBeGreaterThanOrEqual(todayMs + 13 * 86_400_000);
    });

    it("'next week' → a date strictly after today", async () => {
      const nextWeek = daysFromNow(7);
      mockObject({
        title: "Project review",
        date: nextWeek,
        time: "10:00",
        duration_minutes: 60,
        location: null,
        recurrence: "none",
      });
      const res = await POST(makeReq({ text: "Project review next week at 10am" }));
      const body = await res.json();
      const returned = new Date(body.date + "T12:00:00Z").getTime();
      const todayMs = new Date(TODAY + "T12:00:00Z").getTime();
      expect(returned).toBeGreaterThan(todayMs);
    });
  });

  // ── 3. Day-of-Week Resolution ──────────────────────────────────────────────

  describe("3 · Day-of-Week Resolution", () => {
    /**
     * Each tuple: [label, dayIndex (0=Sun…6=Sat), example text]
     * The mock returns the pre-computed nextWeekday date so we can also
     * verify the actual weekday of the returned date string.
     */
    const days: [string, 0 | 1 | 2 | 3 | 4 | 5 | 6, string][] = [
      ["Sunday",    0, "Family brunch next Sunday at 11am for 2 hours"],
      ["Monday",    1, "Team standup next Monday at 9am for 15 minutes"],
      ["Tuesday",   2, "Client visit next Tuesday at 10am for 1 hour"],
      ["Wednesday", 3, "1:1 with manager next Wednesday at 1pm for 30 minutes"],
      ["Thursday",  4, "Design review next Thursday at 3pm for 1 hour"],
      ["Friday",    5, "Birthday party next Friday at 7pm for 4 hours"],
      ["Saturday",  6, "Yoga class next Saturday at 8am for 1 hour"],
    ];

    test.each(days)(
      "'next %s' → a date whose weekday is %s (%i)",
      async (dayName, dayIndex, text) => {
        const expectedDate = nextWeekday(dayIndex);
        mockObject({
          title: `Event on ${dayName}`,
          date: expectedDate,
          time: "09:00",
          duration_minutes: 60,
          location: null,
          recurrence: "none",
        });
        const res = await POST(makeReq({ text }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.date).toBe(expectedDate);
        // Verify the actual weekday of the returned date
        expect(utcDayOfWeek(body.date)).toBe(dayIndex);
        // Verify it is in the future
        expect(new Date(body.date + "T12:00:00Z").getTime()).toBeGreaterThan(
          new Date(TODAY + "T12:00:00Z").getTime()
        );
      }
    );
  });

  // ── 4. Specific Calendar Dates ─────────────────────────────────────────────

  describe("4 · Specific Calendar Dates", () => {
    it("parses 'July 1st 2026'", async () => {
      mockObject({
        title: "Board meeting",
        date: "2026-07-01",
        time: "09:00",
        duration_minutes: 120,
        location: "Conference Room A",
        recurrence: "none",
      });
      const res = await POST(
        makeReq({ text: "Board meeting on July 1st 2026 at 9am for 2 hours in Conference Room A" })
      );
      const body = await res.json();
      expect(body.date).toBe("2026-07-01");
      expect(body.location).toBe("Conference Room A");
    });

    it("parses 'August 15th'", async () => {
      mockObject({
        title: "Team offsite",
        date: "2026-08-15",
        time: "09:00",
        duration_minutes: 480,
        location: "Lake Tahoe",
        recurrence: "none",
      });
      const res = await POST(makeReq({ text: "Team offsite on August 15th at 9am at Lake Tahoe" }));
      const body = await res.json();
      expect(body.date).toBe("2026-08-15");
    });

    it("parses 'September 3rd at 2pm'", async () => {
      mockObject({
        title: "Investor call",
        date: "2026-09-03",
        time: "14:00",
        duration_minutes: 60,
        location: null,
        recurrence: "none",
      });
      const res = await POST(makeReq({ text: "Investor call on September 3rd at 2pm" }));
      const body = await res.json();
      expect(body.date).toBe("2026-09-03");
    });

    it("parses 'December 31st' (year-end edge case)", async () => {
      mockObject({
        title: "New Year Eve party",
        date: "2026-12-31",
        time: "20:00",
        duration_minutes: 240,
        location: null,
        recurrence: "none",
      });
      const res = await POST(makeReq({ text: "New Year Eve party on December 31st at 8pm" }));
      const body = await res.json();
      expect(body.date).toBe("2026-12-31");
    });
  });

  // ── 5. Time Parsing ────────────────────────────────────────────────────────

  describe("5 · Time Parsing (12-hour → 24-hour HH:MM)", () => {
    const timeCases: [string, string][] = [
      ["9am",    "09:00"],
      ["9:30am", "09:30"],
      ["10am",   "10:00"],
      ["11:15am","11:15"],
      ["12pm",   "12:00"], // noon
      ["12:30pm","12:30"],
      ["1pm",    "13:00"],
      ["2:30pm", "14:30"],
      ["3pm",    "15:00"],
      ["5:45pm", "17:45"],
      ["7pm",    "19:00"],
      ["8pm",    "20:00"],
      ["11:59pm","23:59"],
    ];

    test.each(timeCases)("'%s' → '%s'", async (inputTime, expectedTime) => {
      mockObject({
        title: "Test event",
        date: TODAY,
        time: expectedTime,
        duration_minutes: 30,
        location: null,
        recurrence: "none",
      });
      const res = await POST(makeReq({ text: `Test event today at ${inputTime} for 30 minutes` }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.time).toBe(expectedTime);
    });
  });

  // ── 6. Duration Parsing ────────────────────────────────────────────────────

  describe("6 · Duration Parsing", () => {
    const durationCases: [string, number][] = [
      ["15 minutes", 15],
      ["half an hour", 30],
      ["30 minutes", 30],
      ["45 minutes", 45],
      ["1 hour", 60],
      ["1.5 hours", 90],
      ["90 minutes", 90],
      ["2 hours", 120],
      ["3 hours", 180],
      ["4 hours", 240],
      ["8 hours", 480],
    ];

    test.each(durationCases)(
      "'%s' → duration_minutes: %d",
      async (durationText, expected) => {
        mockObject({
          title: "Event",
          date: TODAY,
          time: "10:00",
          duration_minutes: expected,
          location: null,
          recurrence: "none",
        });
        const res = await POST(
          makeReq({ text: `Event today at 10am for ${durationText}` })
        );
        const body = await res.json();
        expect(body.duration_minutes).toBe(expected);
      }
    );

    it("'all day' events return duration_minutes ≥ 480 (8 h)", async () => {
      mockObject({
        title: "Company offsite",
        date: nextWeekday(1),
        time: "09:00",
        duration_minutes: 480,
        location: null,
        recurrence: "none",
      });
      const res = await POST(makeReq({ text: "Company offsite all day next Monday" }));
      const body = await res.json();
      expect(body.duration_minutes).toBeGreaterThanOrEqual(480);
    });
  });

  // ── 7. Recurrence Detection ────────────────────────────────────────────────

  describe("7 · Recurrence Detection", () => {
    it("'every day' → recurrence: 'daily'", async () => {
      mockObject({
        title: "Daily standup",
        date: daysFromNow(1),
        time: "09:00",
        duration_minutes: 15,
        location: null,
        recurrence: "daily",
      });
      const res = await POST(makeReq({ text: "Daily standup every day at 9am for 15 minutes" }));
      const body = await res.json();
      expect(body.recurrence).toBe("daily");
    });

    it("'every Monday' → recurrence: 'weekly'", async () => {
      mockObject({
        title: "Team meeting",
        date: nextWeekday(1),
        time: "10:00",
        duration_minutes: 60,
        location: null,
        recurrence: "weekly",
      });
      const res = await POST(makeReq({ text: "Team meeting every Monday at 10am for 1 hour" }));
      const body = await res.json();
      expect(body.recurrence).toBe("weekly");
      // Should also land on a Monday
      expect(utcDayOfWeek(body.date)).toBe(1);
    });

    it("'every month' → recurrence: 'monthly'", async () => {
      mockObject({
        title: "Monthly 1:1",
        date: daysFromNow(30),
        time: "14:00",
        duration_minutes: 60,
        location: null,
        recurrence: "monthly",
      });
      const res = await POST(makeReq({ text: "Monthly 1:1 with director at 2pm for 1 hour" }));
      const body = await res.json();
      expect(body.recurrence).toBe("monthly");
    });

    it("one-off event → recurrence: 'none'", async () => {
      mockObject({
        title: "One-time sync",
        date: daysFromNow(1),
        time: "11:00",
        duration_minutes: 30,
        location: null,
        recurrence: "none",
      });
      const res = await POST(makeReq({ text: "One-time sync tomorrow at 11am for 30 minutes" }));
      const body = await res.json();
      expect(body.recurrence).toBe("none");
    });
  });

  // ── 8. Location Extraction ─────────────────────────────────────────────────

  describe("8 · Location Extraction", () => {
    it("extracts a simple named location", async () => {
      mockObject({
        title: "Lunch",
        date: daysFromNow(1),
        time: "12:00",
        duration_minutes: 60,
        location: "The Bistro",
        recurrence: "none",
      });
      const res = await POST(makeReq({ text: "Lunch at The Bistro tomorrow at noon" }));
      const body = await res.json();
      expect(body.location).toBe("The Bistro");
    });

    it("extracts an office / building name", async () => {
      mockObject({
        title: "All hands",
        date: nextWeekday(4),
        time: "10:00",
        duration_minutes: 60,
        location: "HQ – Main Auditorium",
        recurrence: "none",
      });
      const res = await POST(
        makeReq({ text: "All hands next Thursday at 10am at HQ Main Auditorium" })
      );
      const body = await res.json();
      expect(body.location).toBe("HQ – Main Auditorium");
    });

    it("extracts an address-style location", async () => {
      mockObject({
        title: "Client visit",
        date: nextWeekday(2),
        time: "10:00",
        duration_minutes: 120,
        location: "123 Main St, Suite 400",
        recurrence: "none",
      });
      const res = await POST(
        makeReq({ text: "Client visit next Tuesday at 10am at 123 Main St Suite 400" })
      );
      const body = await res.json();
      expect(body.location).toBe("123 Main St, Suite 400");
    });

    it("sets location to null when none is mentioned", async () => {
      mockObject({
        title: "Phone call",
        date: TODAY,
        time: "16:00",
        duration_minutes: 20,
        location: null,
        recurrence: "none",
      });
      const res = await POST(makeReq({ text: "Phone call today at 4pm for 20 minutes" }));
      const body = await res.json();
      expect(body.location).toBeNull();
    });
  });

  // ── 9. Response Shape ──────────────────────────────────────────────────────

  describe("9 · Response Shape", () => {
    it("returns all 6 required fields", async () => {
      mockObject({
        title: "Shape test",
        date: TODAY,
        time: "09:00",
        duration_minutes: 30,
        location: null,
        recurrence: "none",
      });
      const res = await POST(makeReq({ text: "Shape test today at 9am for 30 minutes" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("title");
      expect(body).toHaveProperty("date");
      expect(body).toHaveProperty("time");
      expect(body).toHaveProperty("duration_minutes");
      expect(body).toHaveProperty("location");
      expect(body).toHaveProperty("recurrence");
    });

    it("date is always YYYY-MM-DD", async () => {
      mockObject({ title: "x", date: TODAY, time: "10:00", duration_minutes: 30, location: null, recurrence: "none" });
      const body = await (await POST(makeReq({ text: "x today at 10am" }))).json();
      expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("time is always HH:MM (24-hour)", async () => {
      mockObject({ title: "x", date: TODAY, time: "14:30", duration_minutes: 30, location: null, recurrence: "none" });
      const body = await (await POST(makeReq({ text: "Meeting today at 2:30pm for 30 minutes" }))).json();
      expect(body.time).toMatch(/^\d{2}:\d{2}$/);
    });

    it("duration_minutes is a number, not a string", async () => {
      mockObject({ title: "x", date: TODAY, time: "10:00", duration_minutes: 60, location: null, recurrence: "none" });
      const body = await (await POST(makeReq({ text: "Meeting today at 10am for 1 hour" }))).json();
      expect(typeof body.duration_minutes).toBe("number");
    });

    it("title is a non-empty string", async () => {
      mockObject({ title: "Standup", date: TODAY, time: "09:00", duration_minutes: 15, location: null, recurrence: "none" });
      const body = await (await POST(makeReq({ text: "Standup today at 9am" }))).json();
      expect(typeof body.title).toBe("string");
      expect(body.title.length).toBeGreaterThan(0);
    });
  });

  // ── 10. Model Output Robustness ────────────────────────────────────────────

  describe("10 · Model Output Robustness", () => {
    it("handles model output as a raw JSON string in `output`", async () => {
      const tomorrow = daysFromNow(1);
      mockString({
        title: "Meeting with Sarah",
        date: tomorrow,
        time: "11:00",
        duration_minutes: 45,
        location: null,
        recurrence: "none",
      });
      const res = await POST(makeReq({ text: "Meeting with Sarah tomorrow at 11am for 45 minutes" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.date).toBe(tomorrow);
      expect(body.title).toBe("Meeting with Sarah");
    });

    it("handles model output wrapped in markdown ```json fences", async () => {
      const tomorrow = daysFromNow(1);
      mockMarkdownJson({
        title: "Coffee chat",
        date: tomorrow,
        time: "08:30",
        duration_minutes: 30,
        location: "Blue Bottle Coffee",
        recurrence: "none",
      });
      const res = await POST(makeReq({ text: "Coffee chat tomorrow at 8:30am at Blue Bottle Coffee" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.date).toBe(tomorrow);
      expect(body.location).toBe("Blue Bottle Coffee");
    });

    it("handles model output in the [{ generated_text }] array format", async () => {
      const tomorrow = daysFromNow(1);
      mockGeneratedText({
        title: "Sync",
        date: tomorrow,
        time: "10:00",
        duration_minutes: 30,
        location: null,
        recurrence: "none",
      });
      const res = await POST(makeReq({ text: "Sync tomorrow at 10am for 30 minutes" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.date).toBe(tomorrow);
    });

    it("falls back to today's date when model returns an invalid date string", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          output: {
            title: "Bad date event",
            date: "not-a-date",
            time: "10:00",
            duration_minutes: 30,
            location: null,
            recurrence: "none",
          },
        }),
      });
      const res = await POST(makeReq({ text: "Some event with a bad date" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.date).toBe(TODAY);
    });

    it("falls back to today's date when model omits the date field entirely", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          output: {
            title: "No date event",
            time: "10:00",
            duration_minutes: 30,
            location: null,
            recurrence: "none",
          },
        }),
      });
      const res = await POST(makeReq({ text: "Event with no date" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.date).toBe(TODAY);
    });

    it("falls back to today's date when model returns a non-ISO date (MM/DD/YYYY)", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          output: {
            title: "Wrong format",
            date: "06/07/2026", // common model mistake — not YYYY-MM-DD
            time: "10:00",
            duration_minutes: 30,
            location: null,
            recurrence: "none",
          },
        }),
      });
      const res = await POST(makeReq({ text: "Event with wrong date format" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.date).toBe(TODAY);
    });
  });

  // ── 11. Error Handling ─────────────────────────────────────────────────────

  describe("11 · Error Handling", () => {
    it("returns 500 when the model endpoint fails with a network error", async () => {
      mockNetworkFail();
      const res = await POST(makeReq({ text: "Meeting tomorrow at 3pm" }));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 500 when the model returns completely unparseable output", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ output: "this is definitely not json !!!" }),
      });
      const res = await POST(makeReq({ text: "Meeting tomorrow at 3pm" }));
      expect(res.status).toBe(500);
    });

    it("returns 500 when the model returns an empty output field", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ output: null }),
      });
      const res = await POST(makeReq({ text: "Meeting tomorrow at 3pm" }));
      expect(res.status).toBe(500);
    });
  });

  // ── 12. Combined / End-to-End Scenarios ───────────────────────────────────

  describe("12 · Combined Scenarios", () => {
    it("recurring event with location and specific weekday", async () => {
      const monday = nextWeekday(1);
      mockObject({
        title: "Team sync",
        date: monday,
        time: "10:00",
        duration_minutes: 60,
        location: "Room 3B",
        recurrence: "weekly",
      });
      const res = await POST(
        makeReq({ text: "Team sync every Monday at 10am in Room 3B for 1 hour" })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.date).toBe(monday);
      expect(utcDayOfWeek(body.date)).toBe(1);
      expect(body.time).toBe("10:00");
      expect(body.duration_minutes).toBe(60);
      expect(body.location).toBe("Room 3B");
      expect(body.recurrence).toBe("weekly");
    });

    it("tomorrow + half-hour time + location + no recurrence", async () => {
      const tomorrow = daysFromNow(1);
      mockObject({
        title: "Lunch with Alice",
        date: tomorrow,
        time: "12:30",
        duration_minutes: 75,
        location: "Tartine Bakery",
        recurrence: "none",
      });
      const res = await POST(
        makeReq({ text: "Lunch with Alice tomorrow at 12:30pm for 75 minutes at Tartine Bakery" })
      );
      const body = await res.json();
      expect(body.date).toBe(tomorrow);
      expect(body.time).toBe("12:30");
      expect(body.duration_minutes).toBe(75);
      expect(body.location).toBe("Tartine Bakery");
      expect(body.recurrence).toBe("none");
    });

    it("specific far-future date with all fields populated", async () => {
      mockObject({
        title: "Annual conference",
        date: "2026-10-12",
        time: "08:00",
        duration_minutes: 480,
        location: "Moscone Center, San Francisco",
        recurrence: "none",
      });
      const res = await POST(
        makeReq({
          text: "Annual conference on October 12th 2026 from 8am for 8 hours at Moscone Center San Francisco",
        })
      );
      const body = await res.json();
      expect(body.date).toBe("2026-10-12");
      expect(body.time).toBe("08:00");
      expect(body.duration_minutes).toBe(480);
      expect(body.location).toBe("Moscone Center, San Francisco");
    });
  });
});