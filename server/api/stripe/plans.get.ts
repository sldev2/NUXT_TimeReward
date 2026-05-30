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



const PLAN_ORDER = ['monthly', 'quarterly', 'yearly'] as const



const PLAN_PRICE_CONFIG_KEYS: Record<(typeof PLAN_ORDER)[number], 'stripePriceIdMonthly' | 'stripePriceIdQuarterly' | 'stripePriceIdYearly'> = {

  monthly: 'stripePriceIdMonthly',

  quarterly: 'stripePriceIdQuarterly',

  yearly: 'stripePriceIdYearly'

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

    const plans: PlanDetails[] = []



    // Fetch each configured price from Stripe (monthly → quarterly → yearly)

    for (const planKey of PLAN_ORDER) {

      const configKey = PLAN_PRICE_CONFIG_KEYS[planKey]

      const priceId = config[configKey] as string | undefined

      if (!priceId) continue



      try {

        const price = await stripe.prices.retrieve(priceId, {

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



    sortPlans(plans)



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



function sortPlans(plans: PlanDetails[]) {

  plans.sort((a, b) => PLAN_ORDER.indexOf(a.planKey as typeof PLAN_ORDER[number]) - PLAN_ORDER.indexOf(b.planKey as typeof PLAN_ORDER[number]))

}



function getPlanDisplayName(planKey: string): string {

  const names: Record<string, string> = {

    monthly: 'Monthly',

    quarterly: 'Quarterly',

    yearly: 'Yearly'

  }

  return names[planKey] || planKey

}



function getPlanDescription(planKey: string): string {

  const descriptions: Record<string, string> = {

    monthly: 'Perfect for trying out TimeReward Pro',

    quarterly: 'Balanced commitment with flexible billing',

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

    quarterly: ['Save vs monthly billing'],

    yearly: ['Best value', 'Priority support']

  }



  return [...baseFeatures, ...(bonusFeatures[planKey] || [])]

}



function getStaticPlans(): PlanDetails[] {

  // Static placeholder plans for development/testing when Stripe is not configured.

  const plans: PlanDetails[] = [

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

      id: 'quarterly',

      planKey: 'quarterly',

      name: 'Quarterly',

      description: 'Balanced commitment with flexible billing',

      price: 24.99,

      currency: 'USD',

      interval: 'month',

      intervalCount: 4,

      features: getPlanFeatures('quarterly')

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

  sortPlans(plans)

  return plans

}


