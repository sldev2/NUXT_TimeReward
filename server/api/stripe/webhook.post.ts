/**
 * POST /api/stripe/webhook
 * 
 * Handles Stripe webhook events for subscription management.
 * 
 * Events handled:
 *   - checkout.session.completed - Subscription created via checkout
 *   - customer.subscription.created - New subscription
 *   - customer.subscription.updated - Subscription changed
 *   - customer.subscription.deleted - Subscription cancelled
 *   - invoice.payment_succeeded - Successful payment
 *   - invoice.payment_failed - Failed payment
 */

import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Validate Stripe configuration
  if (!config.stripeSecretKey || !config.stripeWebhookSecret) {
    throw createError({
      statusCode: 500,
      message: 'Stripe webhook is not configured'
    })
  }

  // Initialize Stripe
  const stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: '2023-10-16'
  })

  // Get raw body for signature verification
  const body = await readRawBody(event)
  if (!body) {
    throw createError({
      statusCode: 400,
      message: 'Missing request body'
    })
  }

  // Get Stripe signature header
  const signature = getHeader(event, 'stripe-signature')
  if (!signature) {
    throw createError({
      statusCode: 400,
      message: 'Missing Stripe signature'
    })
  }

  // Verify webhook signature
  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      body,
      signature,
      config.stripeWebhookSecret
    )
  } catch (e) {
    console.error('Stripe signature verification failed:', e)
    throw createError({
      statusCode: 400,
      message: 'Invalid signature'
    })
  }

  // Create admin Supabase client for updates
  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseSecretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  console.log(`Stripe webhook received: ${stripeEvent.type}`)

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session
        
        // Get user ID from metadata
        const userId = session.metadata?.supabase_user_id ||
          session.subscription
            ? (await stripe.subscriptions.retrieve(session.subscription as string))
                .metadata?.supabase_user_id
            : null

        if (userId && session.subscription) {
          // Update subscription status
          await supabase
            .from('user_profiles')
            .update({
              subscription_status: 'active',
              stripe_customer_id: session.customer as string
            })
            .eq('id', userId)

          console.log(`Checkout completed for user: ${userId}`)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id

        if (userId) {
          // Map Stripe status to our status
          let status: string
          switch (subscription.status) {
            case 'active':
            case 'trialing':
              status = 'active'
              break
            case 'canceled':
            case 'unpaid':
              status = 'canceled'
              break
            case 'past_due':
              status = 'expired'
              break
            default:
              status = 'trial'
          }

          await supabase
            .from('user_profiles')
            .update({ subscription_status: status })
            .eq('id', userId)

          console.log(`Subscription ${stripeEvent.type} for user: ${userId}, status: ${status}`)
        } else {
          // Try to find user by customer ID
          const customerId = subscription.customer as string
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single()

          if (profile) {
            let status = subscription.status === 'active' ? 'active' : 'canceled'
            await supabase
              .from('user_profiles')
              .update({ subscription_status: status })
              .eq('id', profile.id)
            
            console.log(`Subscription ${stripeEvent.type} for customer: ${customerId}`)
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by customer ID
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabase
            .from('user_profiles')
            .update({ subscription_status: 'canceled' })
            .eq('id', profile.id)

          console.log(`Subscription deleted for customer: ${customerId}`)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = stripeEvent.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Ensure subscription is active after successful payment
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id, subscription_status')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile && profile.subscription_status !== 'active') {
          await supabase
            .from('user_profiles')
            .update({ subscription_status: 'active' })
            .eq('id', profile.id)

          console.log(`Payment succeeded, reactivated subscription for customer: ${customerId}`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Mark as expired on payment failure
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabase
            .from('user_profiles')
            .update({ subscription_status: 'expired' })
            .eq('id', profile.id)

          console.log(`Payment failed for customer: ${customerId}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`)
    }

    return { received: true }

  } catch (e) {
    console.error('Error processing webhook:', e)
    throw createError({
      statusCode: 500,
      message: e instanceof Error ? e.message : 'Webhook processing failed'
    })
  }
})
