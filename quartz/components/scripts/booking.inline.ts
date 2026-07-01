// Booking flow for /chat. Talks to the booking Worker at /api/book/*.
// SPA-safe: everything hangs off the "nav" event and tears down via addCleanup.

interface TimeWindow {
  start: string // "HH:MM" in owner tz
  end: string
}
interface PublicType {
  id: string
  label: string
  blurb: string
  durationMin: number
  minNoticeHours: number
  days: number[]
  windows: TimeWindow[]
  locationPrompt?: string
  locations: string[]
  video: boolean
}
interface PublicConfig {
  ownerName: string
  timeZone: string
  bookingWindowDays: number
  types: PublicType[]
}
interface ApiSlot {
  startISO: string
  endISO: string
  label: string
}

const API_BASE =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:8787"
    : ""

// Minimal hyperscript helper. Children may be nodes or strings.
function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v
    else el.setAttribute(k, v)
  }
  for (const c of children) el.append(c)
  return el
}

function fmtDateChip(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(dt)
}

// --- calendar-grid date helpers ---------------------------------------------
// Vertical pixels per minute of the day; sets how tall the week grid is.
const PX_PER_MIN = 0.5
// Booking granularity in minutes (must match the worker's CELL_MIN).
const CELL_MIN = 15

/** YYYY-MM-DD n days after dateStr (plain calendar arithmetic). */
function addDaysStr(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n, 12))
  return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(dt)
}
/** Weekday (0=Sun…6=Sat) of a YYYY-MM-DD date. */
function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}
/** Today's YYYY-MM-DD in the owner timezone. */
function ownerToday(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date())
}
/** Minutes past midnight that an ISO instant falls on, in the owner timezone. */
function tzMinutes(iso: string, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso))
  let hh = 0
  let mm = 0
  for (const p of parts) {
    if (p.type === "hour") hh = +p.value
    if (p.type === "minute") mm = +p.value
  }
  return (hh === 24 ? 0 : hh) * 60 + mm
}
function hhmmToMin(s: string): number {
  const [h, m] = s.split(":").map(Number)
  return h * 60 + m
}
function dayHeader(dateStr: string): { wd: string; day: string } {
  const [y, m, d] = dateStr.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" }).format(dt)
  return { wd, day: String(d) }
}
function hourLabel(min: number): string {
  const h = Math.floor(min / 60)
  const ampm = h < 12 ? "AM" : "PM"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12} ${ampm}`
}
function minLabel(min: number): string {
  const h = Math.floor(min / 60)
  const mm = min % 60
  const ampm = h < 12 ? "AM" : "PM"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`
}
/** "12:00 – 1:00 PM" for a [startMin, endMin) window. */
function rangeLabel(startMin: number, endMin: number): string {
  return `${minLabel(startMin)} – ${minLabel(endMin)}`
}
function fmtRange(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)))
}

// Load the Turnstile script once and resolve when the API is ready.
let turnstileLoading: Promise<any> | null = null
function ensureTurnstile(): Promise<any> {
  const w = window as any
  if (w.turnstile) return Promise.resolve(w.turnstile)
  if (!turnstileLoading) {
    turnstileLoading = new Promise((resolve) => {
      const existing = document.querySelector<HTMLScriptElement>("script[data-turnstile]")
      if (!existing) {
        const s = h("script", {
          src: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
          async: "true",
          defer: "true",
          "data-turnstile": "true",
        })
        document.head.append(s)
      }
      const t0 = Date.now()
      const poll = setInterval(() => {
        if (w.turnstile) {
          clearInterval(poll)
          resolve(w.turnstile)
        } else if (Date.now() - t0 > 8000) {
          clearInterval(poll)
          resolve(null) // degrade: submit without a token, server decides
        }
      }, 80)
    })
  }
  return turnstileLoading
}

