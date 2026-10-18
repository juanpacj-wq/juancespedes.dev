# Adding a project

Projects are content, not code. Adding one never touches `src/`.

## 1. Scaffold it

```bash
pnpm new:project report generation-kpis "Indicadores de generación" "Generation KPIs"
# or run `pnpm new:project` with no arguments and answer the prompts
```

Kinds:

| Kind          | Use it for                                | Kind-specific fields                                                                             |
| ------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `case-study`  | Systems where the decisions are the story | `problem`, `responsibilities`, `constraints`, `decisions`, `architecture`, `outcomes`, `lessons` |
| `report`      | Power BI reports and dashboards           | `tool`, `businessQuestions`, `dataSources`, `highlightedMeasures`, `liveReport`                  |
| `open-source` | Public repositories                       | `repository`, `license`, `install`                                                               |
| `tool`        | Desktop apps, scripts and automations     | `platform`, `automates`                                                                          |

`liveReport` is the "Publish to web" link of a replica with test data
(`https://app.powerbi.com/view?r=...`), or `null`. The page draws a facade and loads the report
only when the visitor clicks it, so the frame never weighs on the first load; never publish a
report with real data, since anyone with the link can open it.

This creates `content/projects/<slug>/es.mdx` and `en.mdx` as a valid **draft** full of `TODO`
markers. Drafts show up in `pnpm dev` and never in a build.

## 2. Fill it in

- `name` is the short form of the title (32 characters at most) that the header's projects menu
  lists; the scaffold starts it as the title cut short.
- Replace every `TODO` in both languages. The page is built from the frontmatter only; the MDX
  body is not rendered (see ADR 0011).
- `stack` names must exist in `content/technologies.yaml`. Add new technologies there first, under
  the capability they prove.
- Every metric needs a `source` a reviewer could ask about. Featured projects need at least one.
- Language-independent fields (kind, period, capabilities, stack, flags, links) must match in both
  files; only the text is translated.
- Images go next to the files in the same folder.

### Case studies

The page follows a fixed template, in this order: summary, at a glance (`story.hook` and the
`metrics`), problem (with the `story.shifts`), my role (`responsibilities`), constraints,
decisions (each with the `alternatives` that were ruled out), architecture, results (`outcomes`),
what I would do differently (`lessons`) and stack ([ADR 0021](adr/0021-case-study-redesign.md)).

`story` tells the problem for a reader who is not an engineer. Write it as the people who lived
the problem would say it, with facts already in the file and no jargon:

```yaml
story:
  hook: Every shift ended with someone copying Excel cells by hand to put together the report.
  shifts: # one to four; each "before" pairs with its "after"
    - before: The official daily report was assembled by copying cells.
      after: The report comes straight from the data, in the template's exact format.
```

The architecture diagram is data, not an image:

```yaml
architecture:
  summary: One or two sentences; it is also the diagram's text alternative.
  layers: # left to right on wide screens, at least two
    - name: Sources
      nodes:
        - { id: meters, label: 'Energy meters', detail: 'Modbus TCP every 2 s' }
    - name: Processing
      nodes:
        - { id: poller, label: 'Meter reader', detail: null }
  flows:
    - { from: meters, to: poller, label: 'Readings every 2 s' }
```

Node ids are kebab-case, unique and identical in both languages; flows must point at existing ids.
Quote labels that contain commas or colons.

## 3. Respect the anonymization policy

Work done for an employer or client is `confidentiality: anonymized`: no internal hostnames,
IP addresses, people's names, real operational data or screenshots of real data. Recreate
screenshots with fictitious data and redraw diagrams. The content tests reject IPs, internal
hostnames, network paths, private keys and the em dash. Names of internal systems, vendors and
people are checked against a private denylist: `.content-denylist` locally (git-ignored) and the
`CONTENT_DENYLIST` secret in CI. Add any new internal name there, never in the repository.

## 4. Publish it

A published project gets two pages, `/proyectos/<slug>` and `/en/projects/<slug>`, an Open
Graph card per language and its place in `sitemap.xml`, all without touching code.

Set `status: published`. `track` puts it under one of the three areas of the home page
(`full-stack`, `analytics` or `automation`), and `order` sets its place inside that area.
`pnpm test` refuses a published project that still contains `TODO`.

## 5. Add its images (optional)

Drop them in `src/assets/projects/<slug>/`: `card.*` for the screenshot on the home page card,
`cover.*` for the wide image on the project page and `gallery-1.*`, `gallery-2.*`... for more.
They are found by name, no code or front matter to touch; a card without `card.*` draws a
placeholder, and a project page without a real `cover.*` draws the same app window. Gallery
images get a caption in both languages in `captions.json`, and the page adds a "solution" chapter
with them ([ADR 0022](adr/0022-real-screenshots-and-gallery.md)). Screenshots
of internal systems follow the anonymization policy above. Details and the stock-photo
convention: `src/assets/projects/README.md`.

## What checks it

| When                 | Check                                                                    |
| -------------------- | ------------------------------------------------------------------------ |
| `astro sync` / build | Zod shape of each file plus the domain rules (`validateProjectContent`)  |
| `pnpm test`          | Translation parity, catalog references, TODO on published, anonymization |
| `pnpm test:e2e`      | Every project page renders the template in both languages, with hreflang |
| `pnpm build`         | Generates the project's Open Graph cards and adds it to the sitemap      |
| CI                   | All of the above on every pull request                                   |
