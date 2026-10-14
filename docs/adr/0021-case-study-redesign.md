# 0021. Case study pages as a told story: plain-language problem, motion layer, live diagram

- Status: accepted
- Date: 2026-10-13
- Amends: [0011](0011-case-study-pages.md) (template, diagram rendering),
  [0019](0019-reference-hero-chat-and-case-cards.md) (stock photos on project pages)

## Context

The owner compared a project page side by side with a case study on the reference portfolio
(educabellos.com, the Ávoris cruise booking case) and found ours flat: few graphics, little motion,
a problem stated in technical terms, and an architecture diagram that read as a grid of boxes.

The reference page was taken apart in a browser (screenshots at 1440 and 390 px, served HTML, CSS
and scripts). Findings that shaped this decision:

- **Narrative.** The result is in the title, then a facts grid, then a one-sentence story lead,
  an overview with three figure cards, the problem as short rows, a role timeline, research,
  synthesis, iterations as a before and after, the design, the impact as a ledger of figures, a
  reflection, a large card for the next case and a closing call to action. Business language,
  paragraphs of two to four sentences, most information in cards rather than prose, and a source
  under every figure.
- **Persistent aids.** A reading progress bar on top and a frosted pill nav fixed at the bottom
  that slides in after the hero and marks the chapter being read.
- **Motion.** GSAP with SplitText, ScrollTrigger and ScrollSmoother: headings rise line by line
  (2 s, expo out), blocks fade up once, cards tilt toward the pointer with a moving highlight, a
  hotspot walkthrough steps through a wireframe, and a smooth-scroll layer drives everything.
- **Diagrams.** Charts in tinted cards, a phase timeline, a sticky-note board from evidence to
  insight to solution, a before and after with status icons.

## Decision

**Content: the problem in plain words.** A case study gains a required `story`:

- `hook`: one sentence (160 characters at most) that states the pain as the people who lived it
  would say it. It opens the page in large type.
- `shifts`: one to four pairs of `before` and `after`, what changed for the people involved,
  shown side by side under the problem.

The domain requires a non-blank hook and at least one shift; the schema caps the lengths; the
content tests require the same number of shifts in every language. Every existing case was
written from facts already in its file, without new figures.

**Page: a told story in numbered chapters.** In order: a hero (eyebrow, title, summary, what I
helped with, the product on a stage with two figures floating over it, a facts grid), then
"At a glance" (the hook and the figure cards), the problem with its before and after, my role as
a rail, constraints as tiles, decisions as cards that stack while scrolling on wide screens (each
with what was ruled out), the architecture, results as a ledger, what I would do differently set
as quotations, the stack (as tags and as a slow band of outlined words), a closing call to action
and the next case as a large card. On wide screens a chapter's number and title stay pinned in a
left column while its content scrolls.

**Diagram: the same data, drawn live.** The markup is still the diagram (layers, nodes, a numbered
list of flows), so it reads complete without JavaScript and with a screen reader. A small script
measures the nodes on wide screens and draws each flow as a curved wire with data moving along
it, spreads the wires that share a side of a node, lights a node's links on hover and walks the
flows one step at a time with two buttons (the reference's hotspot walkthrough, applied to the
system instead of a wireframe). On phones the layers stack and the wires are not drawn.

**Motion: CSS first, one small script, nothing heavy.** Taken from the reference, rebuilt
without its libraries:

- Scroll-driven CSS (view and scroll timelines) for the progress bar, chapter headings, the hook
  lighting up word by word, the role rail filling and the cover straightening. Unsupported
  browsers show the final state.
- A deferred module (`case-study-motion.ts`, about 3 kB gzip, project pages only) for the chapter
  nav, figures that count up once, a light that follows the pointer over cards, and the diagram.
- `prefers-reduced-motion` stops counting, moving data and every animation; the nav and the
  diagram highlights stay, because they are reading aids.

**Left out on purpose:** smooth scrolling (it fights the browser's own scrolling and costs a
library), split-text line reveals that hide text until scrolled, a custom cursor, Lottie, and
GSAP itself. The JavaScript budget rises from 75 to 80 kB for the new script.

**Accessibility constraints on the motion.** No starting state lowers text below AA: words that
light up start at the `subtle` ink, the title animates position and blur only, and reveals use
full transparency (which checks treat as hidden). The automated WCAG checks run on project pages
in both themes.

**Stock photos leave project pages.** A generic photo of a laptop says nothing about the product
and pulled the page down. Project pages show only real images; until a `cover.*` exists, the stage
draws the same app window as the home page card, which also makes the card-to-page view
transition continuous. The stock files stay in place for their eventual swap (0019 amended).

## Consequences

- Writing a case study now also asks for a plain-language hook and its before and after; the
  scaffold (`pnpm new:project`) includes them.
- Project pages carry a second stylesheet (about 3.5 kB gzip) and a deferred script. Lighthouse
  budgets on `/proyectos/plant-telemetry` and `/en/projects/plant-telemetry` remain the gate.
- The diagram stays limited to layered flows (0011); the wires are decoration over that data.
- End-to-end tests cover the chapter list, the before and after, the chapter nav and the wires.
