/**
 * POST /api/stripe/checkout
 * 
 * Creates a Stripe Checkout session for subscription upgrade.
 * Redirects user to Stripe's hosted payment page.
 * 
 * Request Body:
 *   { 
 *     plan?: 'monthly' | 'quarterly' | 'yearly',  // Plan selection
 *     priceId?: string                              // Or specific Stripe Price ID
 *   }
 * 
 * Response:
 *   { url: string } - Stripe Checkout URL to redirect to
 * 
 * Available Plans:
 *   - monthly: 1-month subscription
 *   - quarterly: 3-month subscription
 *   - yearly: 12-month subscription
 */

import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import Stripe from 'stripe'

// Plan name to config key mapping
const PLAN_CONFIG_MAP: Record<string, string> = {
  monthly: 'stripePriceIdMonthly',
  quarterly: 'stripePriceIdQuarterly',
  yearly: 'stripePriceIdYearly'
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  
  // Validate Stripe configuration
  if (!config.stripeSecretKey) {
    throw createError({
      statusCode: 500,
      message: 'Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.'
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
  
  // Get user profile for Stripe customer ID
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('email, stripe_customer_id')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    throw createError({
      statusCode: 404,
      message: 'User profile not found'
    })
  }

  // Initialize Stripe
  const stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: '2023-10-16'
  })

  try {
    // Get or create Stripe customer
    let customerId = profile.stripe_customer_id

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: {
          supabase_user_id: userId
        }
      })
      customerId = customer.id

      // Save customer ID to profile
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)
    }

    // Read request body for plan selection
    const body = await readBody(event)
    
    // Determine price ID from plan name, explicit priceId, or default
    let priceId: string | undefined
    
    if (body?.priceId) {
      // Explicit price ID provided
      priceId = body.priceId
    } else if (body?.plan && PLAN_CONFIG_MAP[body.plan]) {
      // Plan name provided - look up corresponding price ID
      const configKey = PLAN_CONFIG_MAP[body.plan] as keyof typeof config
      priceId = config[configKey] as string
      
      if (!priceId) {
        throw createError({
          statusCode: 400,
          message: `Price ID not configured for plan: ${body.plan}. Set the matching Stripe price ID environment variable.`
        })
      }
    } else {
      // Fall back to default price ID
      priceId = config.stripePriceIdDefault || config.stripePriceIdMonthly
    }

    if (!priceId) {
      throw createError({
        statusCode: 400,
        message: 'No price ID configured. Set a default Stripe price ID or specify a plan (monthly, quarterly, yearly).'
      })
    }

    // Determine return URLs
    const baseUrl = config.public.appUrl || getRequestURL(event).origin
    const successUrl = `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/subscription?canceled=true`

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          supabase_user_id: userId
        }
      }
    })

    return {
      url: session.url
    }

  } catch (e) {
    console.error('Stripe checkout error:', e)
    
    if (e instanceof Stripe.errors.StripeError) {
      throw createError({
        statusCode: 400,
        message: e.message
      })
    }

    throw createError({
      statusCode: 500,
      message: e instanceof Error ? e.message : 'Failed to create checkout session'
    })
  }
})
