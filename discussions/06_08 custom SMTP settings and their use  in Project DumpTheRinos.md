# Email Configuration Overview

The app uses **two separate email pathways**, both powered by [Resend](https://resend.com):

## 1. Supabase Auth Emails (SMTP relay)

Configured in `.env.example`:

```
# Email delivery (Resend via Supabase Auth) ------------------------------------
# Supabase treats the password field as your Resend API key (Full Access or Email: Send).
RESEND_SMTP_HOST=smtp.resend.com
RESEND_SMTP_PORT=587
RESEND_SMTP_USERNAME=resend
RESEND_SMTP_PASSWORD=replace-with-resend-api-key
```

These SMTP vars are for **Supabase's built-in auth emails** (email confirmations, magic links). Supabase sends these itself via SMTP — you provide Resend credentials in the Supabase dashboard's "SMTP Settings" panel, not in your app code directly.

## 2. Transactional Queue (Resend HTTP API)

```
# Transactional queue automation (Resend API) ---------------------------------
RESEND_API_KEY=
EMAIL_FROM_ADDRESS=notifications@dumptherinos.com
EMAIL_FROM_NAME=DumpTheRINOs Notifications
EMAIL_AUTOMATION_ENABLED=false
EMAIL_DISPATCH_INTERVAL_MS=60000
```

This powers the app's **own email queue system** — event notifications, RSVP confirmations, reminders, cancellations, mutual contact unlocks, and password resets. It uses the Resend HTTP API directly (not SMTP).

---

## How They're Used in Code

| Component | File | Purpose |
|-----------|------|---------|
| **Queue dispatcher** | `server/plugins/email-dispatcher.ts` | Nitro plugin that polls email queues every N ms and sends pending emails |
| **Delivery service** | `server/services/EmailDeliveryService.ts` | Renders and sends queued event/user emails via `Resend` SDK |
| **Password reset** | `server/services/AccountRecoveryService.ts` | Sends reset emails immediately (not queued) via `Resend` SDK |
| **Config wiring** | `nuxt.config.ts` lines 32-36 | Reads env vars into runtime config |

---

## Summary

- **No raw SMTP is used by the app code itself** — Resend's HTTP API (`new Resend(apiKey)`) handles all app-generated emails.
- The `RESEND_SMTP_*` vars exist only as documentation/reference for configuring **Supabase's dashboard SMTP settings** (so Supabase can send auth emails through Resend's SMTP relay).
- The app has no UI for customer SMTP settings — it's all server-side env configuration.
- Email automation is **off by default** (`EMAIL_AUTOMATION_ENABLED=false`).
