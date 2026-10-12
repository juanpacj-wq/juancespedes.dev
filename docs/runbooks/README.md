# Runbooks

Step-by-step procedures for known operational situations.

| Runbook                            | When                                                     |
| ---------------------------------- | -------------------------------------------------------- |
| [deploy.md](deploy.md)             | First-time Cloudflare setup, normal deploys and rollback |
| [contact-form.md](contact-form.md) | Contact messages fail or stop arriving                   |

## Template

```markdown
# <Situation>

## Symptoms

What alerts or reports trigger this runbook.

## Diagnosis

Commands and dashboards to confirm the cause.

## Fix

Numbered steps. Each step says how to verify it worked.

## Afterwards

What to record (postmortem notes, follow-up issues).
```
