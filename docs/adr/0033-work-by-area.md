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
- **Tabs above one stage per area.** The title and the three areas sit above the projects, set
  as words, without counts: the current one in ink with a fine accent line under it, one line on
  the area below; each area is its own `ProjectStage`, and one shows at a time. Switching
  keeps the reader at the start of the section, so a new area opens on its first project. Arrow
  keys move between tabs (WAI-ARIA tabs), and the address follows the area (`/#work-analytics`).
- **The title and tabs stick with the stage.** On wide screens they stay 5.5rem from the top
  while the stage plays. Their bottom margin is one screen minus their height and the stage
  starts one screen higher, so both pin and let go at the same scroll; their height is measured
  into `--work-head`.
- **Scrolling runs through the areas.** On the pinned stage, scrolling past the last project of
  an area opens the next one on its first project, and scrolling above the first project of one
  opens the previous one on its last: full-stack, analytics, AI and automation, then the section
  that follows. Only the reader's own scrolling counts (wheel, touch, keys), so a jump from a
  header link passes through. Phones and reduced motion keep each area as a list.
- **The end of a stage leads on.** Under the rail, where the link to the grid was, a link opens
  the next area.
- **A projects menu in the header.** The Projects item keeps its link and gains an arrow button
  that opens a panel: three columns of text (the area, then the short `name` of each project)
  and one preview, the screen and full title of the project under the pointer or the focus. It opens on hover after a short pause or from the button, and closes on
  Escape, on a click elsewhere and when focus leaves it. Its screenshots load the first time it
  opens. Other pages build the same menu, with links back to the home page areas.
- **Progressive.** Without JavaScript the tabs are jump links and every area shows, one after
  another, under its own heading (a `<noscript>` style).

## Consequences

- Minimal on purpose: no cards, eyebrow labels, numbering or arrows in the tabs or the menu, so
  the screenshots are the only images and the names do the rest.
- Every project has a `name`, the short form of its title, so menus never cut a title off.
- The home page is shorter: only the area being read takes scroll.
- The project card component and its stylesheet are gone; the stage covers every project.
- A new project must name its track (`pnpm new:project` fills one from the kind).
- The header menu adds about a kilobyte of compressed HTML to every page.
