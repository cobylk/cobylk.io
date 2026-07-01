// Preview entry: install mocks, pull in the real widget styles + logic, then
// fire the "nav" event the booking script listens for (Quartz dispatches this
// on every SPA navigation; here we do it once).
import "./mock"
import "../quartz/components/styles/booking.scss"
import "../quartz/components/scripts/booking.inline"

function boot() {
  document.dispatchEvent(new Event("nav"))
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot)
else boot()
