# Non-functional requirements

## Level

Production application (N2) with the frontend held to public-product standards (N3): anyone on the
internet can visit it and search ranking matters, but there are no user accounts, payments or
database.

| Area               | Level | Applies as                                                                   |
| ------------------ | ----- | ---------------------------------------------------------------------------- |
| Frontend           | N3    | Core Web Vitals in CI, full SEO, WCAG 2.2 AA, Spanish and English            |
| Backend (`/api/*`) | N2    | Input validation, RFC 9457 errors, rate limiting, timeouts                   |
| Quality            | N3    | Unit, content, integration, e2e, accessibility and performance gates         |
| Delivery           | N2    | CI on every change, preview per pull request, one-step rollback              |
| Observability      | N2    | Structured logs, error tracking, external uptime monitor                     |
| Privacy            | N2    | Privacy notice (Colombian Law 1581 of 2012) for the contact form; no cookies |

## Availability

- Usage: public, any time. Expected traffic: low (hundreds of visits per month).
- If the site is down for an hour, nothing is lost; potential contacts are delayed.
- **RPO:** not applicable, the site stores no data; the source of truth is git.
- **RTO:** 1 hour (redeploy the previous version or rebuild from git).

## Deliberately omitted

| Practice                              | Why it does not apply                                                       |
| ------------------------------------- | --------------------------------------------------------------------------- |
| Database, migrations, backups         | No persistent data. Contact messages are delivered by email and not stored. |
| Accounts, password flows, admin panel | No users. Content is edited through git.                                    |
| Multi-tenancy                         | Single owner.                                                               |
| Load testing                          | Static pages on a CDN; the two endpoints are rate limited.                  |
| Distributed tracing                   | A single worker; request IDs in logs are enough.                            |
| Feature flags service                 | Environment variables cover the only toggle needed (the chat kill switch).  |

## Personal data inventory

| Data                                      | Where                            | Purpose              | Retention                                                |
| ----------------------------------------- | -------------------------------- | -------------------- | -------------------------------------------------------- |
| Owner's name, email, photo, work history  | Public content                   | Portfolio            | While the site exists                                    |
| Visitor's name, email, message            | Contact form, delivered by email | Reply to the inquiry | Not stored by the site                                   |
| Testimonial authors' names and job titles | Public content                   | Social proof         | Published only with written approval; removed on request |
| Chat questions (phase F7)                 | Processed in memory              | Answer the question  | Not stored                                               |

Analytics are cookieless and aggregate (no personal data), so no consent banner is required.
