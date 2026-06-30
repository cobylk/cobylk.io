// Folio NEWS timeline: drag/wheel scrolling with momentum that eases to a stop
// and snaps so an item's left edge aligns with the container's left edge.
document.addEventListener("nav", () => {
  // Cursor-tracked glow on the music flourish.
  const score = document.querySelector<HTMLElement>(".folio-score")
  if (score) {
    const onScoreMove = (e: PointerEvent) => {
      const r = score.getBoundingClientRect()
      score.style.setProperty("--mx", `${e.clientX - r.left}px`)
      score.style.setProperty("--my", `${e.clientY - r.top}px`)
      score.style.setProperty("--glow-r", "100px") // grows in via CSS transition
    }
    const onScoreLeave = () => {
      score.style.setProperty("--glow-r", "0px") // shrinks out via CSS transition
    }
    score.addEventListener("pointermove", onScoreMove)
    score.addEventListener("pointerleave", onScoreLeave)
    window.addCleanup?.(() => {
      score.removeEventListener("pointermove", onScoreMove)
      score.removeEventListener("pointerleave", onScoreLeave)
    })
  }

  const scrollers = document.querySelectorAll<HTMLElement>(".folio-news-scroll")
  scrollers.forEach((el) => {
    const items = () => Array.from(el.querySelectorAll<HTMLElement>(".folio-news-item"))

    let down = false
    let moved = false
    let startX = 0
    let startLeft = 0
    let lastX = 0
    let lastT = 0
    let velocity = 0 // px per ms
    let raf = 0

    const stopRaf = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }
    const maxScroll = () => el.scrollWidth - el.clientWidth

    // Nearest item's left offset to a given scroll position, clamped.
    const snapTarget = (from: number) => {
      let best = from
      let bestDist = Infinity
      for (const it of items()) {
        const d = Math.abs(it.offsetLeft - from)
        if (d < bestDist) {
          bestDist = d
          best = it.offsetLeft
        }
      }
      return Math.max(0, Math.min(maxScroll(), best))
    }

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
    const animateTo = (target: number, duration = 460) => {
      stopRaf()
      const start = el.scrollLeft
      const dist = target - start
      if (Math.abs(dist) < 1) {
        el.scrollLeft = target
        return
      }
      const t0 = performance.now()
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / duration)
        el.scrollLeft = start + dist * easeOutCubic(p)
        raf = p < 1 ? requestAnimationFrame(step) : 0
      }
      raf = requestAnimationFrame(step)
    }

    // settle: project a little momentum from the release velocity, then snap.
    const settle = () => {
      const projected = el.scrollLeft - velocity * 160
      animateTo(snapTarget(projected))
    }

    const onDown = (e: PointerEvent) => {
      down = true
      moved = false
      startX = e.clientX
      startLeft = el.scrollLeft
      lastX = e.clientX
      lastT = performance.now()
      velocity = 0
      stopRaf()
      el.classList.add("dragging")
      el.setPointerCapture?.(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!down) return
      const dx = e.clientX - startX
      if (Math.abs(dx) > 3) moved = true
      el.scrollLeft = startLeft - dx
      const now = performance.now()
      const dt = now - lastT
      if (dt > 0) velocity = (e.clientX - lastX) / dt
      lastX = e.clientX
      lastT = now
    }
    const onUp = () => {
      if (!down) return
      down = false
      el.classList.remove("dragging")
      if (moved) settle()
    }

    // Horizontal trackpad swipes scroll + snap; leave vertical wheel for the page.
    let wheelTimer = 0
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      e.preventDefault()
      stopRaf()
      el.scrollLeft += e.deltaX
      clearTimeout(wheelTimer)
      wheelTimer = window.setTimeout(() => animateTo(snapTarget(el.scrollLeft)), 90)
    }

    el.addEventListener("pointerdown", onDown)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    el.addEventListener("wheel", onWheel, { passive: false })
    window.addCleanup?.(() => {
      el.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      el.removeEventListener("wheel", onWheel)
      stopRaf()
    })
  })
})
