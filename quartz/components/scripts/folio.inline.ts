// Drag-to-scroll for the Folio NEWS timeline.
document.addEventListener("nav", () => {
  const scrollers = document.querySelectorAll<HTMLElement>(".folio-news-scroll")
  scrollers.forEach((el) => {
    let down = false
    let startX = 0
    let startLeft = 0

    const onDown = (e: PointerEvent) => {
      down = true
      startX = e.clientX
      startLeft = el.scrollLeft
      el.classList.add("dragging")
    }
    const onMove = (e: PointerEvent) => {
      if (!down) return
      el.scrollLeft = startLeft - (e.clientX - startX)
    }
    const onUp = () => {
      down = false
      el.classList.remove("dragging")
    }

    el.addEventListener("pointerdown", onDown)
    el.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addCleanup?.(() => {
      el.removeEventListener("pointerdown", onDown)
      el.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    })
  })
})
