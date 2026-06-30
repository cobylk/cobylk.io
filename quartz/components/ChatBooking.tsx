import { QuartzComponent, QuartzComponentConstructor } from "./types"
// @ts-ignore
import bookingScript from "./scripts/booking.inline"
import bookingStyle from "./styles/booking.scss"

// The booking widget for /chat. The container is rendered server-side; the
// flow itself is driven by booking.inline.ts, which talks to the booking Worker
// at /api/book/*. The Turnstile site key is public; replace the placeholder.
const TURNSTILE_SITE_KEY = "0x4AAAAAADtkFplIhwu7id4v" // Cloudflare "always passes" test key

const ChatBooking: QuartzComponent = () => {
  return (
    <div class="chat-booking" data-turnstile-key={TURNSTILE_SITE_KEY}>
      <div class="chat-loading mono">Loading…</div>
    </div>
  )
}

ChatBooking.afterDOMLoaded = bookingScript
ChatBooking.css = bookingStyle

export default (() => ChatBooking) satisfies QuartzComponentConstructor
