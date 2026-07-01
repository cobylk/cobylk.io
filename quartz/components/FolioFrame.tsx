import { QuartzComponent, QuartzComponentConstructor } from "./types"
// @ts-ignore
import folioStyle from "./styles/folio.scss"
// @ts-ignore
import frameScript from "./scripts/folioFrame.inline"

// Decorative fixed frame: a centered, column-width bordered rectangle with
// corner ticks, matching the Folio mockup. Purely visual (pointer-events:none).
const FolioFrame: QuartzComponent = () => {
  return (
    <>
      <div class="folio-frame" aria-hidden="true">
        <div class="folio-tick tl"></div>
        <div class="folio-tick tr"></div>
        <div class="folio-tick bl"></div>
        <div class="folio-tick br"></div>
      </div>
      {/* Roaming creature that travels the frame perimeter (folioFrame.inline.ts). */}
      {/* Temporarily disabled — folioFrame.inline.ts no-ops when this is absent. */}
      {/* <div class="folio-creature" aria-hidden="true"></div> */}
    </>
  )
}

// This component is present on every page, so it carries the whole Folio
// stylesheet (chrome + homepage) to guarantee the styles load site-wide, and
// the scroll-reset script that runs on every navigation.
FolioFrame.css = folioStyle
FolioFrame.afterDOMLoaded = frameScript

export default (() => FolioFrame) satisfies QuartzComponentConstructor
