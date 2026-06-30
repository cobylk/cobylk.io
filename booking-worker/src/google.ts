// Thin Google Calendar REST client: refresh-token → access-token exchange (cached
// in KV so we are not minting one per request), freeBusy lookups, and event
// creation. No googleapis SDK — just fetch, which keeps the Worker tiny.

import type { Busy } from "./slots"
import type { Env } from "./index"

const TOKEN_URL = "https://oauth2.googleapis.com/token"
const CAL_BASE = "https://www.googleapis.com/calendar/v3"
const TOKEN_CACHE_KEY = "google_access_token"

interface CachedToken {
  token: string
  expiresAt: number // epoch ms
}

/**
 * Return a valid access token, reusing a KV-cached one until ~1 minute before it
 * expires. KV (not a module global) is the correct cross-request store per the
 * Workers best practices.
 */
export async function getAccessToken(env: Env): Promise<string> {
  const cached = await env.BOOKING_KV.get<CachedToken>(TOKEN_CACHE_KEY, "json")
  if (cached && cached.expiresAt - 60_000 > Date.now()) {
    return cached.token
  }

  const body = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: env.GOOGLE_REFRESH_TOKEN,
    grant_type: "refresh_token",
  })

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`token exchange failed (${res.status}): ${detail}`)
  }
  const json = (await res.json()) as { access_token: string; expires_in: number }
  const expiresAt = Date.now() + json.expires_in * 1000

  await env.BOOKING_KV.put(
    TOKEN_CACHE_KEY,
    JSON.stringify({ token: json.access_token, expiresAt } satisfies CachedToken),
    { expirationTtl: Math.max(60, json.expires_in - 120) },
  )
  return json.access_token
}

/** Busy intervals on `calendarId` between two instants. */
export async function freeBusy(
  token: string,
  calendarId: string,
  timeMinISO: string,
  timeMaxISO: string,
): Promise<Busy[]> {
  const res = await fetch(`${CAL_BASE}/freeBusy`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      timeMin: timeMinISO,
      timeMax: timeMaxISO,
      items: [{ id: calendarId }],
    }),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`freeBusy failed (${res.status}): ${detail}`)
  }
  const json = (await res.json()) as {
    calendars: Record<string, { busy: { start: string; end: string }[] }>
  }
  const cal = json.calendars[calendarId]
  const busy = cal?.busy ?? []
  return busy.map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }))
}

export interface EventInput {
  summary: string
  description: string
  location?: string
  startISO: string
  endISO: string
  timeZone: string
  attendeeEmail: string
  attendeeName: string
  /** add a Google Meet link */
  video?: boolean
}

export interface CreatedEvent {
  htmlLink: string
  hangoutLink?: string
}

/** Create the event; Google emails the invite because of sendUpdates=all. */
export async function createEvent(
  token: string,
  calendarId: string,
  input: EventInput,
): Promise<CreatedEvent> {
  const body: Record<string, unknown> = {
    summary: input.summary,
    description: input.description,
    start: { dateTime: input.startISO, timeZone: input.timeZone },
    end: { dateTime: input.endISO, timeZone: input.timeZone },
    attendees: [{ email: input.attendeeEmail, displayName: input.attendeeName }],
  }
  if (input.location) body.location = input.location
  if (input.video) {
    body.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    }
  }

  const url = new URL(`${CAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events`)
  url.searchParams.set("sendUpdates", "all")
  url.searchParams.set("conferenceDataVersion", "1")

  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`event insert failed (${res.status}): ${detail}`)
  }
  const json = (await res.json()) as { htmlLink: string; hangoutLink?: string }
  return { htmlLink: json.htmlLink, hangoutLink: json.hangoutLink }
}
