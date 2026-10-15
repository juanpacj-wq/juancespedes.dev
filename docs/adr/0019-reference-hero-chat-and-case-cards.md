# 0019. A rotating role in the hero, a floating chat and case-study cards

- Status: accepted; stock photos on project pages amended by [0021](0021-case-study-redesign.md)
- Date: 2026-10-13
- Amends: [0017](0017-ask-me-chat.md) (where the chat lives), [0018](0018-chiaroscuro-redesign.md)
  (hero content, project list)

## Context

The owner pointed at one portfolio (educabellos.com) and asked for three things from it: the
short hero whose job title rotates, its assistant opened from a corner instead of a section at
the end, and its case-study cards. The hero copy had grown into a badge, a name line, a slogan, a
pitch, two buttons, three social links and a scroll hint; the owner found parts of it off and
parts of it machine-sounding, and asked for something plainer, closer to the reference or to a
second one ("Hey, I'm Omkar, an Experience Designer").

The reference was taken apart from its served HTML, CSS and JavaScript (no build step, so the
sources are readable). Copies and notes are kept outside the repository. Findings:

- **Title ticker.** After a GSAP SplitText entrance, the role in the `h1` becomes a one-line
  window over a column of roles plus a copy of the first; every 2.8 s the column moves up one
  step (`yPercent`, 0.65 s, power3.inOut) and jumps back to zero at the copy. It loops forever.
  The navigation logo has a second word carousel on hover.
- **Assistant.** A 72 px "liquid glass" sphere fixed bottom-right (layered radial gradients,
  inset highlights, two coloured glows, a Lottie blob that plays faster on hover), entering 1.8 s
  after load; a tooltip introduces it once, 3 s in, for 5 s. It opens a 380 px panel on the
  right that pushes the page (`padding-right` on the wrapper); on phones a full-height sheet
  from below. Header with avatar, name, an info tooltip, reset and close; a greeting with three
  page-specific suggestions; bubbles, typing dots, a streaming cursor, suggestion chips and link
  cards after each answer; the conversation is kept in `sessionStorage`. Escape closes it.
- **Case cards.** A large rounded card per case: logo, an outcome headline, one sentence, a
  "View case study" button, three figures, and a product screenshot leaning out of the right
  edge. The whole card is a link. On a fine pointer the card tilts (`quickTo`, at most 6 and 4
  degrees) and a radial light follows the cursor; the button fills from below and its label
  rolls up; elements rise on scroll (ScrollTrigger); a custom cursor says "View project".
- Cost: GSAP with four plugins, ScrollSmoother, Lottie and page-transition scripts, all loaded
  up front. This site's budgets are 75 kB of JavaScript and 0.95 Lighthouse performance on the
  home page, where there was no headroom.

## Decision

Take the interactions, not the libraries.

- **Hero.** Badge, a two-line headline ("Hola, soy Juan," / "ingeniero" plus the rotating role),
  one plain sentence with the facts (since 2020; web apps, data, automations; the generating
  company; Barranquilla) and two buttons. Social links and the email moved to the contact
  section. The content stays centred, below Narcissus's face. The rotation is the reference's
  mechanism with a CSS `translate` per role and a few lines of script; screen readers and search
  get the whole headline once from a hidden copy. Two departures: it makes one full turn and
  rests on the first role (moving content that never stops needs a pause control, WCAG 2.2.2),
  and it never starts under reduced motion. Centred text would leave a gap beside short roles,
  so the prefix closes it with a transform, never with layout, and nothing shifts (CLS).
  No entrance animation on the headline: it is the largest paint of the page.
- **Chat.** The same anatomy and behaviour as the reference, in this palette (candle ochre and
  verdigris glows instead of teal and magenta), on every page through the layout, and also
  opened from "Pregúntame" in the header. Written as plain DOM in TypeScript (3.1 kB gzip), not
  React, because it ships with every page; the old React island and the home section are gone.
  Turnstile loads the first time the panel opens. Answers are still written with `textContent`
  and only site paths become links (ADR 0017); the reference's link cards are built from those
  paths, titled from the command palette index, so there is no new endpoint and no markup from
  the model. Not taken: the logging consent veil (this chat stores nothing on the server) and
  post-answer suggestions (the model does not produce them).
- **Project cards.** Featured projects get the wide card (kind and period, title, summary,
  a button, up to three figures, a leaning screen); the rest share a grid of smaller cards.
  One link per card, the title, stretched over the card, so the accessible name is the project.
  Tilt and light follow a fine pointer from one small script; the button fill, the label roll
  and the screen lift are CSS; the scroll reveal uses view timelines (as the rest of the site),
  and content is visible where they are not supported. Each effect owns one CSS property so they
  never fight. A cross-document view transition turns the card's screen into the project page's
  cover. Not taken: the custom cursor and smooth scrolling.
- **Images by convention.** `src/assets/projects/<slug>/card.*`, `cover.*` and `gallery-N.*` are
  picked up by name (`src/ui/project/media.ts`); images are presentation, so the domain and the
  content schema do not change. Without `card`, the card draws an app window from tokens (no
  request, both themes). Until the real screenshots arrive, covers and galleries are Unsplash
  photos marked `.stock` in the file name, labelled as illustrative on the page; a real file with
  the same name wins.
- **Weight.** Nothing new competes with the first paint. The ticker's few rules are in the
  shared stylesheet (in the home page's own styles they pushed them past the 4 kB that Astro
  inlines). The chat (9.3 kB) and card (5.7 kB) styles are separate files. The chat's styles and
  code are fetched 1.2 s after the load event (with a fast connection the load event comes
  before the first paint, so "after load" alone still competed with it), and the chat shows
  itself when both are in, close to the reference's two seconds; a header opener clicked earlier
  loads it at once. The card styles are fetched when the cards come within a screen of the
  viewport. The drawn screen is a few short elements styled from the card sheet, not Tailwind
  utilities, so the seven of them stay light in the HTML. The first version shipped all of it
  with the page: the shared stylesheet went from 48 kB to 68 kB and the home page HTML from 149
  kB to 167 kB, and the chat's script, Turnstile and both sheets were requested before the first
  paint. Lighthouse in CI measured FCP 2.4 s instead of 2.0 s on the home page and 2.0 s instead
  of 1.5 s on a project page, and the home page fell to 0.92. Now the shared stylesheet is 50 kB
  and the home page HTML 148 kB. JavaScript is at 74.2 kB of the 75 kB budget: the React island
  is gone, and the chat is split into a 1 kB starter and the code it loads later.

## Consequences

- The home page no longer has a chat section or a capability filter; the cards replace the
  editorial list. The e2e suite covers the rotation (and its absence under reduced motion), the
  cards, the floating chat (streaming, link cards, persistence across pages, rate limits, focus
  return on Escape, axe) and the image convention (unit tests).
- Styles and code for anything that is not on the first screen load after the page, like the
  chat's and the cards'. JavaScript has 0.8 kB of headroom left.
- Swapping a placeholder for a real screenshot is a file drop; the README in
  `src/assets/projects/` lists the stock photos and their authors.
