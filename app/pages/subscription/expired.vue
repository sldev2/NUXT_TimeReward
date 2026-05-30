<script setup lang="ts">
/**
 * Subscription Expired Page
 * 
 * Shown when user's trial or subscription has expired.
 * Displays available plans and allows user to select and upgrade.
 */

interface Plan {
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

definePageMeta({
  layout: 'auth',
  middleware: ['auth']
})

const { profile } = useAuth()
const loadingPlanKey = ref<string | null>(null)
const selectedPlan = ref<string>('monthly')
const error = ref<string | null>(null)

// Fetch available plans
const { data: plansData, pending: plansLoading } = await useFetch('/api/stripe/plans')

const plans = computed(() => plansData.value?.plans || [])

async function handleUpgrade(planKey: string) {
  selectedPlan.value = planKey
  loadingPlanKey.value = planKey
  error.value = null

  try {
    const { data, error: fetchError } = await useFetch('/api/stripe/checkout', {
      method: 'POST',
      body: { plan: planKey }
    })

    if (fetchError.value) {
      throw new Error(fetchError.value.message || 'Failed to create checkout session')
    }

    if (data.value?.url) {
      // Redirect to Stripe Checkout
      window.location.href = data.value.url
    } else {
      throw new Error('No checkout URL returned')
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'An error occurred'
    loadingPlanKey.value = null
  }
}

function formatPrice(plan: Plan): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: plan.currency
  })
  return formatter.format(plan.price)
}

function getBillingMonths(plan: Plan): number {
  if (plan.interval === 'year') {
    return 12 * (plan.intervalCount || 1)
  }
  if (plan.interval === 'month') {
    return plan.intervalCount || 1
  }
  return plan.intervalCount || 1
}

function getPricePerMonth(plan: Plan): string {
  const perMonth = plan.price / getBillingMonths(plan)
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: plan.currency
  })
  return formatter.format(perMonth)
}

function getBillingPeriodLabel(plan: Plan): string {
  if (plan.planKey === 'monthly') {
    return 'per month'
  }
  if (plan.planKey === 'quarterly') {
    return `billed every ${getBillingMonths(plan)} months`
  }
  if (plan.planKey === 'yearly') {
    return `${getPricePerMonth(plan)}/month`
  }
  if (plan.intervalCount > 1 || plan.interval === 'year') {
    return `${getPricePerMonth(plan)}/month`
  }
  return 'per month'
}

function isRecommended(plan: Plan): boolean {
  return plan.planKey === 'yearly'
}
</script>

<template>
  <div class="min-h-screen bg-slate-900 flex items-center justify-center p-4">
    <div class="max-w-4xl w-full">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 mx-auto mb-6 bg-amber-500/20 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-white mb-2">
          Choose Your Plan
        </h1>
        <p class="text-slate-400 max-w-md mx-auto">
          Your free trial has ended. Select a plan to continue using TimeReward Pro.
        </p>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
        <p class="text-sm text-red-400">{{ error }}</p>
      </div>

      <!-- Plans Loading -->
      <div v-if="plansLoading" class="flex justify-center py-12">
        <svg class="animate-spin h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>

      <!-- Plans Grid -->
      <div v-else class="grid md:grid-cols-3 gap-6 mb-8">
        <div
          v-for="plan in plans"
          :key="plan.id"
          :class="[
            'relative bg-slate-800 rounded-2xl p-6 border-2 transition-all duration-200 cursor-pointer',
            selectedPlan === plan.planKey 
              ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
              : 'border-slate-700 hover:border-slate-600'
          ]"
          @click="selectedPlan = plan.planKey"
        >
          <!-- Recommended Badge -->
          <div 
            v-if="isRecommended(plan)"
            class="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-semibold px-3 py-1 rounded-full"
          >
            Best Value
          </div>

          <!-- Plan Header -->
          <div class="text-center mb-4">
            <h3 class="text-xl font-bold text-white mb-1">{{ plan.name }}</h3>
            <p class="text-sm text-slate-400">{{ plan.description }}</p>
          </div>

          <!-- Price -->
          <div class="text-center mb-6">
            <div class="text-4xl font-bold text-white">
              {{ formatPrice(plan) }}
            </div>
            <div class="text-sm text-slate-400 mt-1">
              <span v-if="plan.planKey === 'yearly'">
                {{ getPricePerMonth(plan) }}/month
              </span>
              <span v-else-if="plan.planKey === 'quarterly'">
                {{ getPricePerMonth(plan) }}/month · {{ getBillingPeriodLabel(plan) }}
              </span>
              <span v-else>
                {{ getBillingPeriodLabel(plan) }}
              </span>
            </div>
          </div>

          <!-- Features -->
          <ul class="space-y-2 mb-6">
            <li 
              v-for="feature in plan.features" 
              :key="feature"
              class="flex items-start text-sm text-slate-300"
            >
              <svg class="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              {{ feature }}
            </li>
          </ul>

          <!-- Subscribe Button -->
          <button
            @click.stop="handleUpgrade(plan.planKey)"
            :disabled="loadingPlanKey !== null"
            class="w-full py-3 px-4 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
          >
            <span v-if="loadingPlanKey === plan.planKey" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
            <span v-else>
              Subscribe Now
            </span>
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center space-y-4">
        <!-- Alternative Actions -->
        <div class="flex justify-center gap-6">
          <NuxtLink 
            to="/" 
            class="text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            Return to home page
          </NuxtLink>
          <a 
            href="mailto:support@timereward.app" 
            class="text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            Contact support
          </a>
        </div>

        <!-- User Info -->
        <div v-if="profile" class="pt-4 border-t border-slate-700">
          <p class="text-xs text-slate-500">
            Logged in as {{ `${profile.firstName} ${profile.lastName}`.trim() || profile.email }}
          </p>
        </div>

        <!-- Trust Badges -->
        <div class="flex justify-center items-center gap-4 pt-4">
          <div class="flex items-center text-xs text-slate-500">
            <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
            </svg>
            Secure checkout
          </div>
          <div class="flex items-center text-xs text-slate-500">
            <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
            </svg>
            Cancel anytime
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
