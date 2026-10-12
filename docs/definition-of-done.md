# Definition of done

A change is done when all of the following are true. The pull request template repeats this list.

1. `pnpm verify` passes: formatting, lint with zero warnings, type checks, architecture rules,
   unit tests with coverage at or above the thresholds, and the production build.
2. `pnpm test:e2e` passes on Chromium, WebKit and mobile, including axe accessibility checks.
3. Lighthouse budgets hold (CI): at least 95 in performance, best practices and SEO, 100 in
   accessibility.
4. Interactive UI covers loading, empty and error states, works with the keyboard alone and at a
   390 px viewport, and respects `prefers-reduced-motion`.
5. Spanish and English content and UI strings are updated together.
6. New behaviour has tests at the lowest level that can prove it (unit before e2e).
7. Endpoints validate input, return RFC 9457 problem details on errors, and log with a request ID.
8. Content contains no internal hostnames, IP addresses, real operational or invoice data, or
   personal data without consent.
9. Documentation is current; an architectural decision gets a new ADR.
10. The change was reviewed before merging (`/code-review` or a second pair of eyes).
