# Adding a project

Projects are content, not code. Adding one never touches `src/`.

## 1. Scaffold it

```bash
pnpm new:project report generation-kpis "Indicadores de generación" "Generation KPIs"
# or run `pnpm new:project` with no arguments and answer the prompts
```

Kinds:

| Kind          | Use it for                                | Kind-specific fields                                                 |
| ------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| `case-study`  | Systems where the decisions are the story | `problem`, `constraints`, `decisions` (with alternatives), `lessons` |
| `report`      | Power BI reports and dashboards           | `tool`, `businessQuestions`, `dataSources`, `highlightedMeasures`    |
| `open-source` | Public repositories                       | `repository`, `license`, `install`                                   |
| `tool`        | Desktop apps, scripts and automations     | `platform`, `automates`                                              |

This creates `content/projects/<slug>/es.mdx` and `en.mdx` as a valid **draft** full of `TODO`
markers. Drafts show up in `pnpm dev` and never in a build.

## 2. Fill it in

- Replace every `TODO` in both languages. The body below the frontmatter is the narrative (MDX).
- `stack` names must exist in `content/technologies.yaml`. Add new technologies there first, under
  the capability they prove.
- Every metric needs a `source` a reviewer could ask about. Featured projects need at least one.
- Language-independent fields (kind, period, capabilities, stack, flags, links) must match in both
  files; only the text is translated.
- Images go next to the files in the same folder.

## 3. Respect the anonymization policy

Work done for an employer or client is `confidentiality: anonymized`: no internal hostnames,
IP addresses, people's names, real operational data or screenshots of real data. Recreate
screenshots with fictitious data and redraw diagrams. The content tests reject IPs, internal
hostnames, network paths and private keys.

## 4. Publish it

Set `status: published` (and `featured: true` plus `order` if it belongs on the home page).
`pnpm test` refuses a published project that still contains `TODO`.

## What checks it

| When                 | Check                                                                    |
| -------------------- | ------------------------------------------------------------------------ |
| `astro sync` / build | Zod shape of each file plus the domain rules (`validateProjectContent`)  |
| `pnpm test`          | Translation parity, catalog references, TODO on published, anonymization |
| CI                   | All of the above on every pull request                                   |
