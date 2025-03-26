import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

// @ts-ignore
import script from "./scripts/tooltip.inline"
import { concatenateResources } from "../util/resources"

interface Options {
  // Add any options here if needed
}

const defaultOptions: Options = {}

export default ((opts?: Partial<Options>) => {
  const Tooltip: QuartzComponent = ({
    displayClass,
  }: QuartzComponentProps) => {
    return null // This component doesn't render anything, it just adds functionality
  }

  Tooltip.afterDOMLoaded = script

  return Tooltip
}) satisfies QuartzComponentConstructor 