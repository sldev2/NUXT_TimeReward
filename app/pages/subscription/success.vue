<script setup lang="ts">
/**
 * Subscription Success Page
 * 
 * Shown after successful Stripe checkout.
 * Syncs subscription status and redirects to home.
 */

definePageMeta({
  layout: 'auth',
  middleware: ['auth']
})

const route = useRoute()
const router = useRouter()
const isLoading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  const sessionId = route.query.session_id

  if (!sessionId) {
    // No session ID, just redirect home
    await router.push('/home')
    return
  }

  try {
    // Sync subscription status
    const { data, error: fetchError } = await useFetch('/api/stripe/update-subscription', {
      method: 'POST'
    })

    if (fetchError.value) {
      console.error('Error syncing subscription:', fetchError.value)
    }

    // Wait a moment for visual feedback
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Redirect to home
    await router.push('/home')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'An error occurred'
    isLoading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-900 flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
      <!-- Success Animation -->
      <div v-if="isLoading" class="space-y-6">
        <!-- Check Icon -->
        <div class="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
          <svg class="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <!-- Title -->
        <h1 class="text-2xl font-bold text-white">
          Welcome to TimeReward Pro!
        </h1>

        <!-- Description -->
        <p class="text-slate-400">
          Your subscription is now active. Setting up your account...
        </p>

        <!-- Loading Spinner -->
        <div class="flex justify-center">
          <svg class="animate-spin h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="space-y-6">
        <div class="w-20 h-20 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
          <svg class="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <h1 class="text-2xl font-bold text-white">
          Something Went Wrong
        </h1>

        <p class="text-slate-400">
          {{ error }}
        </p>

        <NuxtLink 
          to="/home" 
          class="inline-block py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Go to Dashboard
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
