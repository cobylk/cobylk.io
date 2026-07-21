import { QuartzComponent, QuartzComponentConstructor } from "./types"

// @ts-ignore
import script from "./scripts/scrapbook.inline"

// Renders nothing; loads the click-to-play YouTube facade script site-wide.
// It only acts on pages containing `button.yt-facade` (the homepage's
// scrapbook fold).
const ScrapbookVideos: QuartzComponent = () => {
  return null
}

ScrapbookVideos.afterDOMLoaded = script

export default (() => ScrapbookVideos) satisfies QuartzComponentConstructor
