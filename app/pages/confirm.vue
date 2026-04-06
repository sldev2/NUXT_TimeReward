<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const user = useSupabaseUser()
const supabase = useHealthySupabaseClient()
const route = useRoute()

const title = ref('Finishing sign-in...')
const message = ref('Please wait while we confirm your account and restore your session.')
const isError = ref(false)

let resolved = false
let fallbackTimer: ReturnType<typeof setTimeout> | null = null
let authListener: { subscription: { unsubscribe: () => void } } | null = null

function clearFallbackTimer() {
  if (fallbackTimer) {
    clearTimeout(fallbackTimer)
    fallbackTimer = null
  }
}

function getHashParams() {
  const hash = route.hash.startsWith('#') ? route.hash.slice(1) : route.hash
  return new URLSearchParams(hash)
}

async function goToDestination(path: '/home' | '/login') {
  if (resolved) return
  resolved = true
  clearFallbackTimer()

  const canReachServer = typeof navigator !== 'undefined' && navigator.onLine
  await navigateTo(path, canReachServer ? { external: true } : undefined)
}

onMounted(async () => {
  const hashParams = getHashParams()
  const authError = route.query.error_description
    || route.query.error
    || hashParams.get('error_description')
    || hashParams.get('error')

  if (typeof authError === 'string' && authError.length > 0) {
    isError.value = true
    title.value = 'Confirmation link failed'
    message.value = decodeURIComponent(authError.replace(/\+/g, ' '))
    return
  }

  if (user.value) {
    await goToDestination('/home')
    return
  }

  const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      await goToDestination('/home')
    }
  })
  authListener = data

  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    await goToDestination('/home')
    return
  }

  title.value = 'Confirmation complete'
  message.value = 'If you are not redirected automatically, continue to sign in.'

  fallbackTimer = setTimeout(async () => {
    await goToDestination('/login')
  }, 1500)
})

onUnmounted(() => {
  authListener?.subscription.unsubscribe()
  clearFallbackTimer()
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
    <div class="w-full max-w-md p-8">
      <div class="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 p-8 text-center">
        <h1
          class="text-3xl font-bold mb-4"
          :class="isError ? 'text-red-400' : 'bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent'"
        >
          {{ title }}
        </h1>

        <p class="text-slate-300 mb-6">
          {{ message }}
        </p>

        <div
          v-if="!isError"
          class="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-4 border-slate-600 border-t-cyan-400"
          aria-hidden="true"
        />

        <NuxtLink
          to="/login"
          class="inline-flex items-center justify-center rounded-lg border border-slate-600 bg-slate-700/50 px-5 py-3 font-semibold text-white transition-all duration-200 hover:bg-slate-700"
        >
          Go to sign in
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
