/**
 * GET /api/stripe/plans
 * 
 * Returns available subscription plans with their details from Stripe.
 * Caches results for 15 minutes to reduce API calls.
 * 
 * Response:
 *   { plans: Array<{ id, name, price, currency, interval, intervalCount }> }
 */

import Stripe from 'stripe'

interface PlanDetails {
  id: string
  planKey: string
  name: string
  description: string
  price: number
  currency: string
  interval: string
  intervalCount: number
  features: string[]
}

// Cache for plan details (15 minutes)
let cachedPlans: PlanDetails[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION_MS = 15 * 60 * 1000 // 15 minutes

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Check if Stripe is configured
  if (!config.stripeSecretKey) {
    // Return static plan info without prices if Stripe not configured
    return {
      plans: getStaticPlans(),
      fromCache: false,
      stripeConfigured: false
    }
  }

  // Check cache
  const now = Date.now()
  if (cachedPlans && (now - cacheTimestamp) < CACHE_DURATION_MS) {
    return {
      plans: cachedPlans,
      fromCache: true,
      stripeConfigured: true
    }
  }

  // Initialize Stripe
  const stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: '2023-10-16'
  })

  try {
    // Get configured price IDs
    const priceIds = {
      monthly: config.stripePriceIdMonthly,
      semiannual: config.stripePriceIdSemiannual,
      yearly: config.stripePriceIdYearly
    }

    const plans: PlanDetails[] = []

    // Fetch each configured price from Stripe
    for (const [planKey, priceId] of Object.entries(priceIds)) {
      if (!priceId) continue

      try {
        const price = await stripe.prices.retrieve(priceId as string, {
          expand: ['product']
        })

        const product = price.product as Stripe.Product

        plans.push({
          id: price.id,
          planKey,
          name: getPlanDisplayName(planKey),
          description: product.description || getPlanDescription(planKey),
          price: (price.unit_amount || 0) / 100,
          currency: price.currency.toUpperCase(),
          interval: price.recurring?.interval || 'month',
          intervalCount: price.recurring?.interval_count || 1,
          features: getPlanFeatures(planKey)
        })
      } catch (e) {
        console.error(`Error fetching price ${priceId}:`, e)
      }
    }

    // Sort by interval count (monthly first, then semiannual, then yearly)
    plans.sort((a, b) => a.intervalCount - b.intervalCount)

    // Update cache
    cachedPlans = plans
    cacheTimestamp = now

    return {
      plans,
      fromCache: false,
      stripeConfigured: true
    }

  } catch (e) {
    console.error('Error fetching Stripe plans:', e)
    
    // Return static plans on error
    return {
      plans: getStaticPlans(),
      fromCache: false,
      stripeConfigured: true,
      error: 'Failed to fetch live pricing'
    }
  }
})

function getPlanDisplayName(planKey: string): string {
  const names: Record<string, string> = {
    monthly: 'Monthly',
    semiannual: '6 Months',
    yearly: 'Yearly'
  }
  return names[planKey] || planKey
}

function getPlanDescription(planKey: string): string {
  const descriptions: Record<string, string> = {
    monthly: 'Perfect for trying out TimeReward Pro',
    semiannual: 'Great savings for committed users',
    yearly: 'Best value - maximum savings'
  }
  return descriptions[planKey] || ''
}

function getPlanFeatures(planKey: string): string[] {
  // All plans include the same features
  const baseFeatures = [
    'Unlimited activity tracking',
    'Custom rewards and breaks',
    'Multi-device sync',
    'Detailed reports'
  ]

  const bonusFeatures: Record<string, string[]> = {
    monthly: [],
    semiannual: ['Save vs monthly'],
    yearly: ['Best value', 'Priority support']
  }

  return [...baseFeatures, ...(bonusFeatures[planKey] || [])]
}

function getStaticPlans(): PlanDetails[] {
  // Static placeholder plans for development/testing when Stripe is not configured.
  // These allow the UI to render without Stripe API calls.
  // In production, real prices are fetched from Stripe.
  return [
    {
      id: 'monthly',
      planKey: 'monthly',
      name: 'Monthly',
      description: 'Perfect for trying out TimeReward Pro',
      price: 9.99,
      currency: 'USD',
      interval: 'month',
      intervalCount: 1,
      features: getPlanFeatures('monthly')
    },
    {
      id: 'semiannual',
      planKey: 'semiannual',
      name: '6 Months',
      description: 'Best value for committed users',
      price: 49.99,
      currency: 'USD',
      interval: 'month',
      intervalCount: 6,
      features: getPlanFeatures('semiannual')
    },
    {
      id: 'yearly',
      planKey: 'yearly',
      name: 'Yearly',
      description: 'Maximum savings for long-term success',
      price: 89.99,
      currency: 'USD',
      interval: 'year',
      intervalCount: 1,
      features: getPlanFeatures('yearly')
    }
  ]
}
