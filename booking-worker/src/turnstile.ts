// Cloudflare Turnstile server-side verification. The frontend obtains a token
// from the Turnstile widget; we confirm it before writing to the calendar.

import type { Env } from "./index"

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

export async function verifyTurnstile(
  env: Env,
  token: string,
  remoteIp: string | null,
): Promise<boolean> {
  // Allows turning Turnstile off in local dev where no secret is configured.
  if (!env.TURNSTILE_SECRET) return true
  if (!token) return false

  const body = new FormData()
  body.append("secret", env.TURNSTILE_SECRET)
  body.append("response", token)
  if (remoteIp) body.append("remoteip", remoteIp)

  const res = await fetch(VERIFY_URL, { method: "POST", body })
  if (!res.ok) return false
  const json = (await res.json()) as { success: boolean }
  return json.success === true
}
