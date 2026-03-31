/**
 * POST /api/stripe/update-subscription
 * 
 * Manually syncs subscription status from Stripe.
 * Use this to refresh subscription status if webhook was missed.
 * 
 * Response:
 *   { success: true, subscriptionStatus: string, redirectPath?: string }
 */

import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Validate Stripe configuration
  if (!config.stripeSecretKey) {
    throw createError({
      statusCode: 500,
      message: 'Stripe is not configured'
    })
  }

  // Get authenticated user
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - must be logged in'
    })
  }

  // serverSupabaseUser returns JWT payload where user ID is in 'sub' field, not 'id'
  const userId = (user as any).sub || user.id
  if (!userId) {
    throw createError({
      statusCode: 500,
      message: 'Could not determine user ID from session'
    })
  }

  const supabase = await serverSupabaseClient(event)

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('stripe_customer_id, subscription_status, trial_end')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    throw createError({
      statusCode: 404,
      message: 'User profile not found'
    })
  }

  // If no Stripe customer ID, check trial status
  if (!profile.stripe_customer_id) {
    const trialEnd = profile.trial_end ? new Date(profile.trial_end) : null
    const isTrialExpired = trialEnd && trialEnd < new Date()

    if (isTrialExpired && profile.subscription_status === 'trial') {
      // Update to expired
      await supabase
        .from('user_profiles')
        .update({ subscription_status: 'expired' })
        .eq('id', userId)

      return {
        success: true,
        subscriptionStatus: 'expired',
        redirectPath: '/subscription/expired'
      }
    }

    return {
      success: true,
      subscriptionStatus: profile.subscription_status,
      redirectPath: profile.subscription_status === 'trial' ? '/home' : '/subscription/expired'
    }
  }

  // Check Stripe for current subscription status
  const stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: '2023-10-16'
  })

  try {
    // Get customer's subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'all',
      limit: 1
    })

    let newStatus: string
    let redirectPath: string

    if (subscriptions.data.length === 0) {
      // No subscription, check trial
      const trialEnd = profile.trial_end ? new Date(profile.trial_end) : null
      const isTrialExpired = trialEnd && trialEnd < new Date()
      newStatus = isTrialExpired ? 'expired' : 'trial'
      redirectPath = isTrialExpired ? '/subscription/expired' : '/home'
    } else {
      const subscription = subscriptions.data[0]
      
      switch (subscription.status) {
        case 'active':
        case 'trialing':
          newStatus = 'active'
          redirectPath = '/home'
          break
        case 'canceled':
          newStatus = 'canceled'
          redirectPath = '/subscription/expired'
          break
        case 'past_due':
        case 'unpaid':
          newStatus = 'expired'
          redirectPath = '/subscription/expired'
          break
        default:
          newStatus = 'trial'
          redirectPath = '/home'
      }
    }

    // Update profile if status changed
    if (newStatus !== profile.subscription_status) {
      await supabase
        .from('user_profiles')
        .update({ subscription_status: newStatus })
        .eq('id', userId)
    }

    return {
      success: true,
      subscriptionStatus: newStatus,
      redirectPath
    }

  } catch (e) {
    console.error('Error checking Stripe subscription:', e)
    
    if (e instanceof Stripe.errors.StripeError) {
      throw createError({
        statusCode: 400,
        message: e.message
      })
    }

    throw createError({
      statusCode: 500,
      message: e instanceof Error ? e.message : 'Failed to check subscription'
    })
  }
})
