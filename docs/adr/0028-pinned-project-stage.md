# 0028. Featured projects on a pinned stage

- Status: accepted
- Date: 2026-10-15
- Amends: [0021](0021-case-study-redesign.md) (the home page's feature cards)

## Context

The home page showed the five featured case studies as wide cards stacked one under another. The
owner wanted them presented one at a time, the way some studio portfolios do: the section stays on
screen and scrolling no longer moves the page but changes which project is shown, with an
animation. The home page sits on the Lighthouse budget (0.95 performance), so the effect must not
cost the first paint.

## Decision

- **A pinned stage on wide screens.** `ProjectStage` renders the featured projects. On screens of
  64rem and up, with motion allowed, the section is one viewport tall per project and its content
  is `position: sticky`. A rail of thumbnails on the left marks the current project and jumps to
  any of them; the stage on the right holds one project, and a click opens its case study.
- **One number drives the animation.** The script writes `--p` (0 to n - 1) on the section; CSS
  derives each slide's offset, the scale and dimming of the one being covered and the progress bars
  from it. Transforms and opacity only, one style write per frame, no animation library.
- **Hold, then move.** Each project stays still for the first 30% of its scroll and the next one
  slides in over the rest, eased, and the shown position follows the scroll with a short ease, so a
  wheel notch glides instead of jumping.
- **A list first.** The markup is a plain list of projects. Phones, reduced motion and visits
  without JavaScript keep it. `project-stage.css` loads after the `load` event and the stage only
  switches on (`data-stage-ready`) once it applies; screenshots keep their address in data
  attributes until the section comes near.
- **Nothing is unreachable.** Every project keeps its link; focus on a project that waits off the
  stage scrolls to it, and the stage clips with `overflow: clip`, so focus can never scroll it.
- **Other projects keep the compact grid** under the stage; the rail's last link points to it.

## Consequences

- The home page is about four viewports taller on desktop while the stage is pinned.
- Tests that click a home page project emulate reduced motion (the list); the stage has its own
  tests for scrolling, the rail and focus.
- A sixth featured project adds one viewport of scroll; more than six would call for a shorter
  hold or a second stage.
