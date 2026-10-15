# 0027. Sharp screenshots, and phones and a tablet beside the desktop captures

- Status: accepted
- Date: 2026-10-15
- Amends: [0022](0022-real-screenshots-and-gallery.md) (sizes, quality and a new image slot)

## Context

The owner found the case study screenshots blurred. Two causes:

- The gallery's largest file was 1600 px for a frame that is 1024 px wide, so a 2x screen
  enlarged it. The encoders ran at their defaults (WebP 80, AVIF 50), which smear small type.
- Some sources were small to begin with: the Figma-versus-build comparison of the corporate portal
  was two panels in 1748 px, and captures were resized to 2400 px before being committed.

The owner also asked to show that the forum platform and the corporate portal are responsive,
with captures of their mobile versions.

## Decision

- **Sizes and quality in one place** (`src/ui/project/screenshots.ts`): wide captures reach
  2048 and 2400 px, `sizes` matches the 1024 px frame, and screenshots encode at AVIF 68 and
  WebP 86. The enlarged view loads the capture at its own width, up to 2880 px. The cover adds a
  2200 px candidate and keeps the default quality: it is the largest paint, and a heavier AVIF
  would cost the performance budget on every visit.
- **Captures at full size.** Desktop at 1440 x 900 with device scale 2, phones at 390 x 844 with
  device scale 3, tablets at 820 x 1180 with device scale 2, committed as WebP at quality 90
  without resizing (`src/assets/projects/README.md`). The Figma comparison left the gallery: no
  sharper copy exists, and the text still tells how pages were compared.
- **`mobile-N` images**, shown under the gallery by `ProjectScreens.astro`: the same product on
  phones and a tablet (new `tablet` frame), standing on one baseline, with an intro from the
  project's `captions.json` (`responsive`) that says what adapts. The devices wrap instead of
  scrolling, so the row needs no focus stop, and their addresses wait for the case study script
  like the gallery's. The phone captures that were gallery slides moved here.
- The same capture rules from 0022 hold: the forum runs with a fictitious session and its private
  brand hidden, the portal is captured from the live site with its promotional dialog closed, and
  no capture shows faces or a term on the content denylist (the portal's home page and one tablet
  section were left out for that reason).

## Consequences

- Screenshots are sharp on 2x screens; a 2x visitor downloads more bytes for each slide, after
  the page has loaded, never with it.
- A project shows `mobile-*` captures only when it is meant to be used on a phone; desktop tools
  and terminals keep the gallery alone.
