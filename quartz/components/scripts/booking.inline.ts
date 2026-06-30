// Booking flow for /chat. Talks to the booking Worker at /api/book/*.
// SPA-safe: everything hangs off the "nav" event and tears down via addCleanup.

interface PublicType {
  id: string
  label: string
  blurb: string
  durationMin: number
  minNoticeHours: number
  days: number[]
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

// Candidate dates: from owner-tz "today", bookingWindowDays forward, filtered to
// the type's allowed weekdays. Actual open times come from the server per date.
function candidateDates(cfg: PublicConfig, type: PublicType): string[] {
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: cfg.timeZone }).format(new Date())
  const [y, m, d] = todayStr.split("-").map(Number)
  const out: string[] = []
  for (let i = 0; i < cfg.bookingWindowDays; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d + i, 12))
    if (type.days.includes(dt.getUTCDay())) {
      out.push(new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(dt))
    }
  }
  return out
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

  type Step = "type" | "location" | "date" | "details" | "done"
  const state: {
    cfg: PublicConfig | null
    step: Step
    type: PublicType | null
    location: string
    date: string
    slots: ApiSlot[]
    slot: ApiSlot | null
    error: string
    result: any
  } = {
    cfg: null,
    step: "type",
    type: null,
    location: "",
    date: "",
    slots: [],
    slot: null,
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
    state.slots = []
    state.slot = null
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
        h("span", { class: "chat-card-meta mono" }, `${t.durationMin} min`),
      )
      card.addEventListener("click", () => {
        state.type = t
        state.location = ""
        state.step = t.locations.length > 0 ? "location" : "date"
        render()
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
        state.step = "date"
        render()
      })
      grid.append(chip)
    }
    wrap.append(grid)
    return wrap
  }

  async function fetchSlots() {
    state.slots = []
    state.error = ""
    render()
    try {
      const res = await fetch(api(`/availability?type=${state.type!.id}&date=${state.date}`))
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "")
      state.slots = data.slots as ApiSlot[]
    } catch (e) {
      state.error = "Couldn't load times for that day."
    }
    render()
  }

  function renderDate() {
    const t = state.type!
    const wrap = h("div", { class: "chat-step" })
    wrap.append(
      backBtn(t.locations.length > 0 ? "location" : "type"),
      eyebrow("PICK A DAY"),
    )
    if (state.location) wrap.append(h("div", { class: "chat-sub" }, state.location))

    const dates = candidateDates(state.cfg!, t)
    const row = h("div", { class: "chat-dates" })
    for (const ds of dates) {
      const b = h(
        "button",
        { class: "chat-date" + (ds === state.date ? " is-active" : ""), type: "button" },
        fmtDateChip(ds),
      )
      b.addEventListener("click", () => {
        state.date = ds
        state.slot = null
        fetchSlots()
      })
      row.append(b)
    }
    wrap.append(row)

    if (state.date) {
      const slotWrap = h("div", { class: "chat-slots" })
      if (state.error) {
        slotWrap.append(h("p", { class: "chat-error" }, state.error))
      } else if (state.slots.length === 0) {
        slotWrap.append(h("p", { class: "chat-muted mono" }, "No open times that day."))
      } else {
        for (const s of state.slots) {
          const b = h("button", { class: "chat-slot mono", type: "button" }, s.label)
          b.addEventListener("click", () => {
            state.slot = s
            state.step = "details"
            render()
          })
          slotWrap.append(b)
        }
      }
      wrap.append(slotWrap)
    }
    return wrap
  }

  function renderDetails() {
    const t = state.type!
    const wrap = h("div", { class: "chat-step" })
    wrap.append(backBtn("date"), eyebrow("YOUR DETAILS"))

    const summary = [
      t.label,
      state.location || (t.video ? "Google Meet" : ""),
      `${fmtDateChip(state.date)}, ${state.slot!.label}`,
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
            startISO: state.slot!.startISO,
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
      case "date":
        node = renderDate()
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
