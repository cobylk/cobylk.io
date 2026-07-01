// Fast local preview for the booking UI. Bundles booking.inline.ts + booking.scss
// with a mocked API, serves booking-preview/index.html with live reload.
// Run from the repo root:  npm run preview:booking
import * as esbuild from "esbuild"
import { sassPlugin } from "esbuild-sass-plugin"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))

const ctx = await esbuild.context({
  entryPoints: [join(dir, "entry.ts")],
  bundle: true,
  outdir: join(dir, "dist"),
  entryNames: "bundle",
  format: "iife",
  sourcemap: true,
  logLevel: "info",
  plugins: [sassPlugin()],
})

await ctx.watch()
const { port } = await ctx.serve({ servedir: dir, port: 8000 })
console.log(`\n  Booking UI preview → http://localhost:${port}\n  (edit booking.inline.ts / booking.scss and the page live-reloads)\n`)
