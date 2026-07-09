// Scrapbook behaviors.
//
// 1. Click-to-play facade for YouTube embeds: cards render as bare thumbnail
//    buttons with no YouTube chrome; the real player iframe is only injected
//    when a card is played, which also keeps ~30 player bundles off the
//    initial page load.
//
// 2. Column splitting: the markdown stays one flat list (rendered via CSS
//    multicol when JS is absent), but for the per-column scroll drift the
//    columns must be real elements, so the flat list is distributed here into
//    .scrapbook-col containers, greedily filling the shortest column. The
//    drift and entrance-reveal animations themselves live in custom.scss as
//    scroll-driven animations.

function bindFacades() {
  const facades = document.querySelectorAll<HTMLButtonElement>("button.yt-facade")
  facades.forEach((btn) => {
    if (btn.dataset.bound === "true") return
    btn.dataset.bound = "true"
    btn.addEventListener("click", () => {
      const id = btn.dataset.videoId
      if (!id) return
      const iframe = document.createElement("iframe")
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`
      iframe.title = btn.getAttribute("aria-label") ?? "YouTube video"
      iframe.allow = "autoplay; encrypted-media; picture-in-picture"
      iframe.allowFullscreen = true
      btn.replaceWith(iframe)
    })
  })
}

function columnCount(width: number): number {
  // Mirror the multicol fallback (columns: 3 260px, 1.6rem gap): as many
  // 260px columns as fit, capped at 3.
  const gap = 25.6
  return Math.max(1, Math.min(3, Math.floor((width + gap) / (260 + gap))))
}

function splitColumns() {
  const board = document.querySelector<HTMLElement>(".scrapbook-board")
  if (!board) return
  const n = columnCount(board.clientWidth)
  if (board.dataset.cols === String(n)) {
    // Same layout, but the scroll geometry may have changed (resize).
    compensateReveals(Array.from(board.children) as HTMLElement[])
    return
  }

  // Collect scraps in original authored order. After a previous split,
  // document order groups them by column, so restore via the stamped index.
  const scraps = Array.from(board.querySelectorAll<HTMLElement>(".scrap"))
  scraps.forEach((s, i) => {
    if (!s.dataset.idx) s.dataset.idx = String(i)
  })
  scraps.sort((a, b) => Number(a.dataset.idx) - Number(b.dataset.idx))

  const cols = Array.from({ length: n }, () => {
    const col = document.createElement("div")
    col.className = "scrapbook-col"
    return col
  })
  board.replaceChildren(...cols)
  board.classList.add("is-split")
  board.dataset.cols = String(n)

  // Greedy shortest-column fill. Image scraps carry width/height attributes,
  // so their heights are known to layout before any pixels load.
  for (const scrap of scraps) {
    let target = cols[0]
    for (const col of cols) {
      if (col.offsetHeight < target.offsetHeight) target = col
    }
    target.appendChild(scrap)
  }

  compensateReveals(cols)
}

// The entrance reveal runs on a view() timeline, which tracks the scrap's
// LAYOUT position — it knows nothing about the column drift transform, so
// drifting columns would reveal late (left) or early (right). The visual
// offset when a scrap enters the viewport is its column's --col-drift times
// the scroll progress at that moment; precompute that per scrap and feed it
// back into the CSS animation-range as --reveal-shift.
function compensateReveals(cols: HTMLElement[]) {
  const scroller = document.getElementById("quartz-root")
  if (!scroller) return
  const viewH = scroller.clientHeight
  const maxScroll = Math.max(1, scroller.scrollHeight - scroller.clientHeight)

  for (const col of cols) {
    const drift = parseFloat(getComputedStyle(col).getPropertyValue("--col-drift")) || 0
    for (const scrap of Array.from(col.children) as HTMLElement[]) {
      // Layout offset of the scrap within the scroller, ignoring transforms.
      let top = 0
      let el: HTMLElement | null = scrap
      while (el && el !== scroller) {
        top += el.offsetTop
        el = el.offsetParent as HTMLElement | null
      }
      const enterScroll = Math.min(1, Math.max(0, (top - viewH) / maxScroll))
      let shift = drift * enterScroll
      // Never push a reveal past the end of the scroll range, or bottom
      // scraps in the down-drifting column would be stuck half-faded.
      shift = Math.min(shift, maxScroll - (top - viewH) - 100)
      scrap.style.setProperty("--reveal-shift", `${shift.toFixed(1)}px`)
    }
  }
}

function setupScrapbook() {
  splitColumns()
  bindFacades()
}

let resizeTimer: ReturnType<typeof setTimeout>
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(splitColumns, 150)
})

document.addEventListener("nav", setupScrapbook)
window.addEventListener("load", setupScrapbook)
