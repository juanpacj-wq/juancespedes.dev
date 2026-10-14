# Project images

Images for each project, picked up by file name (`src/ui/project/media.ts`):

- `card.*`: screenshot shown on the home page card. Without it the card draws a placeholder.
- `cover.*`: wide image under the title of the project page.
- `gallery-1.*`, `gallery-2.*`...: screenshots in the project page's "solution" gallery, in order.
- `captions.json`: what each image shows, in Spanish and English, plus an optional `frame`
  (`browser`, `phone` or `none` for images that bring their own window). The caption is also the
  image's text alternative; the build fails if one language is missing.

```json
{ "gallery-1": { "es": "Menú en un teléfono", "en": "The menu on a phone", "frame": "phone" } }
```

Any of avif, webp, png or jpg. Astro resizes and converts them at build time, so drop the
original (1600 px wide or more). Screenshots of internal systems must be recreated or
anonymized first (see `CLAUDE.md`): no faces, no real names, emails or phone numbers, no real
operational figures and no term on the content denylist. How the current captures were taken and
redacted: [ADR 0022](../../../docs/adr/0022-real-screenshots-and-gallery.md).

## Stock placeholders

A file whose name ends in `.stock` (`cover.stock.webp`) is a stand-in photo. Project pages never
show one: a generic photo says nothing about the product, so the page draws the app window
instead (ADR 0021). Every project now has real captures, so none remain; if a new project needs a
stand-in, list its source and license here and delete it when the real image arrives.
