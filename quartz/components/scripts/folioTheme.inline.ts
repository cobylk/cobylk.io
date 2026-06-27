// Minimal theme toggle: swaps `saved-theme` instantly; the quick crossfade is
// done with CSS transitions on the theme-driven colors (see folio.scss).
type Theme = "light" | "dark"

const KEY = "theme"
const prefers = (): Theme =>
  window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
const current = (): Theme => {
  const saved = localStorage.getItem(KEY)
  return saved === "light" || saved === "dark" ? saved : prefers()
}

// Set as early as possible (beforeDOMLoaded) to avoid a flash of the wrong theme.
document.documentElement.setAttribute("saved-theme", current())

const setTheme = (theme: Theme) => {
  document.documentElement.setAttribute("saved-theme", theme)
  localStorage.setItem(KEY, theme)
  document.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }))
}

document.addEventListener("nav", () => {
  const toggle = () => {
    const next: Theme =
      document.documentElement.getAttribute("saved-theme") === "dark" ? "light" : "dark"
    setTheme(next)
  }
  for (const btn of document.getElementsByClassName("darkmode")) {
    btn.addEventListener("click", toggle)
    window.addCleanup?.(() => btn.removeEventListener("click", toggle))
  }

  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  const onChange = (e: MediaQueryListEvent) => setTheme(e.matches ? "dark" : "light")
  mq.addEventListener("change", onChange)
  window.addCleanup?.(() => mq.removeEventListener("change", onChange))
})
