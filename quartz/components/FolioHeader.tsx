import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"
// @ts-ignore
import themeScript from "./scripts/folioTheme.inline"

// Sticky/fixed boxed header: wordmark + theme toggle. The toggle is a boxed
// sun/moon segmented control; it carries the class `darkmode`, so Quartz's
// existing darkmode.inline script wires the click-to-toggle behaviour.
const FolioHeader: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const home = resolveRelative(fileData.slug!, "index" as any)
  return (
    <div class="folio-header">
      <a href={home} class="folio-wordmark">
        <span class="folio-word">coby</span>
        <span class="folio-word-ext mono">.lk</span>
      </a>
      <button class="darkmode folio-toggle" aria-label="Toggle light/dark theme">
        {/* &#65038; (U+FE0E) forces monochrome text rendering so mobile doesn't
            promote these to colour emoji. */}
        <span class="folio-toggle-cell sun">&#9728;&#65038;</span>
        <span class="folio-toggle-cell moon">&#9790;&#65038;</span>
      </button>
    </div>
  )
}

FolioHeader.beforeDOMLoaded = themeScript

export default (() => FolioHeader) satisfies QuartzComponentConstructor
