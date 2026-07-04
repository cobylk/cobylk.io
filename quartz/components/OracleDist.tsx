import { QuartzComponent, QuartzComponentConstructor } from "./types"
// @ts-ignore
import script from "./scripts/oracle.inline"
import style from "./styles/oracle.scss"

// Renders nothing; loads the script + styles that hydrate `.oracle-dist`
// placeholders in article content (see content/Personal/future.md) into
// interactive partitioned distribution graphs.
const OracleDist: QuartzComponent = () => {
  return null
}

OracleDist.afterDOMLoaded = script
OracleDist.css = style

export default (() => OracleDist) satisfies QuartzComponentConstructor
