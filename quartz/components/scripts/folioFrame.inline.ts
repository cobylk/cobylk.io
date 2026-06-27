// Content scrolls inside the fixed #quartz-root container, so the SPA router's
// window-scroll reset doesn't apply. Reset the container to the top on each
// navigation (unless jumping to an in-page anchor).
document.addEventListener("nav", () => {
  if (window.location.hash) return
  const root = document.getElementById("quartz-root")
  if (root) root.scrollTop = 0
})

// --- roaming creature on the frame perimeter --------------------------------
// Modes: hidden -> emerging -> explore <-> flee. It starts hidden and emerges
// after 10-20s. In explore it makes cautious, paused hops around the rectangle.
// If the cursor comes near it bolts away fast, then resumes exploring. Three
// approaches within 10s send it back into hiding for a random 10-20s.
document.addEventListener("nav", () => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
  const el = document.querySelector<HTMLElement>(".folio-creature")
  if (!el) return

  const R = 7
  const OUT = 12 // how far outside the outline the circle rides
  const A = (Math.PI / 2) * OUT // length of each rounded corner (quarter arc)
  const NEAR = 90
  const FAR = 150
  const rand = (a: number, b: number) => a + Math.random() * (b - a)
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
  // Strong ease for the wander hops: slow start, glide, slow stop.
  const easeInOutQuint = (t: number) =>
    t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2

  const getRect = (): DOMRect | null => {
    const f = document.querySelector(".folio-frame")
    return f ? f.getBoundingClientRect() : null
  }
  let rect = getRect()
  const perimLen = () => (rect ? 2 * (rect.width + rect.height) + 4 * A : 0)

  // Map arc-length s to a point on the rectangle outline offset OUTWARD by OUT,
  // with quarter-circle arcs at the corners (so it never jumps). Returns the
  // point plus the inward unit normal (used only for the emerge slide).
  const perim = (s: number) => {
    const r = rect as DOMRect
    const w = r.width
    const h = r.height
    const L = r.left
    const T = r.top
    const P = 2 * (w + h) + 4 * A
    s = ((s % P) + P) % P
    // cumulative segment ends: top, TR arc, right, BR arc, bottom, BL arc, left, TL arc
    const c1 = w
    const c2 = c1 + A
    const c3 = c2 + h
    const c4 = c3 + A
    const c5 = c4 + w
    const c6 = c5 + A
    const c7 = c6 + h
    let x: number
    let y: number
    let ix: number
    let iy: number
    const arc = (cx: number, cy: number, a0: number, frac: number) => {
      const th = a0 + frac * (Math.PI / 2)
      x = cx + OUT * Math.cos(th)
      y = cy + OUT * Math.sin(th)
      ix = -Math.cos(th)
      iy = -Math.sin(th)
    }
    if (s < c1) {
      x = L + s
      y = T - OUT
      ix = 0
      iy = 1
    } else if (s < c2) {
      arc(L + w, T, -Math.PI / 2, (s - c1) / A)
    } else if (s < c3) {
      x = L + w + OUT
      y = T + (s - c2)
      ix = -1
      iy = 0
    } else if (s < c4) {
      arc(L + w, T + h, 0, (s - c3) / A)
    } else if (s < c5) {
      x = L + w - (s - c4)
      y = T + h + OUT
      ix = 0
      iy = -1
    } else if (s < c6) {
      arc(L, T + h, Math.PI / 2, (s - c5) / A)
    } else if (s < c7) {
      x = L - OUT
      y = T + h - (s - c6)
      ix = 1
      iy = 0
    } else {
      arc(L, T, Math.PI, (s - c7) / A)
    }
    return { x: x!, y: y!, ix: ix!, iy: iy! }
  }

  type Tween = { from: number; to: number; start: number; dur: number; ease: (t: number) => number }

  let mode: "hidden" | "emerging" | "explore" | "flee" = "hidden"
  let s = 0
  let tween: Tween | null = null
  let pauseUntil = 0
  let hiddenUntil = performance.now() + rand(10000, 20000)
  let emergeStart = 0
  let vis = 0
  let targetVis = 0
  let armed = true
  let approaches: number[] = []
  let mx = -9999
  let my = -9999
  let reappearOpposite = false // after a scare, re-emerge on the far side
  let hideS = 0

  const startEmerge = (now: number) => {
    mode = "emerging"
    emergeStart = now
    targetVis = 1
    s = reappearOpposite ? hideS + perimLen() / 2 : Math.random() * perimLen()
    reappearOpposite = false
    tween = null
  }
  const startHop = (now: number) => {
    const back = Math.random() < 0.1
    const dist = back ? rand(20, 45) : rand(110, 240)
    const dir = back ? -1 : 1
    tween = { from: s, to: s + dir * dist, start: now, dur: Math.max(900, dist * 9), ease: easeInOutQuint }
  }
  const startFlee = (now: number) => {
    mode = "flee"
    const a = perim(s + 14)
    const b = perim(s - 14)
    const dir = Math.hypot(a.x - mx, a.y - my) >= Math.hypot(b.x - mx, b.y - my) ? 1 : -1
    tween = { from: s, to: s + dir * rand(320, 540), start: now, dur: rand(380, 500), ease: easeOut }
  }
  const goHidden = (now: number) => {
    mode = "hidden"
    targetVis = 0
    tween = null
    approaches = []
    hideS = s
    reappearOpposite = true
    hiddenUntil = now + rand(1000, 5000) // reappear on the far side shortly
  }
  const applyTween = (now: number) => {
    if (!tween) return false
    const p = clamp((now - tween.start) / tween.dur, 0, 1)
    s = tween.from + (tween.to - tween.from) * tween.ease(p)
    if (p >= 1) {
      tween = null
      return true
    }
    return false
  }

  let raf = 0
  const tick = (now: number) => {
    if (!rect) rect = getRect()
    if (rect) {
      const base = perim(s)
      const dist = Math.hypot(base.x - mx, base.y - my)

      // proximity: trigger a flee (or hide) once per approach
      if ((mode === "explore" || mode === "emerging") && dist < NEAR && armed) {
        armed = false
        approaches.push(now)
        approaches = approaches.filter((t) => now - t <= 10000)
        if (approaches.length >= 3) goHidden(now)
        else startFlee(now)
      }
      if (dist > FAR) armed = true

      let inset = 0
      if (mode === "hidden") {
        targetVis = 0
        if (now >= hiddenUntil) startEmerge(now)
      } else if (mode === "emerging") {
        const p = clamp((now - emergeStart) / 750, 0, 1)
        inset = (OUT + 6) * (1 - easeOut(p)) // slide outward from behind the edge
        if (p >= 1) {
          mode = "explore"
          pauseUntil = now + rand(800, 1600)
        }
      } else if (mode === "explore") {
        if (tween) {
          if (applyTween(now)) pauseUntil = now + rand(1100, 2600)
        } else if (now >= pauseUntil) {
          startHop(now)
        }
      } else if (mode === "flee") {
        if (applyTween(now)) {
          mode = "explore"
          pauseUntil = now + rand(500, 900)
        }
      }

      vis += (targetVis - vis) * 0.1
      const pos = perim(s)
      el.style.transform = `translate3d(${pos.x + pos.ix * inset - R}px, ${pos.y + pos.iy * inset - R}px, 0)`
      el.style.opacity = vis.toFixed(3)
    }
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  const onMove = (e: PointerEvent) => {
    mx = e.clientX
    my = e.clientY
  }
  const onResize = () => {
    rect = getRect()
  }
  window.addEventListener("pointermove", onMove)
  window.addEventListener("resize", onResize)
  window.addCleanup?.(() => {
    cancelAnimationFrame(raf)
    window.removeEventListener("pointermove", onMove)
    window.removeEventListener("resize", onResize)
  })
})
