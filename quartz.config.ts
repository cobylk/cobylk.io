import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "cobylk.io",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "en-US",
    baseUrl: "https://cobylk.io/",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        title: "Newsreader",
        header: "Newsreader",
        body: { name: "Newsreader", weights: [300, 400, 500, 600], includeItalic: true },
        code: "IBM Plex Mono",
      },
      colors: {
        // Folio palette (light): bg #F4F1EA, ink #1B1A17, muted #6B675E
        lightMode: {
          light: "#F4F1EA",
          lightgray: "#dcd7cb",
          gray: "#6B675E",
          darkgray: "#1B1A17",
          dark: "#1B1A17",
          secondary: "#1B1A17",
          tertiary: "#6B675E",
          highlight: "rgba(27, 26, 23, 0.06)",
          textHighlight: "#1b1a1722",
        },
        // Folio palette (dark): bg #14130f, ink #ECE7DD, muted #a59f93
        darkMode: {
          light: "#14130f",
          lightgray: "#3a382f",
          gray: "#a59f93",
          darkgray: "#ECE7DD",
          dark: "#ECE7DD",
          secondary: "#ECE7DD",
          tertiary: "#a59f93",
          highlight: "rgba(236, 231, 221, 0.08)",
          textHighlight: "#ece7dd22",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
      Plugin.TooltipMarkdown(),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time
      Plugin.CustomOgImages(),
    ],
  },
}

export default config