document.addEventListener("nav", () => {
  const rootEl = document.querySelector<HTMLElement>(".chat-booking")
  if (!rootEl) return
  const root: HTMLElement = rootEl

  const turnstileKey = root.dataset.turnstileKey || ""
  let turnstileWidgetId: string | null = null
  const w = window as any

  type Step = "type" | "location" | "calendar" | "details" | "done"
  const state: {
    cfg: PublicConfig | null
    step: Step
    type: PublicType | null
    location: string
    date: string
    // dragged booking window
    sel: {
      date: string
      startMin: number
      endMin: number
      startISO: string
      endISO: string
      label: string
    } | null
    // calendar grid
    weekStart: string
    visibleDays: number
    daySlots: Record<string, ApiSlot[] | "error">
    error: string
    result: any
  } = {
    cfg: null,
    step: "type",
    type: null,
    location: "",
    date: "",
    sel: null,
    weekStart: "",
    visibleDays: 4,
    daySlots: {},
    error: "",
    result: null,
  }

  const api = (path: string) => `${API_BASE}/api/book${path}`

  async function loadConfig() {
    try {
      const res = await fetch(api("/config"))
      if (!res.ok) throw new Error()
      state.cfg = (await res.json()) as PublicConfig
      render()
    } catch {
      root.replaceChildren(
        h("p", { class: "chat-error" }, "Couldn't load the scheduler. Please try again later."),
      )
    }
  }

  function reset() {
    state.step = "type"
    state.type = null
    state.location = ""
    state.date = ""
    state.sel = null
    state.weekStart = ""
    state.daySlots = {}
    state.error = ""
    state.result = null
    render()
  }

  function eyebrow(text: string) {
    return h("div", { class: "chat-eyebrow mono" }, text)
  }

  function backBtn(to: Step) {
    const b = h("button", { class: "chat-back mono", type: "button" }, "← back")
    b.addEventListener("click", () => {
      state.step = to
      state.error = ""
      render()
    })
    return b
  }

  function renderType() {
    const wrap = h("div", { class: "chat-step" })
    wrap.append(eyebrow("WHAT SORT OF MEETING?"))
    const grid = h("div", { class: "chat-cards" })
    for (const t of state.cfg!.types) {
      const card = h(
        "button",
        { class: "chat-card", type: "button" },
        h("span", { class: "chat-card-title" }, t.label),
        h("span", { class: "chat-card-blurb" }, t.blurb),
      )
      card.addEventListener("click", () => {
        state.type = t
        state.location = ""
        if (t.locations.length > 0) {
          state.step = "location"
          render()
        } else {
          enterCalendar()
        }
      })
      grid.append(card)
    }
    wrap.append(grid)
    return wrap
  }

  function renderLocation() {
    const t = state.type!
    const wrap = h("div", { class: "chat-step" })
    wrap.append(backBtn("type"), eyebrow((t.locationPrompt || "Where?").toUpperCase()))
    const grid = h("div", { class: "chat-chips" })
    for (const loc of t.locations) {
      const chip = h("button", { class: "chat-chip", type: "button" }, loc)
      chip.addEventListener("click", () => {
        state.location = loc
        enterCalendar()
      })
      grid.append(chip)
    }
    wrap.append(grid)
    return wrap
  }

  const tz = () => state.cfg!.timeZone
  function clampWeekStart(ds: string): string {
    const today = ownerToday(tz())
    return ds < today ? today : ds
  }
  function visibleDates(): string[] {
    const out: string[] = []
    for (let i = 0; i < state.visibleDays; i++) out.push(addDaysStr(state.weekStart, i))
    return out
  }

  function enterCalendar() {
    state.step = "calendar"
    state.sel = null
    state.weekStart = clampWeekStart(ownerToday(tz()))
    state.daySlots = {}
    fetchWeek()
  }

  async function fetchWeek() {
    render() // show the grid shell immediately, columns fill in as fetches land
    const today = ownerToday(tz())
    const dates = visibleDates()
    await Promise.all(
      dates.map(async (ds) => {
        if (state.daySlots[ds] !== undefined) return
        if (ds < today || !state.type!.days.includes(weekdayOf(ds))) {
          state.daySlots[ds] = []
          return
        }
        try {
          const res = await fetch(api(`/availability?type=${state.type!.id}&date=${ds}`))
          const data = await res.json()
          state.daySlots[ds] = res.ok ? (data.slots as ApiSlot[]) : "error"
        } catch {
          state.daySlots[ds] = "error"
        }
      }),
    )
    render()
  }

  function renderCalendar() {
    const t = state.type!
    const wrap = h("div", { class: "chat-step chat-cal-step" })
    wrap.append(backBtn(t.locations.length > 0 ? "location" : "type"), eyebrow("PICK A TIME"))
    if (state.location) wrap.append(h("div", { class: "chat-sub" }, state.location))

    // Axis bounds from the type's availability windows, rounded to whole hours.
    // Fall back to a full-day axis if an older Worker serves no windows yet.
    const winSrc = t.windows && t.windows.length ? t.windows : [{ start: "09:00", end: "21:00" }]
    const wins = winSrc.map((wn) => ({ s: hhmmToMin(wn.start), e: hhmmToMin(wn.end) }))
    const axisStart = Math.floor(Math.min(...wins.map((w) => w.s)) / 60) * 60
    const axisEnd = Math.ceil(Math.max(...wins.map((w) => w.e)) / 60) * 60
    const totalH = (axisEnd - axisStart) * PX_PER_MIN

    const width = root.getBoundingClientRect().width || 640
    state.visibleDays = width < 560 ? 3 : 4
    const dates = visibleDates()
    const today = ownerToday(tz())
    const lastAllowed = addDaysStr(today, state.cfg!.bookingWindowDays - 1)

    // Week navigation.
    const nav = h("div", { class: "chat-cal-nav" })
    const prev = h("button", { class: "chat-cal-navbtn mono", type: "button" }, "‹")
    const next = h("button", { class: "chat-cal-navbtn mono", type: "button" }, "›")
    if (state.weekStart <= today) prev.setAttribute("disabled", "true")
    if (dates[dates.length - 1] >= lastAllowed) next.setAttribute("disabled", "true")
    prev.addEventListener("click", () => {
      state.weekStart = clampWeekStart(addDaysStr(state.weekStart, -state.visibleDays))
      fetchWeek()
    })
    next.addEventListener("click", () => {
      state.weekStart = addDaysStr(state.weekStart, state.visibleDays)
      fetchWeek()
    })
    nav.append(
      prev,
      h("div", { class: "chat-cal-range mono" }, `${fmtRange(dates[0])} – ${fmtRange(dates[dates.length - 1])}`),
      next,
    )
    wrap.append(nav)

    // Column headers.
    const head = h("div", { class: "chat-cal-head" })
    head.append(h("div", { class: "chat-cal-corner" }))
    for (const ds of dates) {
      const { wd, day } = dayHeader(ds)
      head.append(
        h(
          "div",
          { class: "chat-cal-dayhead" + (ds === today ? " is-today" : "") },
          h("span", { class: "chat-cal-wd mono" }, wd),
          h("span", { class: "chat-cal-daynum" }, day),
        ),
      )
    }
    wrap.append(head)

    // Scrollable time grid.
    const scroll = h("div", { class: "chat-cal-scroll" })
    const body = h("div", { class: "chat-cal-body" })
    body.style.height = `${totalH}px`

    const times = h("div", { class: "chat-cal-times" })
    for (let mnt = axisStart; mnt <= axisEnd; mnt += 60) {
      const lab = h("div", { class: "chat-cal-time mono" }, hourLabel(mnt))
      lab.style.top = `${(mnt - axisStart) * PX_PER_MIN}px`
      times.append(lab)
    }
    body.append(times)

    const cellPx = CELL_MIN * PX_PER_MIN
    const nCells = (axisEnd - axisStart) / CELL_MIN

    // Footer (hint / Continue) and overlay refresh are updated in place so a
    // drag never triggers a full re-render (which would reset scroll + flash).
    const drawSelFns: Array<() => void> = []
    const foot = h("div", { class: "chat-cal-foot" })
    const syncFooter = () => {
      foot.replaceChildren()
      if (state.sel) {
        const cont = h(
          "button",
          { class: "chat-cal-continue", type: "button" },
          `Continue — ${state.sel.label}`,
        )
        cont.addEventListener("click", () => {
          state.step = "details"
          render()
        })
        foot.append(cont)
      } else {
        foot.append(h("div", { class: "chat-cal-hint mono" }, "Drag across open time to pick a window"))
      }
    }
    const onSelChange = () => {
      drawSelFns.forEach((f) => f())
      syncFooter()
    }

    for (const ds of dates) {
      const off = ds < today || !t.days.includes(weekdayOf(ds))
      const col = h("div", { class: "chat-cal-col" + (off ? " is-off" : "") })
      col.style.setProperty("--hour-px", `${60 * PX_PER_MIN}px`)
      body.append(col)
      if (off) continue

      const slots = state.daySlots[ds]

      // Open cells (free time) come straight from the worker; everything else in
      // the day is blocked off. Users drag across open cells.
      const openMins = new Set<number>()
      const cellMap = new Map<number, ApiSlot>()
      if (Array.isArray(slots)) {
        for (const s of slots) {
          const mn = tzMinutes(s.startISO, tz())
          openMins.add(mn)
          cellMap.set(mn, s)
        }
      }
      for (let i = 0; i < nCells; i++) {
        const mn = axisStart + i * CELL_MIN
        const cell = h("div", {
          class: "chat-cal-cell " + (openMins.has(mn) ? "open" : "blocked"),
        })
        cell.style.height = `${cellPx}px`
        col.append(cell)
      }
      if (slots === undefined || slots === "error") {
        col.append(h("div", { class: "chat-cal-colmsg mono" }, slots === "error" ? "!" : "…"))
      }

      // Selection overlay, redrawn each render and live-updated while dragging.
      const overlay = h("div", { class: "chat-cal-sel mono" })
      const drawSel = () => {
        if (state.sel && state.sel.date === ds) {
          overlay.style.display = "flex"
          overlay.style.top = `${(state.sel.startMin - axisStart) * PX_PER_MIN}px`
          overlay.style.height = `${(state.sel.endMin - state.sel.startMin) * PX_PER_MIN}px`
          overlay.textContent = state.sel.label
        } else {
          overlay.style.display = "none"
        }
      }
      col.append(overlay)
      drawSel()
      drawSelFns.push(drawSel)

      if (openMins.size) setupDrag(col, ds, axisStart, cellPx, nCells, openMins, cellMap, onSelChange)
    }
    scroll.append(body)
    wrap.append(scroll)

    syncFooter()
    wrap.append(foot)
    return wrap
  }

  // Press-drag on a day column to select a contiguous run of open cells.
  function setupDrag(
    col: HTMLElement,
    ds: string,
    axisStart: number,
    cellPx: number,
    nCells: number,
    openMins: Set<number>,
    cellMap: Map<number, ApiSlot>,
    onChange: () => void,
  ) {
    let selecting = false
    let anchor = 0
    const minAt = (clientY: number): number => {
      const r = col.getBoundingClientRect()
      let idx = Math.floor((clientY - r.top) / cellPx)
      idx = Math.max(0, Math.min(nCells - 1, idx))
      return axisStart + idx * CELL_MIN
    }
    const apply = (target: number) => {
      let lo = anchor
      let hi = anchor
      if (target >= anchor) {
        for (let m = anchor + CELL_MIN; m <= target; m += CELL_MIN) {
          if (openMins.has(m)) hi = m
          else break // never let a selection cross blocked time
        }
      } else {
        for (let m = anchor - CELL_MIN; m >= target; m -= CELL_MIN) {
          if (openMins.has(m)) lo = m
          else break
        }
      }
      state.sel = {
        date: ds,
        startMin: lo,
        endMin: hi + CELL_MIN,
        startISO: cellMap.get(lo)!.startISO,
        endISO: cellMap.get(hi)!.endISO,
        label: rangeLabel(lo, hi + CELL_MIN),
      }
      onChange()
    }
    col.addEventListener("pointerdown", (e) => {
      const m = minAt(e.clientY)
      if (!openMins.has(m)) return
      e.preventDefault()
      selecting = true
      anchor = m
      try {
        col.setPointerCapture(e.pointerId)
      } catch {
        /* noop */
      }
      apply(m)
    })
    col.addEventListener("pointermove", (e) => {
      if (selecting) apply(minAt(e.clientY))
    })
    const end = (e: PointerEvent) => {
      if (!selecting) return
      selecting = false
      try {
        col.releasePointerCapture(e.pointerId)
      } catch {
        /* noop */
      }
      // No re-render: the overlay + footer were already updated live during the
      // drag, so releasing shouldn't reset scroll or replay the fade.
    }
    col.addEventListener("pointerup", end)
    col.addEventListener("pointercancel", end)
  }

  function renderDetails() {
    const t = state.type!
    const wrap = h("div", { class: "chat-step" })
    wrap.append(backBtn("calendar"), eyebrow("YOUR DETAILS"))

    const summary = [
      t.label,
      state.location || (t.video ? "Google Meet" : ""),
      `${fmtDateChip(state.sel!.date)}, ${state.sel!.label}`,
    ]
      .filter(Boolean)
      .join(" · ")
    wrap.append(h("div", { class: "chat-summary mono" }, summary))

    const form = h("form", { class: "chat-form" })
    const nameI = h("input", { class: "chat-input", type: "text", placeholder: "Your name", required: "true" })
    const emailI = h("input", { class: "chat-input", type: "email", placeholder: "you@email.com", required: "true" })
    const noteI = h("textarea", { class: "chat-input", placeholder: "Anything I should know? (optional)", rows: "3" })
    const tsDiv = h("div", { class: "chat-turnstile", id: "chat-turnstile" })
    const submit = h("button", { class: "chat-submit", type: "submit" }, "Request this time")
    const errP = h("p", { class: "chat-error" })
    errP.style.display = "none"

    form.append(nameI, emailI, noteI, tsDiv, errP, submit)
    wrap.append(form)

    // Render Turnstile into the placeholder.
    ensureTurnstile().then((ts) => {
      if (!ts || !document.body.contains(tsDiv)) return
      try {
        turnstileWidgetId = ts.render(tsDiv, { sitekey: turnstileKey })
      } catch {
        /* already rendered or unavailable */
      }
    })

    form.addEventListener("submit", async (e) => {
      e.preventDefault()
      errP.style.display = "none"
      submit.setAttribute("disabled", "true")
      submit.textContent = "Booking…"

      let token = ""
      if (w.turnstile && turnstileWidgetId !== null) {
        token = w.turnstile.getResponse(turnstileWidgetId) || ""
      }

      try {
        const res = await fetch(api(""), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type: t.id,
            location: state.location,
            startISO: state.sel!.startISO,
            endISO: state.sel!.endISO,
            name: nameI.value.trim(),
            email: emailI.value.trim(),
            note: noteI.value.trim(),
            turnstileToken: token,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Something went wrong.")
        state.result = data
        state.step = "done"
        render()
      } catch (err) {
        errP.textContent = err instanceof Error ? err.message : "Something went wrong."
        errP.style.display = "block"
        submit.removeAttribute("disabled")
        submit.textContent = "Request this time"
        if (w.turnstile && turnstileWidgetId !== null) w.turnstile.reset(turnstileWidgetId)
      }
    })
    return wrap
  }

  function renderDone() {
    const r = state.result
    const wrap = h("div", { class: "chat-step chat-done" })
    wrap.append(
      h("div", { class: "chat-eyebrow mono" }, "REQUESTED"),
      h("h2", { class: "chat-done-title" }, "You're on the calendar."),
      h(
        "p",
        { class: "chat-done-body" },
        `I'll see you ${fmtDateChip(r.date)} at ${r.label}${r.place ? ` — ${r.place}` : ""}. ` +
          `A calendar invite is on its way to your inbox.`,
      ),
    )
    if (r.meetLink) {
      wrap.append(h("a", { class: "chat-meet", href: r.meetLink, target: "_blank", rel: "noopener" }, "Google Meet link"))
    }
    const again = h("button", { class: "chat-back mono", type: "button" }, "book another →")
    again.addEventListener("click", reset)
    wrap.append(again)
    return wrap
  }

  function render() {
    if (!state.cfg) return
    let node: HTMLElement
    switch (state.step) {
      case "location":
        node = renderLocation()
        break
      case "calendar":
        node = renderCalendar()
        break
      case "details":
        node = renderDetails()
        break
      case "done":
        node = renderDone()
        break
      default:
        node = renderType()
    }
    root.replaceChildren(node)
  }

  loadConfig()

  window.addCleanup?.(() => {
    if (w.turnstile && turnstileWidgetId !== null) {
      try {
        w.turnstile.remove(turnstileWidgetId)
      } catch {
        /* noop */
      }
    }
  })
})
