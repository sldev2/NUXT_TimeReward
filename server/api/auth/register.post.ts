/**
 * POST /api/auth/register
 *
 * Creates a new user via the admin API (service role key).
 * This bypasses GoTrue's email validation and confirmation email sending,
 * which can fail due to rate limits or delivery issues on the free tier.
 *
 * When NUXT_SKIP_EMAIL_CONFIRMATION=true (dev): user is created pre-confirmed
 * and can sign in immediately.
 *
 * When NUXT_SKIP_EMAIL_CONFIRMATION=false (production): user is created
 * unconfirmed. Supabase sends a confirmation email; user must verify before
 * signing in. The response includes emailConfirmed: false so the client
 * can show an appropriate message.
 *
 * The on_auth_user_created database trigger handles profile/settings creation.
 *
 * Body: { email, password, username, firstName, lastName }
 */

import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password, username, firstName, lastName } = body

  if (!email || !password || !username || !firstName) {
    throw createError({ statusCode: 400, message: 'email, password, username, and firstName are required' })
  }

  const config = useRuntimeConfig()
  const skipConfirmation = config.skipEmailConfirmation === 'true'

  const supabase = serverSupabaseServiceRole(event)

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: skipConfirmation,
    user_metadata: {
      first_name: firstName,
      last_name: lastName || '',
      username: username.toLowerCase()
    }
  })

  if (error) {
    throw createError({ statusCode: error.status || 500, message: error.message })
  }

  return {
    success: true,
    userId: data.user.id,
    emailConfirmed: skipConfirmation
  }
})
