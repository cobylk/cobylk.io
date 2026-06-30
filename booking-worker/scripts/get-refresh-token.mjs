#!/usr/bin/env node
// One-time helper: completes the Google OAuth "offline" consent flow on
// localhost and prints a refresh token to paste into a Worker secret.
//
// Prerequisites (see README):
//   1. A Google Cloud OAuth client (type: Web application).
//   2. Add  http://localhost:5858/callback  as an Authorized redirect URI.
//   3. Put GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .dev.vars (or env).
//
// Run:  npm run get-refresh-token

import http from "node:http"
import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const PORT = 5858
const REDIRECT_URI = `http://localhost:${PORT}/callback`
const SCOPE = "https://www.googleapis.com/auth/calendar"

const here = dirname(fileURLToPath(import.meta.url))

function readDevVars() {
  const p = join(here, "..", ".dev.vars")
  const out = {}
  if (!existsSync(p)) return out
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/)
    if (m) out[m[1]] = m[2]
  }
  return out
}

const vars = readDevVars()
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || vars.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || vars.GOOGLE_CLIENT_SECRET

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.\n" +
      "Set them in .dev.vars (copy from .dev.vars.example) or export them, then re-run.",
  )
  process.exit(1)
}

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent", // force a refresh_token even on re-consent
  }).toString()

async function exchange(code) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  })
  if (!res.ok) throw new Error(`token exchange failed (${res.status}): ${await res.text()}`)
  return res.json()
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  if (url.pathname !== "/callback") {
    res.writeHead(404).end()
    return
  }
  const code = url.searchParams.get("code")
  const err = url.searchParams.get("error")
  if (err || !code) {
    res.writeHead(400, { "content-type": "text/plain" }).end(`OAuth error: ${err || "no code"}`)
    server.close()
    process.exit(1)
  }
  try {
    const tokens = await exchange(code)
    res
      .writeHead(200, { "content-type": "text/html" })
      .end("<h2>Done. You can close this tab and return to the terminal.</h2>")
    if (!tokens.refresh_token) {
      console.error(
        "\nNo refresh_token returned. Revoke prior access at " +
          "https://myaccount.google.com/permissions and run again (prompt=consent is set).",
      )
      process.exit(1)
    }
    console.log("\n=== GOOGLE_REFRESH_TOKEN ===\n")
    console.log(tokens.refresh_token)
    console.log("\nSet it with:  npx wrangler secret put GOOGLE_REFRESH_TOKEN")
    console.log("(and add it to .dev.vars for local `wrangler dev`).\n")
  } catch (e) {
    console.error(e)
    process.exit(1)
  } finally {
    server.close()
    setTimeout(() => process.exit(0), 200)
  }
})

server.listen(PORT, () => {
  console.log("Open this URL in your browser, sign in, and approve:\n")
  console.log(authUrl + "\n")
  console.log(`Waiting for the redirect to ${REDIRECT_URI} …`)
})
