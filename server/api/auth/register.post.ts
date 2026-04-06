/**
 * POST /api/auth/register
 *
 * Creates a new user via the appropriate Supabase auth flow.
 *
 * When NUXT_SKIP_EMAIL_CONFIRMATION=true (dev): create a pre-confirmed user via
 * the admin API so the account can sign in immediately.
 *
 * When NUXT_SKIP_EMAIL_CONFIRMATION=false: use the normal signup flow so
 * Supabase can send the confirmation email and complete the redirect through
 * /confirm after the user clicks the link.
 *
 * Body: { email, password, username, firstName, lastName }
 */

import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password, username, firstName, lastName } = body

  if (!email || !password || !username || !firstName) {
    throw createError({ statusCode: 400, message: 'email, password, username, and firstName are required' })
  }

  const config = useRuntimeConfig()
  const skipConfirmation = config.skipEmailConfirmation === 'true'
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedUsername = username.toLowerCase()
  const appUrl = (config.public.appUrl || getRequestURL(event).origin).replace(/\/$/, '')

  if (!skipConfirmation) {
    const supabase = await serverSupabaseClient(event)
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${appUrl}/confirm`,
        data: {
          first_name: firstName,
          last_name: lastName || '',
          username: normalizedUsername
        }
      }
    })

    if (error) {
      throw createError({ statusCode: error.status || 500, message: error.message })
    }

    return {
      success: true,
      userId: data.user?.id ?? null,
      emailConfirmed: Boolean(data.user?.email_confirmed_at || data.session)
    }
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data, error } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName || '',
      username: normalizedUsername
    }
  })

  if (error) {
    throw createError({ statusCode: error.status || 500, message: error.message })
  }

  return {
    success: true,
    userId: data.user.id,
    emailConfirmed: true
  }
})
