# Architecture

## System context (C4 level 1)

```mermaid
flowchart LR
  visitor([Visitor<br/>recruiter or client])
  owner([Owner<br/>edits content via git])
  site[[juancespedes.dev]]
  email[(Email provider)]
  ai[(Claude API)]
  gh[(GitHub<br/>repo and CI)]

  visitor -- reads, filters projects, sends a message, asks the chat --> site
  owner -- pushes content and code --> gh
  gh -- builds, tests, deploys --> site
  site -- delivers contact messages --> email
  site -- answers questions about the work (F7) --> ai
```

## Containers (C4 level 2)

```mermaid
flowchart TB
  subgraph cf[Cloudflare]
    assets[Static assets<br/>prerendered HTML, CSS, images]
    worker[Worker<br/>/api/health, /api/contact, /api/chat]
  end
  browser[Browser<br/>HTML + React islands]
  browser --> assets
  browser --> worker
  worker --> email[(Email provider)]
  worker --> ai[(Claude API)]
```

## Layers inside the code

```mermaid
flowchart RL
  pages[pages<br/>routes and endpoints] --> composition
  pages --> ui
  composition --> infrastructure
  composition --> application
  infrastructure --> application
  application --> domain
  ui --> domain
  infrastructure --> domain
```

Arrows point in the direction of allowed imports. The rule is explained in
[ADR 0001](adr/0001-layered-architecture.md) and enforced by ESLint and dependency-cruiser.
The current module graph is generated with `pnpm arch:graph` into
[`dependency-graph.mmd`](dependency-graph.mmd).

## Request flow example: `GET /api/health`

1. `src/pages/api/health.ts` (pages) asks the container for `getHealthStatus`.
2. `src/composition/container.ts` built it with the `systemClock` adapter and the validated
   `APP_VERSION` from `astro:env`.
3. `src/application/use-cases/get-health-status.ts` produces the report using only the `Clock`
   port, so its test uses a fixed clock.
