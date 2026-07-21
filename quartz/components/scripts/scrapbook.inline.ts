// Scrapbook behaviors (the homepage's expandable scrapbook fold).
//
// 1. Click-to-play facade for YouTube embeds: cards render as bare thumbnail
//    buttons with no YouTube chrome; the real player iframe is only injected
//    when a card is played, which also keeps ~30 player bundles off the
//    initial page load.
//
// 2. Column splitting: the markdown stays one flat list (rendered via CSS
//    multicol when JS is absent), but a multicol board balances column
//    heights by splitting scraps mid-card, so the flat list is distributed
//    here into .scrapbook-col containers, greedily filling the shortest
//    column. While the <details> fold is closed the board has no layout
//    (zero width), so the split is deferred to the first open.

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
  // Mirror the multicol fallback (columns: 2 260px, 1.6rem gap): two columns
  // when they fit in the reading column, one otherwise.
  const gap = 25.6
  return Math.max(1, Math.min(2, Math.floor((width + gap) / (260 + gap))))
}

function splitColumns() {
  const board = document.querySelector<HTMLElement>(".scrapbook-board")
  if (!board) return
  // Zero width means the fold is closed; the toggle listener re-runs this.
  if (board.clientWidth === 0) return
  const n = columnCount(board.clientWidth)
  if (board.dataset.cols === String(n)) return

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
}

function bindFold() {
  const fold = document.querySelector<HTMLDetailsElement>("details.scrapbook-fold")
  if (!fold || fold.dataset.bound === "true") return
  fold.dataset.bound = "true"
  fold.addEventListener("toggle", () => {
    if (fold.open) splitColumns()
  })
}

function setupScrapbook() {
  splitColumns()
  bindFacades()
  bindFold()
}

let resizeTimer: ReturnType<typeof setTimeout>
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(splitColumns, 150)
})

document.addEventListener("nav", setupScrapbook)
window.addEventListener("load", setupScrapbook)
