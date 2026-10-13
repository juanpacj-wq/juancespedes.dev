# 0016. Command palette without a UI framework

- Status: accepted
- Date: 2026-10-12

## Context

A Ctrl+K palette lets a reader jump to any project, note or page and run a few actions (theme,
language, copy the email) without hunting through sections. The plan assumed a React island. Two
facts pushed back: the palette is in the header of every page, and most pages load no React at
all; shipping the React runtime to all of them would cost about 65 kB of the 75 kB JavaScript
budget for one dialog.

## Decision

- **Native `<dialog>` plus a small DOM script**, like the theme switch (ADR 0009). `showModal()`
  gives the focus trap, Escape and the backdrop; the script handles search, keys and actions. It
  is inlined by Astro and covered by the CSP hashes, so the bundle did not grow (69.7 kB).
- **WAI-ARIA combobox pattern.** The input keeps focus (`role="combobox"`,
  `aria-activedescendant`), options live in a `role="listbox"`, arrows move and wrap, Enter opens,
  Escape closes and focus returns to whatever opened the palette. Safari does not focus buttons on
  click, so the trigger passes itself explicitly.
- **The index is data built at build time**, `/palette/es.json` and `/palette/en.json`: pages,
  every visible project (with its stack and capabilities as keywords) and every note (with its
  topics), plus actions. It is fetched on first open, so pages do not carry it.
- **Plain ranking instead of a fuzzy-search library**: accent- and case-insensitive; a label prefix
  beats a word start, which beats a substring, which beats a keyword; every word must match. With a
  few dozen items this is predictable and testable, and it costs a few hundred bytes.
- **Discoverable without the shortcut**: a "Buscar / Search" button in the header (with the Ctrl K
  hint on wide screens) opens the same dialog on touch devices. `/` also opens it when the reader
  is not typing.

## Consequences

- A new project or note appears in the palette with no code change, through the same content.
- If the index grows to hundreds of items, the ranking and the single JSON file should be
  revisited.
