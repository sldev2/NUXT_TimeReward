# Turnstile Code in the App

## Configuration

- **Env vars:** `TURNSTILE_SITE_KEY` (public) and `TURNSTILE_SECRET_KEY` (server-only) — wired in `nuxt.config.ts` lines 29-30, exposed at lines 96 and 124.

## Client-Side

| File | Role |
|------|------|
| `composables/useTurnstile.ts` | Composable that manages the Cloudflare Turnstile widget lifecycle — explicit render into a container, token retrieval, reset, expiry check, cleanup on unmount. |
| `pages/login.vue` | Renders widget into `#turnstile-login`, sends token with login request. |
| `pages/register/index.vue` | Passes Turnstile token to `submitRegistration()` → `register()`. |
| `components/auth/ConfirmationStep.vue` | Registration's final step — renders the widget and gates the submit button on token availability. |

## Server-Side

| File | Role |
|------|------|
| `server/utils/turnstile.ts` | Core utility — `verifyTurnstileToken()` POSTs to Cloudflare's `siteverify` endpoint; `getClientIpFromEvent()` extracts client IP from proxy headers; `verifyTurnstileFromEvent()` convenience wrapper. **Fail-closed** (denies if secret key missing or token absent). |
| `server/api/auth/login.post.ts` | Calls `verifyTurnstileFromEvent()` before authenticating. |
| `server/api/auth/register.post.ts` | Calls `verifyTurnstileFromEvent()` before creating account. |
| `server/api/auth/recover/index.post.ts` | Calls `verifyTurnstileFromEvent()` before issuing password reset. |
| `server/api/auth/recover/complete.post.ts` | Calls `verifyTurnstileFromEvent()` before completing password reset. |

## Summary

Turnstile protects **4 server endpoints** (login, register, password reset request, password reset completion). The client composable handles widget rendering/lifecycle, and the server utility does the Cloudflare API verification with fail-closed semantics.
