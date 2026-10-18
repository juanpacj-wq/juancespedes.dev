# 0033. Projects by area of work

- Status: accepted
- Date: 2026-10-17
- Amends: [0028](0028-pinned-project-stage.md) (one stage per area, no grid under it)

## Context

With four Power BI reports added, the home page held twelve projects: five on the pinned stage and
seven in a grid under it. The owner applies to full-stack, data analytics and automation roles,
and a recruiter for one of them had to scroll past the other two. The owner asked for the
projects split by role, with a way to reach each group without going through every project, and
a projects menu in the header that leads to each group.

## Decision

- **A `track` per project.** The content says which area a project belongs to (`full-stack`,
  `analytics` or `automation`); `order` sets its place inside the area. Display order sorts by
  area first, so previous and next links on project pages walk one area, then the next.
- **Tabs above one stage per area.** The title and a segmented control with the three areas sit
  above the projects; each area is its own `ProjectStage`, and one shows at a time. Switching
  keeps the reader at the start of the section, so a new area opens on its first project. Arrow
  keys move between tabs (WAI-ARIA tabs), and the address follows the area (`/#work-analytics`).
- **The title and tabs stick with the stage.** On wide screens they stay 5.5rem from the top
  while the stage plays. Their bottom margin is one screen minus their height and the stage
  starts one screen higher, so both pin and let go at the same scroll; their height is measured
  into `--work-head`.
- **The end of a stage leads on.** Under the rail, where the link to the grid was, a link opens
  the next area.
- **A projects menu in the header.** The Projects item keeps its link and gains an arrow button
  that opens a panel with the three areas: a fan of screenshots, the count, one line on the area
  and its projects. It opens on hover after a short pause or from the button, and closes on
  Escape, on a click elsewhere and when focus leaves it. Its screenshots load the first time it
  opens. Other pages build the same menu, with links back to the home page areas.
- **Progressive.** Without JavaScript the tabs are jump links and every area shows, one after
  another, under its own heading (a `<noscript>` style).

## Consequences

- The home page is shorter: only the area being read takes scroll.
- The project card component and its stylesheet are gone; the stage covers every project.
- A new project must name its track (`pnpm new:project` fills one from the kind).
- The header menu adds about a kilobyte of compressed HTML to every page.
