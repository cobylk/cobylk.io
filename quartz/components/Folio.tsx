import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { getDate } from "./Date"
// @ts-ignore
import folioScript from "./scripts/folio.inline"

interface NewsItem {
  date: string
  text: string
}

// Footnote link using the site's existing markdown-tooltip markup, so the
// shared `.tooltip` styling + tooltip.inline script drive it (the "old"
// tooltips).
function Footnote({ label, n, tip }: { label: string; n: number; tip: string }) {
  return (
    <span class="tooltip" data-tooltip={tip} data-number={n}>
      {label}
    </span>
  )
}

const Folio: QuartzComponent = ({ fileData, allFiles, cfg }: QuartzComponentProps) => {
  const yearOf = (p: QuartzPluginData) => {
    const d = getDate(cfg, p)
    return d ? new Date(d).getFullYear().toString() : ""
  }
  const inFolder = (folder: string) => (p: QuartzPluginData) =>
    !!p.slug &&
    p.slug.startsWith(folder + "/") &&
    !p.slug.endsWith("/index") &&
    !p.frontmatter?.draft
  const byDateDesc = (a: QuartzPluginData, b: QuartzPluginData) => {
    const da = getDate(cfg, a)?.getTime() ?? 0
    const db = getDate(cfg, b)?.getTime() ?? 0
    return db - da
  }
  const rel = (p: QuartzPluginData) => resolveRelative(fileData.slug!, p.slug!)

  const research = allFiles.filter(inFolder("Research")).sort(byDateDesc)
  const writing = allFiles.filter(inFolder("Personal")).sort(byDateDesc)
  const news: NewsItem[] = ((fileData.frontmatter as any)?.news ?? []) as NewsItem[]

  const index = (rows: QuartzPluginData[], eyebrow: string) => (
    <section class="folio-section">
      <div class="folio-eyebrow mono">{eyebrow}</div>
      {rows.map((p) => (
        <a class="folio-row" href={rel(p)}>
          <span class="folio-row-title">{p.frontmatter?.title}</span>
          <span class="folio-row-year mono">{yearOf(p)}</span>
        </a>
      ))}
    </section>
  )

  return (
    <div class="folio">
      <p class="folio-intro">
        I'm Coby Kassner, an AI safety{" "}
        <Footnote
          label="researcher"
          n={1}
          tip="Perhaps, soon, a technically-oriented generalist?"
        />{" "}
        with interest in control and science of generalization. I have a broader interest in most
        things related to{" "}
        <Footnote label="macrostrategy" n={2} tip="Generally, I'm a big fan of Forethought." /> ,
        existential risk,{" "}
        <Footnote
          label="analytical philosophy"
          n={3}
          tip="I'm most interested in population ethics, cluelessness, reasoning under moral uncertainty, and all of the sorts of papers that L. Dung writes."
        />{" "}
        , and effective altruism / AI safety fieldbuilding. In my free time, I love composing and{" "}
        <Footnote
          label="performing music"
          n={4}
          tip="I play the piano, alto saxophone, and have dreams of learning the accordion or bandoneon."
        />
        , dancing Argentine tango, and mountaineering. I'm currently{" "}
        <Footnote label="studying" n={5} tip="B.S. Statistics and Data Science, Class of 2029" /> at
        Yale, where I help organize the effective altruism and AI alignment groups.
      </p>

      <div class="folio-score-wrap">
        <div class="folio-score" role="img" aria-label="A flourish of musical notation"></div>
        <div class="folio-score-tip">
          This is a snippet from my piece <em>Tidal Disruption Event</em> (2024). If you can't tell,
          I'm infatuated with E lydian
        </div>
      </div>

      <section class="folio-section folio-news">
        <div class="folio-news-head">
          <div class="folio-eyebrow mono">NEWS</div>
          <div class="folio-drag-hint mono">DRAG →</div>
        </div>
        <div class="folio-news-scroll">
          <div class="folio-news-track">
            <div class="folio-news-axis"></div>
            {news.map((n) => (
              <div class="folio-news-item">
                <div class="folio-news-date mono">{n.date}</div>
                <div class="folio-news-tick"></div>
                <div class="folio-news-text">{n.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {index(research, "SELECTED RESEARCH")}
      {index(writing, "WRITING")}
    </div>
  )
}

Folio.afterDOMLoaded = folioScript

export default (() => Folio) satisfies QuartzComponentConstructor
