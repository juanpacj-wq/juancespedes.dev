# 0029. A wide, quieter layout with one grotesk

- Status: accepted
- Date: 2026-10-15
- Amends: [0018](0018-chiaroscuro-redesign.md) (type), [0025](0025-business-impact-section.md)
  (impact cards), [0028](0028-pinned-project-stage.md) (stage content)

## Context

The owner compared the site with four portfolios at the level he wants (romancaseres.cloud,
schindlertom.com, shelbykay.dev, good-fella.com) and named three problems.

- **Wasted width.** Every section and the header sat in an 80rem column. At 1920 px that left
  about 320 px empty on each side. The references reach the edges with gutters of 32 to 80 px.
- **Repeated content.** The same project appeared up to four times on the home page: on the stage,
  in the rail and in the impact cards, and again on its own page. Each time it came with its
  summary, figures and stack.
- **Explanations nobody needs.** Section descriptions said how the section worked ("organised by
  area", "every figure carries its source"), and a line under the stage explained how to scroll.

The type also read as generated: a light display serif over Geist Sans is the default of many
AI-built sites. The references use one grotesk set tight and heavy, with a mono for labels.

## Decision

- **Page width.** `Container` grows to 120rem (`--container-page`), with gutters from 16 px to
  64 px. It is the same frame for the header, every section and every project page. Long text
  keeps its own measure inside.
- **One grotesk.** Hanken Grotesk (OFL, variable, self-hosted through Fontsource) sets both the
  headings and the text. Headings use medium weight with tight tracking (-0.04em). Geist Mono
  stays for labels, data and the hero art. `Hanken Fallback` is Arial resized to its metrics
  (measured with @capsizecss/unpack), so nothing moves when the font arrives. Literata and Geist
  Sans are removed.
- **One line per section header.** A hairline on top and a short title ("Proyectos", "Stack",
  "Resultados", "Servicios", "Certificaciones", "Hablemos"). A note on the right appears only
  when it says something the visitor needs, such as the reply time.
- **Each fact once.** A project shows its screen, its name, and its kind and years on the stage
  and in the grid. The summary, figures, stack and sources live on its page. The rail holds only
  thumbnails (the names are for screen readers). A result shows its figure, one sentence and the
  project it came from, and opens the case. Its story, chart and source live on the project page.
  The about text no longer repeats the hero's sentence, and where the owner works is said once.
- **No instructions.** The stage keeps its counter and progress bars and drops the scroll hint.
  Section descriptions are gone.

## Consequences

- The home page is shorter and lighter: no chart markup, and no project summaries or figures.
- `AchievementChart` and `impact.css` are removed. The chart data stays in the content, where the
  case studies and the chat can use it.
- Changing a section title only touches `dictionary.ts`. The e2e tests read the new titles.
- The OG images still use Geist (rendered at build time from the `geist` package). Moving them to
  Hanken is a separate change.
