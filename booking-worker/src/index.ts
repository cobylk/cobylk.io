// Booking Worker — backs the /chat page on coby.lk / cobylk.io.
//
// Routes (all under /api/book, bound to both zones in wrangler.jsonc):
//   GET  /api/book/config                       public per-type config
//   GET  /api/book/availability?type=&date=     open slots for one day
//   POST /api/book                              create the booking
//
// NOTE: prefer `wrangler types` to generate Env; this hand-written interface is
// here so the project type-checks before the binding is generated. Keep it in
// sync with wrangler.jsonc.
export interface Env {
  BOOKING_KV: KVNamespace
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GOOGLE_REFRESH_TOKEN: string
  TURNSTILE_SECRET: string
}

import { CONFIG, getType, publicConfig } from "./config"
import type { EventType } from "./config"
import { generateSlots, zonedWallClockToUtc } from "./slots"
import { freeBusy, getAccessToken, createEvent } from "./google"
import { verifyTurnstile } from "./turnstile"

const ALLOWED_ORIGINS = ["https://coby.lk", "https://cobylk.io", "https://www.coby.lk"]
const RATE_LIMIT_PER_HOUR = 5

// Bookings are built from draggable cells (a contiguous run of free cells),
// capped so nobody blocks out half a day.
const CELL_MIN = 15
const MAX_BOOKING_MIN = 240
const cellMs = CELL_MIN * 60_000

// Availability is expressed as free 30-min cells regardless of a type's default
// meeting length, so the calendar can offer drag-to-size windows.
function cellType(type: EventType): EventType {
  return { ...type, durationMin: CELL_MIN, slotStepMin: CELL_MIN }
}

function corsHeaders(origin: string | null): Record<string, string> {
  const ok =
    origin &&
    (ALLOWED_ORIGINS.includes(origin) || /^https?:\/\/localhost(:\d+)?$/.test(origin))
  return {
    "access-control-allow-origin": ok ? origin! : ALLOWED_ORIGINS[0],
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "origin",
  }
}

function json(data: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders(origin) },
  })
}

/** YYYY-MM-DD for an instant, evaluated in the owner timezone. */
function dateInTz(instant: number, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(instant))
}

/** Human label like "12:30 PM" for a slot start, in the owner timezone. */
function timeLabel(instant: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(instant))
}

async function handleAvailability(req: Request, env: Env, origin: string | null): Promise<Response> {
  const url = new URL(req.url)
  const typeId = url.searchParams.get("type") ?? ""
  const date = url.searchParams.get("date") ?? ""
  const type = getType(typeId)
  if (!type) return json({ error: "unknown type" }, 400, origin)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "bad date" }, 400, origin)

  const [y, m, d] = date.split("-").map((s) => parseInt(s, 10))
  const dayStart = zonedWallClockToUtc(y, m, d, "00:00", CONFIG.timeZone).toISOString()
  const dayEnd = new Date(
    zonedWallClockToUtc(y, m, d, "00:00", CONFIG.timeZone).getTime() + 24 * 3_600_000,
  ).toISOString()

  const token = await getAccessToken(env)
  const busy = await freeBusy(token, CONFIG.busyCalendarIds, dayStart, dayEnd)
  const cells = generateSlots(date, cellType(type), busy, CONFIG.timeZone)

  return json(
    {
      type: type.id,
      date,
      slots: cells.map((s) => ({
        startISO: s.startISO,
        endISO: s.endISO,
        label: timeLabel(s.start, CONFIG.timeZone),
      })),
    },
    200,
    origin,
  )
}

interface BookingBody {
  type?: string
  location?: string
  startISO?: string
  endISO?: string
  name?: string
  email?: string
  note?: string
  turnstileToken?: string
}

