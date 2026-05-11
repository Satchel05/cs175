"use client";

import { ChevronDown, ChevronLeft, ChevronRight, Plus, SearchLg } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";

import { may2026Days, weekdays } from "./calendar-data";
import { EventPill, BandPill } from "./event-pill";

export function Calendar() {
  return (
    <div className="overflow-hidden rounded-2xl border border-secondary bg-primary shadow-sm">

      {/* ---------- Header ---------- */}
      <div className="flex items-center gap-4 border-b border-secondary px-5 py-4">
        {/* Date card on the left */}
        <div className="flex flex-col items-center rounded-lg border border-secondary px-3.5 py-1.5 leading-none">
          <span className="mb-1 text-[10px] font-semibold tracking-wider text-tertiary">MAY</span>
          <span className="text-[22px] font-semibold text-brand-secondary">10</span>
        </div>

        {/* Title + range */}
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[17px] font-semibold tracking-tight text-primary">May 2026</h1>
            <Badge color="gray" type="pill-color" size="sm">Week 2</Badge>
          </div>
          <div className="text-[12.5px] text-tertiary">May 1, 2026 – May 31, 2026</div>
        </div>

        {/* Right-side actions */}
        <div className="flex items-center gap-2">
          {/* Icon-only button: omit children, pass aria-label */}
          <Button
            size="sm"
            color="secondary"
            iconLeading={SearchLg}
            aria-label="Search events"
          />

          {/* prev / today / next: kept as a hand-rolled trio.
              UUI's ButtonGroup is for uniform horizontal sets — this asymmetric
              icon-text-icon shape isn't what it's designed for. */}
          <div className="inline-flex h-8 items-center overflow-hidden rounded-lg border border-secondary bg-primary">
            <button
              aria-label="Previous month"
              className="flex h-full w-8 items-center justify-center text-tertiary hover:bg-secondary hover:text-primary"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button className="h-full border-x border-secondary px-3.5 text-[13px] font-medium text-primary hover:bg-secondary">
              Today
            </button>
            <button
              aria-label="Next month"
              className="flex h-full w-8 items-center justify-center text-tertiary hover:bg-secondary hover:text-primary"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>

          <Button size="sm" color="secondary" iconTrailing={ChevronDown}>
            Month view
          </Button>

          <Button size="sm" color="primary" iconLeading={Plus}>
            Add event
          </Button>
        </div>
      </div>

      {/* ---------- Weekday header row ---------- */}
      <div className="grid grid-cols-7 border-b border-secondary">
        {weekdays.map((d) => (
          <div key={d} className="px-3 py-2.5 text-xs text-tertiary">{d}</div>
        ))}
      </div>

      {/* ---------- Month grid ---------- */}
      <div className="grid grid-cols-7 auto-rows-[minmax(118px,auto)]">
        {may2026Days.map((day, i) => {
          const lastCol = (i + 1) % 7 === 0;
          const lastRow = i >= may2026Days.length - 7;
          return (
            <div
              key={i}
              className={`relative flex min-h-[118px] flex-col gap-[3px] bg-primary p-2 border-secondary ${
                lastCol ? "" : "border-r"
              } ${lastRow ? "" : "border-b"}`}
            >
              {/* Date number — today gets the filled brand circle */}
              {day.today ? (
                <span className="inline-flex size-[22px] items-center justify-center rounded-full bg-brand-solid text-[12.5px] font-medium text-white">
                  {day.date}
                </span>
              ) : (
                <span
                  className={`px-0.5 text-[12.5px] ${day.outside ? "text-quaternary" : "text-primary"}`}
                >
                  {day.date}
                </span>
              )}

              {/* Multi-day band starts here */}
              {day.band && <BandPill {...day.band} />}

              {/* Spacer reserves vertical room so events below don't collide
                  with a band rendered above (either in this cell or in the cell
                  this band continues from). */}
              {(day.band || day.bandSpacer) && <div className="h-[22px]" />}

              {/* Single-day events */}
              {day.events?.map((ev, j) => <EventPill key={j} event={ev} />)}

              {/* "N more…" overflow */}
              {day.overflow && (
                <div className="cursor-pointer px-1.5 text-xs text-tertiary hover:text-primary">
                  {day.overflow} more…
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
