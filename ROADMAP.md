# Roadmap

Things that are **not** being built right now. `README.md` describes what the
system does today; this file keeps ideas that have been asked for but not
started, with enough context that nobody has to rediscover the reasoning.

**Adding an item:** a title, what was asked for, a rough cost, and the open
questions or objections. Cost scale: **S** = a day, **M** = a week,
**L** = a month+ and new permanent complexity in the stack.

---

## Expiry email notifications

**Asked for:** an email whenever something on an AED is about to expire, so
nothing lapses unnoticed.

**Cost:** M

### What expires

Each `Device` (`apps/api/prisma/schema.prisma`) already carries the dates:

- `batteryExpirationDate`
- `padsExpirationDate`
- `nextInspectionDue`

The admin UI already classifies them with `expiryStatus()` in
`packages/shared` — **warning** under 90 days, **critical** under 30 days or
past due. The emails should reuse those same thresholds so the inbox and the
badges never disagree.

### Rough shape

- **Scheduler:** a daily job in the API (`@nestjs/schedule`), or a one-shot
  `notify` command in the api image run by host cron — the latter keeps the
  long-running api stateless and is easy to trigger by hand.
- **One digest per run, not one mail per item:** group by location, most
  urgent first, with a link to each device in the admin panel.
- **No repeats:** send when an item *crosses* a threshold (e.g. 90 → 30 → 7 →
  0 days → expired), not every day it stays inside one. Needs a small
  `ExpiryNotification` table (device, field, threshold, sentAt), and a reset
  when the date is edited (pads replaced → new date → fresh cycle).
- **Recipients:** active users only. Default all ADMINs; maybe a per-user
  opt-in toggle on the Users page later.
- **Config (`.env.prod`):** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
  `SMTP_PASSWORD`, `SMTP_FROM`; feature disabled when `SMTP_HOST` is unset so
  existing deployments keep working. Sent with `nodemailer`.

### Open questions

- **Self-hosting vs. deliverability:** the stack is deliberately self-hosted,
  but running our own mail server means SPF/DKIM/DMARC, IP reputation and mail
  landing in spam. A plain SMTP relay (the domain's mail provider, Mailgun,
  SES…) configured through the env vars above is far more reliable — decide
  which is acceptable before building.
- **Which thresholds:** is 90/30/7/0 days right for batteries and pads, which
  are usually ordered weeks ahead?
- **Failure visibility:** if SMTP is misconfigured, nobody gets the mail and
  nobody knows. At minimum log loudly; ideally show "last digest sent / last
  error" somewhere in the admin panel.
- **Test path:** a "send test email" button or CLI command, so the config can
  be verified on deploy instead of waiting for something to expire.
