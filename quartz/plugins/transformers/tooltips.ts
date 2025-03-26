import { QuartzTransformerPlugin } from "../types"
import { Root } from "mdast"
import { ReplaceFunction, findAndReplace as mdastFindReplace } from "mdast-util-find-and-replace"

interface Options {
  // No options needed for now
}

const defaultOptions: Options = {}

// Regex to match [text](tooltip:content)
const tooltipRegex = /\[([^\]]+)\]\(tooltip:([^)]+)\)/g

export const TooltipMarkdown: QuartzTransformerPlugin<Partial<Options>> = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts }
  let tooltipCounter = 1

  return {
    name: "TooltipMarkdown",
    markdownPlugins() {
      const plugins = []

      plugins.push(() => {
        return (tree: Root) => {
          const replacements: [RegExp, ReplaceFunction][] = []

          replacements.push([
            tooltipRegex,
            (_value: string, ...capture: string[]) => {
              const [text, tooltip] = capture
              const currentNumber = tooltipCounter++
              
              return {
                type: "html",
                value: `<span class="tooltip" data-tooltip="${tooltip}" data-number="${currentNumber}">${text}</span>`,
              }
            },
          ])

          mdastFindReplace(tree, replacements)
        }
      })

      return plugins
    },
  }
} 