async function handleBook(req: Request, env: Env, origin: string | null): Promise<Response> {
  const ip = req.headers.get("cf-connecting-ip")

  // Coarse per-IP rate limit.
  if (ip) {
    const bucket = Math.floor(Date.now() / 3_600_000)
    const key = `rl:${ip}:${bucket}`
    const count = parseInt((await env.BOOKING_KV.get(key)) ?? "0", 10)
    if (count >= RATE_LIMIT_PER_HOUR) {
      return json({ error: "Too many bookings in the last hour. Try again later." }, 429, origin)
    }
    await env.BOOKING_KV.put(key, String(count + 1), { expirationTtl: 3600 })
  }

  let body: BookingBody
  try {
    body = (await req.json()) as BookingBody
  } catch {
    return json({ error: "invalid JSON" }, 400, origin)
  }

  const type = getType(body.type ?? "")
  if (!type) return json({ error: "unknown type" }, 400, origin)

  const name = (body.name ?? "").trim()
  const email = (body.email ?? "").trim()
  const note = (body.note ?? "").trim().slice(0, 1000)
  const startISO = body.startISO ?? ""
  const location = (body.location ?? "").trim()

  if (!name) return json({ error: "Name is required." }, 400, origin)
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "A valid email is required." }, 400, origin)
  const startMs = Date.parse(startISO)
  if (Number.isNaN(startMs)) return json({ error: "Bad start time." }, 400, origin)

  // Duration comes from the dragged window; fall back to the type default so
  // older clients still work. Must be a positive multiple of a cell and capped.
  const endMs = body.endISO ? Date.parse(body.endISO) : startMs + type.durationMin * 60_000
  if (Number.isNaN(endMs)) return json({ error: "Bad end time." }, 400, origin)
  const durMs = endMs - startMs
  if (durMs <= 0 || durMs % cellMs !== 0) return json({ error: "Bad duration." }, 400, origin)
  if (durMs > MAX_BOOKING_MIN * 60_000) {
    return json({ error: `Bookings can be at most ${MAX_BOOKING_MIN / 60} hours.` }, 400, origin)
  }

  // Location must be one of the offered options (unless this is a fixed/video type).
  if (type.locations.length > 0 && !type.locations.includes(location)) {
    return json({ error: "Pick a location from the list." }, 400, origin)
  }

  if (!(await verifyTurnstile(env, body.turnstileToken ?? "", ip))) {
    return json({ error: "Captcha failed. Please try again." }, 403, origin)
  }

  // Re-derive the day and confirm the requested slot is still open (validates
  // input AND closes the last-moment double-book race).
  const date = dateInTz(startMs, CONFIG.timeZone)
  const [y, m, d] = date.split("-").map((s) => parseInt(s, 10))
  const dayStart = zonedWallClockToUtc(y, m, d, "00:00", CONFIG.timeZone).toISOString()
  const dayEnd = new Date(
    zonedWallClockToUtc(y, m, d, "00:00", CONFIG.timeZone).getTime() + 24 * 3_600_000,
  ).toISOString()

  const token = await getAccessToken(env)
  const busy = await freeBusy(token, CONFIG.busyCalendarIds, dayStart, dayEnd)

  // The whole window must be a contiguous run of currently-free 30-min cells.
  // This validates the request AND closes the last-moment double-book race.
  const freeCells = new Set(generateSlots(date, cellType(type), busy, CONFIG.timeZone).map((s) => s.start))
  let allFree = true
  for (let t = startMs; t < endMs; t += cellMs) {
    if (!freeCells.has(t)) {
      allFree = false
      break
    }
  }
  if (!allFree) {
    return json({ error: "That time is no longer available. Please pick another." }, 409, origin)
  }

  const startOut = new Date(startMs).toISOString()
  const endOut = new Date(endMs).toISOString()
  const place = type.video ? "Google Meet" : location
  const descLines = [
    `Booked via coby.lk/chat by ${name} (${email}).`,
    type.video ? "Video: Google Meet (link below)." : place ? `Where: ${place}.` : "",
    note ? `\nNote: ${note}` : "",
  ].filter(Boolean)

  const created = await createEvent(token, CONFIG.calendarId, {
    summary: `${name} ↔ ${CONFIG.ownerName}: ${type.label}${place && !type.video ? ` (${place})` : ""}`,
    description: descLines.join("\n"),
    location: type.video ? undefined : place || undefined,
    startISO: startOut,
    endISO: endOut,
    timeZone: CONFIG.timeZone,
    attendeeEmail: email,
    attendeeName: name,
    notifyEmail: CONFIG.notifyEmail,
    video: type.video,
  })

  return json(
    {
      ok: true,
      startISO: startOut,
      label: `${timeLabel(startMs, CONFIG.timeZone)} – ${timeLabel(endMs, CONFIG.timeZone)}`,
      date,
      place,
      meetLink: created.hangoutLink ?? null,
    },
    200,
    origin,
  )
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get("origin")
    const url = new URL(req.url)

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    try {
      if (req.method === "GET" && url.pathname === "/api/book/config") {
        return json(publicConfig(), 200, origin)
      }
      if (req.method === "GET" && url.pathname === "/api/book/availability") {
        return await handleAvailability(req, env, origin)
      }
      if (req.method === "POST" && (url.pathname === "/api/book" || url.pathname === "/api/book/")) {
        return await handleBook(req, env, origin)
      }
      return json({ error: "not found" }, 404, origin)
    } catch (err) {
      console.error("booking worker error", {
        message: err instanceof Error ? err.message : String(err),
        path: url.pathname,
      })
      return json({ error: "Something went wrong. Please try again." }, 500, origin)
    }
  },
} satisfies ExportedHandler<Env>
