// Single source of truth for the booking experience. The frontend fetches the
// public slice of this via GET /api/book/config, so edit halls / spots / times
// here and both sides stay in sync. No secrets live in this file.

export interface Window {
  /** "HH:MM" 24h, in OWNER_TZ */
  start: string
  /** "HH:MM" 24h, in OWNER_TZ */
  end: string
}

export interface EventType {
  id: "meal" | "walk" | "virtual"
  label: string
  blurb: string
  durationMin: number
  /** padding kept clear on both sides of an existing busy block */
  bufferMin: number
  /** earliest a booking may be, measured from now */
  minNoticeHours: number
  /** allowed weekdays, 0 = Sunday … 6 = Saturday, in OWNER_TZ */
  days: number[]
  windows: Window[]
  /** spacing between candidate slot starts; defaults to durationMin */
  slotStepMin?: number
  /** prompt shown above the location picker; omit for a fixed location */
  locationPrompt?: string
  /** selectable locations; empty means a fixed location (e.g. Google Meet) */
  locations: string[]
  /** true → attach a Google Meet link instead of a physical place */
  video?: boolean
}

export interface OwnerConfig {
  ownerName: string
  /** IANA tz the windows/days are expressed in */
  timeZone: string
  /** which Google calendar to read/write */
  calendarId: string
  /**
   * Address to notify on every booking, added as a second attendee so Google
   * emails it the invite. MUST be a different account from the calendar owner
   * (Google won't email the organizer about their own event, and a gmail *alias*
   * may get deduplicated). Your @yale.edu is the safe choice. Empty = disabled.
   */
  notifyEmail: string
  /** how many days ahead bookings are allowed */
  bookingWindowDays: number
  types: EventType[]
}

// Yale residential-college dining halls + the Commons at Schwarzman. Trim or
// reorder freely.
const DINING_HALLS = [
  "Commons (Schwarzman Center)",
  "Benjamin Franklin",
  "Berkeley",
  "Branford",
  "Davenport",
  "Ezra Stiles",
  "Grace Hopper",
  "Jonathan Edwards",
  "Morse",
  "Pauli Murray",
  "Pierson",
  "Saybrook",
  "Silliman",
  "Timothy Dwight",
  "Trumbull",
]

// "Meet at …" spots around campus.
const CAMPUS_SPOTS = [
  "Cross Campus",
  "Old Campus (Phelps Gate)",
  "Beinecke Plaza",
  "Bass Library steps",
  "Sterling Memorial Library nave",
  "Schwarzman Center",
  "Science Hill (Kline Tower)",
]

export const CONFIG: OwnerConfig = {
  ownerName: "Coby",
  timeZone: "America/New_York",
  calendarId: "primary",
  // Set to an address on a DIFFERENT account than the calendar owner (e.g. your
  // @yale.edu) to get an invite email on every booking. Leave "" to disable.
  notifyEmail: "",
  bookingWindowDays: 21,
  types: [
    {
      id: "meal",
      label: "Grab a meal",
      blurb: "Lunch or dinner at a Yale dining hall.",
      durationMin: 60,
      bufferMin: 15,
      minNoticeHours: 12,
      days: [1, 2, 3, 4, 5],
      windows: [
        { start: "12:00", end: "13:30" },
        { start: "18:00", end: "19:30" },
      ],
      slotStepMin: 30,
      locationPrompt: "Which dining hall?",
      locations: DINING_HALLS,
    },
    {
      id: "walk",
      label: "Go for a walk",
      blurb: "A loop around campus, weather permitting.",
      durationMin: 30,
      bufferMin: 10,
      minNoticeHours: 6,
      days: [0, 1, 2, 3, 4, 5, 6],
      windows: [{ start: "14:00", end: "18:00" }],
      slotStepMin: 30,
      locationPrompt: "Where should we meet?",
      locations: CAMPUS_SPOTS,
    },
    {
      id: "virtual",
      label: "Meet virtually",
      blurb: "A video call over Google Meet.",
      durationMin: 30,
      bufferMin: 5,
      minNoticeHours: 2,
      days: [0, 1, 2, 3, 4, 5, 6],
      windows: [{ start: "09:00", end: "21:00" }],
      slotStepMin: 30,
      locations: [],
      video: true,
    },
  ],
}

export function getType(id: string): EventType | undefined {
  return CONFIG.types.find((t) => t.id === id)
}

// The slice safe to expose to browsers (everything here is non-sensitive).
export function publicConfig() {
  return {
    ownerName: CONFIG.ownerName,
    timeZone: CONFIG.timeZone,
    bookingWindowDays: CONFIG.bookingWindowDays,
    types: CONFIG.types.map((t) => ({
      id: t.id,
      label: t.label,
      blurb: t.blurb,
      durationMin: t.durationMin,
      minNoticeHours: t.minNoticeHours,
      days: t.days,
      locationPrompt: t.locationPrompt,
      locations: t.locations,
      video: !!t.video,
    })),
  }
}
