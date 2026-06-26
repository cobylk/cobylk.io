// Content scrolls inside the fixed #quartz-root container, so the SPA router's
// window-scroll reset doesn't apply. Reset the container to the top on each
// navigation (unless jumping to an in-page anchor).
document.addEventListener("nav", () => {
  if (window.location.hash) return
  const root = document.getElementById("quartz-root")
  if (root) root.scrollTop = 0
})
