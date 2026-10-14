# 0022. Real screenshots in case studies, and a gallery that shows them in context

- Status: accepted
- Date: 2026-10-14
- Amends: [0021](0021-case-study-redesign.md) (the page gains a "solution" chapter)

## Context

After the redesign in 0021, case studies still showed the product only as a drawn app window. The
owner asked for real screenshots of each solution and a livelier way to show them. Most of the
work runs inside an employer's network and is anonymized, so a screenshot can leak exactly what the
text is careful to leave out: people, internal names, real operational data.

## Decision

**Where screenshots come from, per project.** Each image is taken from the running product or from
the project's own verification captures, never mocked up:

- Public work (the corporate portal) is captured from the live site and from the project's own
  Figma-versus-build comparisons.
- Internal work runs with fictitious data, never production data:
  - the forum platform from its production build with a fictitious attendee;
  - the invoice extractor from its desktop window, without loading any invoice;
  - the MCP server from its own test suites (real terminal output, rendered as a window);
  - the plant telemetry dashboard's frontend, with every API call and the live feed answered by
    the capture script with generated readings;
  - the shift logbook against a throwaway SQL Server container: the server builds its schema and
    seed from scratch, a synthetic session (the project's own test backdoor, never enabled in
    production) writes a few invented entries, and the container is deleted afterwards;
  - the invoice pipeline from the orchestrator's own run history, which holds task names, states
    and durations but no invoice data.

**What a capture must not show.** No faces, no real names, emails or phone numbers, no real
operational figures, and no term on the content denylist (0011). Captures are redacted at the
source, not by painting over the image: a fictitious session instead of a real one, injected
styles that hide a private brand during the capture only, anonymized labels in a selector, crops
that stop before a private name. The owner reviews the set before publishing.

**Captions are content, kept next to the images.** `src/assets/projects/<slug>/captions.json` gives
each image a caption in both languages, used as its text alternative too, and an optional `frame`.
The build fails on a caption missing a language or an unknown frame. Images stay out of the domain
and the content schema, as before.

**The gallery.** A "solution" chapter after the problem, only when a project has real screenshots:

- Each image sits in the frame where it runs: a browser window for wide captures, a phone for tall
  ones, none for images that bring their own window (a terminal, a desktop app).
- The slides form a row that snaps to the centre, so it works by swipe and keyboard without
  JavaScript. The case study script adds tabs with a progress bar that advances every six seconds
  while the gallery is on screen and nobody points at or focuses it, and an enlarged view in a
  native dialog (Escape, arrows, focus handling for free). Reduced motion turns the advance off.
- Slides away from the centre step back slightly with a scroll-driven animation: the frame
  shrinks and only the picture dims, so the address bar and the caption keep full contrast.

A real `cover.*` replaces the drawn window on the stage at the top of the page, and `card.*` the one
on the home page card. Stock photos of a project are deleted once its real images exist.

## Consequences

- All seven cases show the real product. People, units and plant names in the captures are
  replaced at capture time (names in the page text, logos hidden by an injected style).
- Every new screenshot needs a caption in both languages, which doubles as its alternative text.
- Captures are larger than the drawn window. They load lazily below the fold, the enlarged view
  loads one WebP on demand, and the hero cover is the only eager image.
