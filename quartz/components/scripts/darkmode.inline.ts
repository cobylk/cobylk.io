const userPref = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
const currentTheme = localStorage.getItem("theme") ?? userPref
document.documentElement.setAttribute("saved-theme", currentTheme)

const emitThemeChangeEvent = (theme: "light" | "dark") => {
  const event: CustomEventMap["themechange"] = new CustomEvent("themechange", {
    detail: { theme },
  })
  document.dispatchEvent(event)
}

// Create the animation mask element
const createAnimationMask = (newTheme: string) => {
  const mask = document.createElement('div')
  mask.classList.add('theme-transition-mask')
  
  // Add class based on which theme we're transitioning to
  mask.classList.add(newTheme === 'dark' ? 'to-dark' : 'to-light')
  
  document.body.appendChild(mask)
  return mask
}

// Animate theme transition with a radial sweep effect
const animateThemeTransition = (clickX: number, clickY: number, newTheme: string) => {
  // Calculate the largest possible distance from the click point to a corner
  // This ensures our circle will be large enough to cover the entire viewport
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Calculate distances to all four corners
  const distToTopLeft = Math.sqrt(clickX ** 2 + clickY ** 2)
  const distToTopRight = Math.sqrt((viewportWidth - clickX) ** 2 + clickY ** 2)
  const distToBottomLeft = Math.sqrt(clickX ** 2 + (viewportHeight - clickY) ** 2)
  const distToBottomRight = Math.sqrt((viewportWidth - clickX) ** 2 + (viewportHeight - clickY) ** 2)
  
  // Find the maximum distance and add a safety margin
  const maxDist = Math.max(distToTopLeft, distToTopRight, distToBottomLeft, distToBottomRight) * 1.2
  const finalSize = maxDist * 2 // Diameter needs to be twice the radius
  
  const mask = createAnimationMask(newTheme)
  mask.style.setProperty('--click-x', `${clickX}px`)
  mask.style.setProperty('--click-y', `${clickY}px`)
  mask.style.setProperty('--final-size', `${finalSize}px`)
  
  // Phase 1: Expand the mask
  mask.classList.add('expanding')
  
  // Only update the theme after the expansion completes
  setTimeout(() => {
    // Now change the theme when the mask is fully expanded
    document.documentElement.setAttribute("saved-theme", newTheme)
    
    mask.classList.remove('expanding')
    mask.classList.add('fading')
    
    // Remove the mask after the fade animation completes
    // Increase timeout slightly to ensure animation completes
    setTimeout(() => {
      try {
        // Check if mask still exists in the DOM
        if (mask && mask.parentNode) {
          document.body.removeChild(mask)
        }
      } catch (e) {
        console.log('Mask already removed')
      }
    }, 600) // Slightly longer than CSS fade duration to be safe
  }, 700) // Match this to the CSS expand duration
}

document.addEventListener("nav", () => {
  const switchTheme = (e: MouseEvent) => {
    const button = e.currentTarget as HTMLElement
    const rect = button.getBoundingClientRect()
    const clickX = rect.left + rect.width / 2
    const clickY = rect.top + rect.height / 2
    
    const newTheme =
      document.documentElement.getAttribute("saved-theme") === "dark" ? "light" : "dark"
    
    // Animate the theme transition
    animateThemeTransition(clickX, clickY, newTheme)
    
    // Update localStorage and emit the theme change event
    localStorage.setItem("theme", newTheme)
    emitThemeChangeEvent(newTheme)
  }

  const themeChange = (e: MediaQueryListEvent) => {
    const newTheme = e.matches ? "dark" : "light"
    document.documentElement.setAttribute("saved-theme", newTheme)
    localStorage.setItem("theme", newTheme)
    emitThemeChangeEvent(newTheme)
  }

  for (const darkmodeButton of document.getElementsByClassName("darkmode")) {
    darkmodeButton.addEventListener("click", switchTheme as unknown as EventListener)
    window.addCleanup(() => darkmodeButton.removeEventListener("click", switchTheme as unknown as EventListener))
  }

  // Listen for changes in prefers-color-scheme
  const colorSchemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
  colorSchemeMediaQuery.addEventListener("change", themeChange)
  window.addCleanup(() => colorSchemeMediaQuery.removeEventListener("change", themeChange))
})
