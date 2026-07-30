import fs from "fs"
import { joinSegments, QUARTZ, FullSlug } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import { write } from "./helpers"
import { BuildCtx } from "../../util/ctx"

export const Favicon: QuartzEmitterPlugin = () => ({
  name: "Favicon",
  async *emit({ argv }) {
    const iconPath = joinSegments(QUARTZ, "static", "favicon-light.ico")

    yield write({
      ctx: { argv } as BuildCtx,
      slug: "favicon" as FullSlug,
      ext: ".ico",
      content: await fs.promises.readFile(iconPath),
    })
  },
  async *partialEmit() {},
})
