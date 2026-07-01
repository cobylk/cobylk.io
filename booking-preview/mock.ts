// Mocks the booking Worker + Turnstile so the UI can be iterated on locally with
// no worker running and no calendar side effects. Loaded before booking.inline.

interface Win {
  start: string
  end: string
}
interface MockType {
  id: string
  label: string
  blurb: string
  durationMin: number
  minNoticeHours: number
  days: number[]
  windows: Win[]
  locationPrompt?: string
  locations: string[]
  video: boolean
}

const config: { ownerName: string; timeZone: string; bookingWindowDays: number; types: MockType[] } = {
  ownerName: "Coby",
  timeZone: "America/New_York",
  bookingWindowDays: 21,
  types: [
    {
      id: "meal",
      label: "Grab a meal",
      blurb: "Lunch or dinner at a Yale dining hall.",
      durationMin: 60,
      minNoticeHours: 12,
      days: [1, 2, 3, 4, 5],
      windows: [
        { start: "12:00", end: "13:30" },
        { start: "18:00", end: "19:30" },
      ],
      locationPrompt: "Which dining hall?",
      locations: [
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
      ],
      video: false,
    },
    {
      id: "walk",
      label: "Go for a walk",
      blurb: "A loop around campus, weather permitting.",
      durationMin: 30,
      minNoticeHours: 6,
      days: [0, 1, 2, 3, 4, 5, 6],
      windows: [{ start: "14:00", end: "18:00" }],
      locationPrompt: "Where should we meet?",
      locations: [
        "Cross Campus",
        "Old Campus (Phelps Gate)",
        "Beinecke Plaza",
        "Bass Library steps",
        "Sterling Memorial Library nave",
        "Schwarzman Center",
        "Science Hill (Kline Tower)",
      ],
      video: false,
    },
    {
      id: "virtual",
      label: "Meet virtually",
      blurb: "A video call over Google Meet.",
      durationMin: 30,
      minNoticeHours: 2,
      days: [0, 1, 2, 3, 4, 5, 6],
      windows: [{ start: "09:00", end: "21:00" }],
      locations: [],
      video: true,
    },
  ],
}

function res(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  })
}

function label12(h: number, m: number): string {
  const ap = h < 12 ? "AM" : "PM"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`
}
// EDT offset is fine for the summer preview; the grid converts back via Intl.
function iso(date: string, h: number, m: number): string {
  return `${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00-04:00`
}

function availability(url: URL) {
  const typeId = url.searchParams.get("type") || ""
  const date = url.searchParams.get("date") || ""
  const type = config.types.find((t) => t.id === typeId)
  if (!type || !date) return { type: typeId, date, slots: [] }
  const [y, m, d] = date.split("-").map(Number)
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  if (!type.days.includes(weekday)) return { type: typeId, date, slots: [] }

  // Free cells (matches the worker's cell-based availability).
  const CELL = 15
  const slots: { startISO: string; endISO: string; label: string }[] = []
  for (const w of type.windows) {
    const [sh, sm] = w.start.split(":").map(Number)
    const [eh, em] = w.end.split(":").map(Number)
    let t = sh * 60 + sm
    const end = eh * 60 + em
    while (t + CELL <= end) {
      // Deterministic pseudo-gaps so some cells look "taken".
      if ((d * 131 + t * 7) % 10 > 2) {
        const et = t + CELL
        slots.push({
          startISO: iso(date, Math.floor(t / 60), t % 60),
          endISO: iso(date, Math.floor(et / 60), et % 60),
          label: label12(Math.floor(t / 60), t % 60),
        })
      }
      t += CELL
    }
  }
  return { type: typeId, date, slots }
}

const realFetch = window.fetch.bind(window)
window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
  const url = new URL(raw, location.href)
  const p = url.pathname
  if (p.endsWith("/api/book/config")) return res(config)
  if (p.endsWith("/api/book/availability")) return res(availability(url))
  if (p.endsWith("/api/book") || p.endsWith("/api/book/")) {
    const body = init?.body ? JSON.parse(init.body as string) : {}
    const fmt = (isoStr: string) =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: config.timeZone,
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(isoStr))
    const label = body.endISO ? `${fmt(body.startISO)} – ${fmt(body.endISO)}` : fmt(body.startISO)
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: config.timeZone }).format(
      new Date(body.startISO),
    )
    return res({
      ok: true,
      date,
      label,
      place: body.location || "Google Meet",
      meetLink: "https://meet.google.com/xxx-mock-xxx",
    })
  }
  return realFetch(input, init)
}) as typeof fetch

// Stub Turnstile so ensureTurnstile resolves instantly with a fake token.
;(window as any).turnstile = {
  render: () => "mock-widget",
  getResponse: () => "mock-token",
  reset: () => {},
  remove: () => {},
}
