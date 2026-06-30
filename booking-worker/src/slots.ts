// Timezone-aware slot generation with no external dependencies. Availability
// windows are authored as wall-clock times in the owner's timezone; here we turn
// them into concrete UTC instants and subtract busy intervals.

import type { EventType } from "./config"

export interface Busy {
  start: number // epoch ms
  end: number // epoch ms
}

export interface Slot {
  startISO: string
  endISO: string
  /** epoch ms, for internal comparison */
  start: number
  end: number
}

/**
 * Offset between the given timezone and UTC at a specific instant, in ms.
 * Positive when the zone is ahead of UTC. Uses Intl so DST is handled.
 */
function tzOffsetMs(at: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  const parts = dtf.formatToParts(at)
  const map: Record<string, number> = {}
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = parseInt(p.value, 10)
  }
  // "24" can appear for midnight in some environments; normalise to 0.
  const hour = map.hour === 24 ? 0 : map.hour
  const asUTC = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second)
  return asUTC - at.getTime()
}

/**
 * Interpret year/month/day + "HH:MM" as a wall-clock time in `timeZone` and
 * return the corresponding UTC Date. Standard two-step technique: treat the
 * wall clock as UTC, then correct by the zone's offset at that instant.
 */
export function zonedWallClockToUtc(
  y: number,
  m: number,
  d: number,
  hhmm: string,
  timeZone: string,
): Date {
  const [hh, mm] = hhmm.split(":").map((s) => parseInt(s, 10))
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  const offset = tzOffsetMs(new Date(guess), timeZone)
  return new Date(guess - offset)
}

/** Weekday (0=Sun…6=Sat) of a YYYY-MM-DD date, evaluated in `timeZone`. */
export function weekdayInTz(dateStr: string, timeZone: string): number {
  const [y, m, d] = dateStr.split("-").map((s) => parseInt(s, 10))
  // Noon avoids any DST edge near midnight.
  const noon = zonedWallClockToUtc(y, m, d, "12:00", timeZone)
  const wd = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(noon)
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd)
}

/**
 * Generate open slots for one calendar date. `busy` is the merged set of busy
 * intervals (epoch ms) from the calendar; `now` is the reference instant for the
 * minimum-notice cutoff.
 */
export function generateSlots(
  dateStr: string,
  type: EventType,
  busy: Busy[],
  timeZone: string,
  now: number = Date.now(),
): Slot[] {
  const weekday = weekdayInTz(dateStr, timeZone)
  if (!type.days.includes(weekday)) return []

  const [y, m, d] = dateStr.split("-").map((s) => parseInt(s, 10))
  const step = (type.slotStepMin ?? type.durationMin) * 60_000
  const durMs = type.durationMin * 60_000
  const bufMs = type.bufferMin * 60_000
  const noticeCutoff = now + type.minNoticeHours * 3_600_000

  // Pad busy intervals by the buffer so back-to-back bookings keep a gap.
  const padded = busy.map((b) => ({ start: b.start - bufMs, end: b.end + bufMs }))

  const slots: Slot[] = []
  for (const w of type.windows) {
    const winStart = zonedWallClockToUtc(y, m, d, w.start, timeZone).getTime()
    const winEnd = zonedWallClockToUtc(y, m, d, w.end, timeZone).getTime()
    for (let t = winStart; t + durMs <= winEnd; t += step) {
      const start = t
      const end = t + durMs
      if (start < noticeCutoff) continue
      const conflicts = padded.some((b) => start < b.end && end > b.start)
      if (conflicts) continue
      slots.push({
        start,
        end,
        startISO: new Date(start).toISOString(),
        endISO: new Date(end).toISOString(),
      })
    }
  }
  return slots
}
