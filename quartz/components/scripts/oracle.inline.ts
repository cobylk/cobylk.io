// Interactive partitioned probability distributions for "I, Oracle"
// (content/Personal/future.md). The markdown places empty
// `<div class="oracle-dist" data-dist="...">` containers; this script draws an
// SVG density curve into each, partitions the area under the curve into
// clickable regions, and reveals the `.oracle-variant` block matching the
// current (AC timeline × takeoff speed) selection.
//
// The distributions themselves are placeholders — swap the density functions
// and region boundaries in DISTS below when the real numbers exist.

interface RegionSpec {
  key: string
  label: string
  // Right boundary of the region in x units; null means "to the end of the domain".
  upto: number | null
}

interface DistSpec {
  eyebrow: string
  xMin: number
  xMax: number
  density: (x: number) => number
  regions: RegionSpec[]
  ticks: number[]
  tickLabel: (x: number) => string
}

const logNormal = (t: number, mu: number, sigma: number): number => {
  if (t <= 0) return 0
  const z = (Math.log(t) - mu) / sigma
  return Math.exp(-0.5 * z * z) / (t * sigma * Math.sqrt(2 * Math.PI))
}

const DISTS: Record<string, DistSpec> = {
  ac: {
    eyebrow: "P(FIRST AUTOMATED CODER), BY YEAR",
    xMin: 2026,
    xMax: 2056,
    density: (x) => logNormal(x - 2025.5, Math.log(5), 0.85),
    regions: [
      { key: "early", label: "before 2031", upto: 2031 },
      { key: "mid", label: "2031–2040", upto: 2040 },
      { key: "late", label: "after 2040", upto: null },
    ],
    ticks: [2030, 2035, 2040, 2045, 2050, 2055],
    tickLabel: (x) => String(x),
  },
  takeoff: {
    eyebrow: "P(YEARS FROM AC TO ASI)",
    xMin: 0,
    xMax: 12,
    density: (x) => logNormal(x, Math.log(2), 0.9),
    regions: [
      { key: "fast", label: "under 3 years", upto: 3 },
      { key: "slow", label: "3 years or more", upto: null },
    ],
    ticks: [0, 2, 4, 6, 8, 10, 12],
    tickLabel: (x) => (x === 0 ? "0" : `${x}y`),
  },
}

const SVG_NS = "http://www.w3.org/2000/svg"
const W = 660
const H = 210
const M = { left: 10, right: 10, top: 16, bottom: 28 }
const SAMPLES = 240

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  return el
}

interface WidgetApi {
  setSelected: (key: string | null) => void
}

