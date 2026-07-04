import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  // The folio chrome (fixed boxed header + decorative frame) on every page.
  header: [Component.FolioHeader(), Component.FolioFrame()],
  // Tooltip renders nothing but loads the markdown-tooltip script site-wide.
  // OracleDist likewise loads the interactive-distribution script; it only
  // acts on pages containing `.oracle-dist` containers.
  afterBody: [Component.Tooltip(), Component.OracleDist()],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/cobylk",
      LinkedIn: "https://www.linkedin.com/in/cobylk/",
      Email: "mailto:kassner@cobylk.io",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    // Homepage: the Folio replaces normal article content.
    Component.ConditionalRender({
      component: Component.Folio(),
      condition: (page) => page.fileData.slug === "index",
    }),
    Component.ConditionalRender({
      component: Component.Breadcrumbs({ spacerSymbol: "/" }),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
    // Booking widget, only on /chat.
    Component.ConditionalRender({
      component: Component.ChatBooking(),
      condition: (page) => page.fileData.slug === "chat",
    }),
  ],
  left: [],
  right: [],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs({ spacerSymbol: "/" }),
    Component.ArticleTitle(),
    Component.ContentMeta(),
  ],
  left: [],
  right: [],
}
