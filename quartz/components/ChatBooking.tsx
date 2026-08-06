import { QuartzComponent, QuartzComponentConstructor } from "./types"
// @ts-ignore
import bookingScript from "./scripts/booking.inline"
import bookingStyle from "./styles/booking.scss"

// The booking widget for /chat. The container is rendered server-side; the
// flow itself is driven by booking.inline.ts, which talks to the booking Worker
// at /api/book/*. The Turnstile site key is public by design (the secret lives
// in the Worker).
const TURNSTILE_SITE_KEY = "0x4AAAAAADtkFplIhwu7id4v" // production site key

// Fallback for the off-campus switch, used only when the Worker predates the
// `inPersonEnabled` config flag. The live switch is in booking-worker's
// config.ts, which takes effect on worker deploy without a site rebuild.
const IN_PERSON_ENABLED = false

const ChatBooking: QuartzComponent = () => {
  return (
    <div
      class="chat-booking"
      data-turnstile-key={TURNSTILE_SITE_KEY}
      data-in-person={IN_PERSON_ENABLED ? "true" : "false"}
    >
      <div class="chat-loading mono">Loading…</div>
    </div>
  )
}

ChatBooking.afterDOMLoaded = bookingScript
ChatBooking.css = bookingStyle

export default (() => ChatBooking) satisfies QuartzComponentConstructor