function renderWidget(
  container: HTMLElement,
  spec: DistSpec,
  onSelect: (key: string) => void,
): WidgetApi {
  container.innerHTML = ""

  const innerW = W - M.left - M.right
  const innerH = H - M.top - M.bottom
  const base = M.top + innerH
  const toX = (x: number) => M.left + ((x - spec.xMin) / (spec.xMax - spec.xMin)) * innerW

  // Sample the density and normalize peak height to the plot area.
  const xs: number[] = []
  const ds: number[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const x = spec.xMin + ((spec.xMax - spec.xMin) * i) / SAMPLES
    xs.push(x)
    ds.push(spec.density(x))
  }
  const dMax = Math.max(...ds) * 1.06
  const toY = (d: number) => base - (d / dMax) * innerH

  // Total mass over the (truncated) domain, for region percentages.
  const dx = (spec.xMax - spec.xMin) / SAMPLES
  const massBetween = (a: number, b: number) => {
    let m = 0
    for (let i = 0; i < SAMPLES; i++) {
      const mid = (xs[i] + xs[i + 1]) / 2
      if (mid >= a && mid < b) m += ((ds[i] + ds[i + 1]) / 2) * dx
    }
    return m
  }
  const total = massBetween(spec.xMin, spec.xMax)

  const eyebrow = document.createElement("div")
  eyebrow.className = "oracle-eyebrow mono"
  eyebrow.textContent = spec.eyebrow
  container.appendChild(eyebrow)

  const svg = svgEl("svg", {
    viewBox: `0 0 ${W} ${H}`,
    class: "oracle-svg",
    role: "group",
    "aria-label": spec.eyebrow,
  })
  container.appendChild(svg)

  // Region boundaries in x units.
  const bounds: [number, number][] = []
  let cursor = spec.xMin
  for (const r of spec.regions) {
    const right = r.upto ?? spec.xMax
    bounds.push([cursor, right])
    cursor = right
  }

  const regionGroups = new Map<string, SVGGElement>()
  const keyButtons = new Map<string, HTMLButtonElement>()

  spec.regions.forEach((r, ri) => {
    const [a, b] = bounds[ri]
    const g = svgEl("g", { class: "oracle-region-g" })

    // Visible fill: area under the curve between the boundaries.
    let d = `M ${toX(a).toFixed(2)} ${base}`
    for (let i = 0; i <= SAMPLES; i++) {
      if (xs[i] < a || xs[i] > b) continue
      d += ` L ${toX(xs[i]).toFixed(2)} ${toY(ds[i]).toFixed(2)}`
    }
    d += ` L ${toX(b).toFixed(2)} ${base} Z`
    g.appendChild(svgEl("path", { d, class: "oracle-area" }))

    // Invisible full-height hit target so thin tails are still easy to click.
    const hit = svgEl("rect", {
      x: String(toX(a).toFixed(2)),
      y: String(M.top),
      width: String((toX(b) - toX(a)).toFixed(2)),
      height: String(innerH),
      class: "oracle-hit",
      tabindex: "0",
      role: "button",
      "aria-pressed": "false",
      "aria-label": `${r.label} (${Math.round((massBetween(a, b) / total) * 100)}%)`,
    })
    const activate = () => onSelect(r.key)
    hit.addEventListener("click", activate)
    hit.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        activate()
      }
    })
    const hoverOn = () => g.classList.add("hover")
    const hoverOff = () => g.classList.remove("hover")
    hit.addEventListener("mouseenter", hoverOn)
    hit.addEventListener("mouseleave", hoverOff)
    hit.addEventListener("focus", hoverOn)
    hit.addEventListener("blur", hoverOff)
    g.appendChild(hit)

    svg.appendChild(g)
    regionGroups.set(r.key, g)
  })

  // Dashed dividers at the internal boundaries.
  for (const r of spec.regions) {
    if (r.upto === null || r.upto >= spec.xMax) continue
    const bx = toX(r.upto).toFixed(2)
    svg.appendChild(
      svgEl("line", {
        x1: bx,
        y1: String(M.top),
        x2: bx,
        y2: String(base),
        class: "oracle-boundary",
      }),
    )
  }

  // The curve itself, drawn above the fills.
  let curve = ""
  for (let i = 0; i <= SAMPLES; i++) {
    curve += `${i === 0 ? "M" : " L"} ${toX(xs[i]).toFixed(2)} ${toY(ds[i]).toFixed(2)}`
  }
  svg.appendChild(svgEl("path", { d: curve, class: "oracle-curve" }))

  // Baseline and ticks.
  svg.appendChild(
    svgEl("line", {
      x1: String(M.left),
      y1: String(base),
      x2: String(W - M.right),
      y2: String(base),
      class: "oracle-axis",
    }),
  )
  for (const t of spec.ticks) {
    const tx = toX(t).toFixed(2)
    svg.appendChild(
      svgEl("line", {
        x1: tx,
        y1: String(base),
        x2: tx,
        y2: String(base + 4),
        class: "oracle-axis",
      }),
    )
    const label = svgEl("text", {
      x: tx,
      y: String(base + 17),
      "text-anchor": "middle",
      class: "oracle-tick-label",
    })
    label.textContent = spec.tickLabel(t)
    svg.appendChild(label)
  }

  // Legend buttons mirroring the clickable regions.
  const keys = document.createElement("div")
  keys.className = "oracle-keys"
  spec.regions.forEach((r, ri) => {
    const [a, b] = bounds[ri]
    const pct = Math.round((massBetween(a, b) / total) * 100)
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = "oracle-key mono"
    btn.textContent = `${r.label} · ${pct}%`
    btn.addEventListener("click", () => onSelect(r.key))
    keys.appendChild(btn)
    keyButtons.set(r.key, btn)
  })
  container.appendChild(keys)

  return {
    setSelected: (key: string | null) => {
      container.classList.toggle("has-selection", key !== null)
      for (const [k, g] of regionGroups) {
        const on = k === key
        g.classList.toggle("selected", on)
        g.querySelector(".oracle-hit")?.setAttribute("aria-pressed", String(on))
      }
      for (const [k, btn] of keyButtons) {
        btn.classList.toggle("selected", k === key)
      }
    },
  }
}

function setupOracle() {
  const widgets = Array.from(document.querySelectorAll<HTMLElement>(".oracle-dist"))
  if (widgets.length === 0) return

  const selection: Record<string, string | null> = {}
  const apis: Record<string, WidgetApi> = {}

  const hint = document.querySelector<HTMLElement>(".oracle-hint")
  const variants = Array.from(document.querySelectorAll<HTMLElement>(".oracle-variant"))

  const updateReading = () => {
    const ac = selection["ac"] ?? null
    const takeoff = selection["takeoff"] ?? null
    const done = ac !== null && takeoff !== null
    for (const v of variants) {
      v.classList.toggle("active", done && v.dataset.ac === ac && v.dataset.takeoff === takeoff)
    }
    if (hint) {
      hint.style.display = done ? "none" : ""
      if (ac === null && takeoff === null) {
        hint.textContent = "SELECT A REGION UNDER EACH CURVE TO READ THAT FUTURE"
      } else if (ac === null) {
        hint.textContent = "NOW SELECT WHEN THE AUTOMATED CODER ARRIVES"
      } else if (takeoff === null) {
        hint.textContent = "NOW SELECT HOW QUICKLY ASI FOLLOWS"
      }
    }
  }

  for (const el of widgets) {
    const distId = el.dataset.dist
    if (!distId || !(distId in DISTS)) continue
    selection[distId] = null
    apis[distId] = renderWidget(el, DISTS[distId], (key) => {
      // Clicking the selected region again deselects it.
      selection[distId] = selection[distId] === key ? null : key
      apis[distId].setSelected(selection[distId])
      updateReading()
    })
  }

  updateReading()
}

document.addEventListener("nav", setupOracle)
window.addEventListener("load", setupOracle)
