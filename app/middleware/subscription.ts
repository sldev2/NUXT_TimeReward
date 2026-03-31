/**
 * Subscription Middleware
 * 
 * Checks if the user has an active subscription or valid trial.
 * Redirects to subscription page if expired.
 * 
 * Features:
 *   - Trial bypass in development mode (TRIAL_BYPASS=true)
 *   - Checks trial_end date for trial users
 *   - Allows active/trial subscriptions
 *   - Blocks expired/canceled subscriptions
 * 
 * Usage in page:
 *   definePageMeta({ middleware: ['auth', 'subscription'] })
 */

export default defineNuxtRouteMiddleware(async (to) => {
  // Only run on client side
  if (import.meta.server) return

  const supabase = useHealthySupabaseClient()

  // Get session directly from Supabase (more reliable than useSupabaseUser during navigation)
  const { data: { session } } = await supabase.auth.getSession()
  
  // Skip if not authenticated (auth middleware should handle this)
  if (!session?.user) return
  
  const userId = session.user.id
  
  if (!userId) {
    console.warn('[Subscription] User ID not available, skipping subscription check')
    return
  }

  // Check for trial bypass in development
  const config = useRuntimeConfig()
  const isDev = import.meta.dev || process.env.NODE_ENV === 'development'
  const trialBypass = process.env.TRIAL_BYPASS === 'true' || 
                      config.public.trialBypass === 'true'

  if (isDev && trialBypass) {
    console.log('[Subscription] Trial bypass enabled in development mode')
    return
  }

  // Fetch user profile to check subscription status
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('subscription_status, trial_end')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    console.error('[Subscription] Error fetching profile:', error)
    // Allow access on error to avoid blocking users
    return
  }

  const { subscription_status, trial_end } = profile

  // Allow active subscriptions
  if (subscription_status === 'active') {
    return
  }

  // Check trial status
  if (subscription_status === 'trial') {
    const trialEndDate = trial_end ? new Date(trial_end) : null
    
    // Allow if trial is still valid
    if (trialEndDate && trialEndDate > new Date()) {
      return
    }

    // Trial expired - update status and redirect
    await supabase
      .from('user_profiles')
      .update({ subscription_status: 'expired' })
      .eq('id', userId)

    console.log('[Subscription] Trial expired, redirecting to subscription page')
    return navigateTo('/subscription/expired')
  }

  // Block expired/canceled subscriptions
  if (subscription_status === 'expired' || subscription_status === 'canceled') {
    console.log(`[Subscription] Status is ${subscription_status}, redirecting`)
    return navigateTo('/subscription/expired')
  }

  // Unknown status - allow access but log warning
  console.warn(`[Subscription] Unknown status: ${subscription_status}`)
})
