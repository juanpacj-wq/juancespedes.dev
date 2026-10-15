# 0025. Business impact instead of a CV-style history

- Status: accepted
- Date: 2026-10-15
- Amends: [0018](0018-chiaroscuro-redesign.md) (the home page's "Experience and education" list)

## Context

The home page listed one job, its bullet points and one degree, laid out like a CV. The owner
pointed out that the CV already says all of it, and that the people who decide on hiring (managers,
not only engineers) look for results: what changed, by how much, and whether it can be trusted.
The case studies hold those results, but a visitor had to open each one to find them.

## Decision

- **An "impact" section replaces the history.** Eight achievements in a bento grid, each with the
  kind of win and where it happened, one large figure, a sentence in business terms and its source.
  The featured one (an external security audit with zero serious findings) spans two columns.
- **Achievements are content.** `content/achievements.yaml`, validated by `achievementSchema`, read
  through the `AchievementRepository` port and the `listAchievements` use case, like the headline
  metrics. Each one repeats a figure already published in a case study, with that case's source,
  so no new number appears on the site without evidence.
- **Charts only where the figure has a shape.** A before and after (latency, package size, tests),
  a breakdown (findings by severity) or progress (findings closed). Bars are shares of the largest
  amount in the same chart; every amount is also printed as text, so the bars are hidden from
  assistive technology. Figures without a shape (nine days, zero outages) show no chart.
- **Links survive only to published cases.** The use case drops the link when the case study is a
  draft or missing in that language; a content test checks every slug exists.
- **One line keeps the context.** Under the grid, the current role and the degree say where the
  results were achieved. The full history stays in the CV and in the chat corpus.
- **Motion within the budget.** Cards use the shared scroll reveal; bars grow with a scroll-driven
  `scale` animation from `impact.css`, deferred with the card styles. Bars have their final length
  without it.

## Consequences

- `ExperienceSection` is gone; `profile.experience` and `profile.education` still feed the impact
  line, the structured data and the chat.
- Adding an achievement is editing one YAML file; its project slug must exist.
- The headline metrics near the top stay engineering figures; the impact section is the manager's
  reading of the same work.
