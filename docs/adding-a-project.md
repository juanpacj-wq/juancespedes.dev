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
| `report`      | Power BI reports and dashboards           | `tool`, `businessQuestions`, `dataSources`, `highlightedMeasures`                                |
| `open-source` | Public repositories                       | `repository`, `license`, `install`                                                               |
| `tool`        | Desktop apps, scripts and automations     | `platform`, `automates`                                                                          |

This creates `content/projects/<slug>/es.mdx` and `en.mdx` as a valid **draft** full of `TODO`
markers. Drafts show up in `pnpm dev` and never in a build.

## 2. Fill it in

- Replace every `TODO` in both languages. The page is built from the frontmatter only; the MDX
  body is not rendered (see ADR 0011).
- `stack` names must exist in `content/technologies.yaml`. Add new technologies there first, under
  the capability they prove.
- Every metric needs a `source` a reviewer could ask about. Featured projects need at least one.
- Language-independent fields (kind, period, capabilities, stack, flags, links) must match in both
  files; only the text is translated.
- Images go next to the files in the same folder.

### Case studies

The page follows a fixed template, in this order: summary, problem, my role (`responsibilities`),
constraints, decisions (each with the `alternatives` that were ruled out), architecture, results
(`outcomes`, with the figures in `metrics`), what I would do differently (`lessons`) and stack.

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

Set `status: published` (and `featured: true` plus `order` if it belongs on the home page).
`pnpm test` refuses a published project that still contains `TODO`.

## What checks it

| When                 | Check                                                                    |
| -------------------- | ------------------------------------------------------------------------ |
| `astro sync` / build | Zod shape of each file plus the domain rules (`validateProjectContent`)  |
| `pnpm test`          | Translation parity, catalog references, TODO on published, anonymization |
| `pnpm test:e2e`      | Every project page renders the template in both languages, with hreflang |
| `pnpm build`         | Generates the project's Open Graph cards and adds it to the sitemap      |
| CI                   | All of the above on every pull request                                   |
