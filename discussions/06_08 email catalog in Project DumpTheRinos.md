# Email Catalog

| # | Purpose | Subject Line | Body Template (plaintext) |
|---|---------|-------------|---------------------------|
| 1 | **Email verification (signup)** | *(Supabase default: "Confirm your signup")* | Sent by Supabase Auth via SMTP relay on registration. Contains a confirmation link to `/register/verify-email?email=...`. Template is configured in the Supabase dashboard, not in app code. |
| 2 | **Resend verification** | *(Supabase default: "Confirm your signup")* | Same Supabase Auth template, re-triggered by `POST /api/auth/resend-verification`. |
| 3 | **Password reset (immediate)** | `Reset your DumpTheRINOs password` | Hi there,<br><br>We received a request to reset your password.<br><br>Reset your password by visiting: {resetUrl}<br><br>This link expires in {N} minutes.<br><br>If you didn't request a password reset, you can safely ignore this email. |
| 4 | **Password reset (queued)** | `Reset your DumpTheRINOs password` | Hi {name},<br><br>We received a request to reset your password.<br><br>Reset your password by visiting: {resetUrl}<br><br>This link expires in {N} minutes.<br><br>If you didn't request a password reset, you can safely ignore this email. |
| 5 | **RSVP confirmation** | `You're confirmed for {eventTitle}` | Hi {name},<br><br>You're confirmed for {eventTitle}.<br><br>When: {date/time}<br><br>Organizer: {organizer}<br><br>Manage your RSVP: {eventLink} |
| 6 | **RSVP creator notification** | `New RSVP for {eventTitle}` | Hi {name},<br><br>{attendee} just RSVPed Going to {eventTitle}.<br><br>When: {date/time}<br><br>Attendee email: {email}<br><br>Manage event: {eventLink} |
| 7 | **Event reminder** | `Reminder: {eventTitle} starts soon` | Hi {name},<br><br>Reminder: {eventTitle} starts soon.<br><br>When: {date/time}<br><br>Organizer: {organizer}<br><br>View details: {eventLink} |
| 8 | **Event cancellation** | `{eventTitle} has been cancelled` | Hi {name},<br><br>{eventTitle} has been cancelled.<br><br>Reason: {reason}<br><br>View details: {eventLink} |
| 9 | **Mutual contact unlocked** | `Mutual contact unlocked with {otherName}` | Hi {name},<br><br>You and {otherName} have unlocked mutual contact access.<br><br>You can reach them at {email}.<br><br>Connect from the member directory: {siteUrl}/discover |

---

## Notes

- Rows 1–2 are sent by **Supabase Auth** (SMTP relay to Resend). Templates live in the Supabase dashboard.
- Row 3 is sent **immediately** by `AccountRecoveryService` (not queued).
- Rows 4–9 are sent via the **transactional queue** (`event_email_queue` / `user_email_queue`) by `EmailDeliveryService`, dispatched on a polling interval.
- All app-sent emails (rows 3–9) use the same HTML wrapper: white card on gray background, DumpTheRINOs.com header in indigo, pill-shaped CTA button.
