import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"
// @ts-ignore
import themeScript from "./scripts/folioTheme.inline"

// Theme-toggle icons (Feather outlines), drawn in currentColor.
const Sun = (
  <svg
    class="folio-icon icon-sun"
    viewBox="0 0 24 24"
    width="17"
    height="17"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)
const Moon = (
  <svg
    class="folio-icon icon-moon"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)
// Speech-bubble glyph shown in place of the "chat" label on very narrow widths.
const Chat = (
  <svg
    class="folio-chat-icon"
    viewBox="0 0 24 24"
    width="15"
    height="15"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
)

const FolioHeader: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const home = resolveRelative(fileData.slug!, "index" as any)
  const chat = resolveRelative(fileData.slug!, "chat" as any)
  return (
    <div class="folio-header">
      <a href={home} class="folio-wordmark">
        <span class="folio-word">coby</span>
        <span class="folio-word-ext mono">.lk</span>
      </a>
      <nav class="folio-nav mono">
        <a href="curriculum_vitae.pdf" target="_blank" rel="noopener">
          cv
        </a>
        <a href="https://github.com/cobylk" target="_blank" rel="noopener" aria-label="GitHub">
          gh
        </a>
        <a href="https://www.linkedin.com/in/cobylk/" target="_blank" rel="noopener" aria-label="LinkedIn">
          li
        </a>
        <a href={chat} class="folio-chat" aria-label="Chat / schedule with Coby">
          <span class="folio-chat-label">chat</span>
          {Chat}
        </a>
      </nav>
      <button class="darkmode folio-toggle" aria-label="Toggle light/dark theme">
        {Sun}
        {Moon}
      </button>
    </div>
  )
}

FolioHeader.beforeDOMLoaded = themeScript

export default (() => FolioHeader) satisfies QuartzComponentConstructor
