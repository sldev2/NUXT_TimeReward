<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

const { signIn, isLoading, error } = useAuth()
const supabase = useHealthySupabaseClient()
const { isOnline } = useNetwork()
const connectionState = useState<string>('connection-state', () => 'connecting')
const probeOffline = ref(false)
const showMagicLinkTest = import.meta.dev
const runtimeConfig = useRuntimeConfig()

// On client mount, probe the network to detect offline state
// even when navigator.onLine lies (common on Windows)
const supabaseUrl = import.meta.client
  ? (runtimeConfig.public.supabaseUrl || runtimeConfig.public.supabase?.url)
  : ''
const supabaseKey = import.meta.client
  ? (runtimeConfig.public.supabase?.key || runtimeConfig.public.supabaseKey || '')
  : ''

async function probeNetwork() {
  let timer: ReturnType<typeof setTimeout> | null = null
  try {
    const controller = new AbortController()
    timer = setTimeout(() => controller.abort(), 3000)
    await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: 'GET',
      headers: supabaseKey ? { apikey: supabaseKey } : undefined,
      signal: controller.signal
    })
    probeOffline.value = false
  } catch {
    probeOffline.value = true
  } finally {
    if (timer) clearTimeout(timer)
  }
}

if (import.meta.client) {
  let probeInterval: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    probeNetwork()
    // Periodic probe: navigator.onLine is unreliable on Windows,
    // so poll to detect offline/online transitions while on the page
    probeInterval = setInterval(() => {
      if (document.visibilityState === 'visible') probeNetwork()
    }, 8000)
  })

  // Re-probe immediately when browser reports online
  watch(isOnline, (online) => {
    if (online) probeNetwork()
  })

  onUnmounted(() => {
    if (probeInterval) clearInterval(probeInterval)
  })
}

const isEffectivelyOnline = computed(() => {
  if (probeOffline.value) return false
  if (!isOnline.value) return false
  if (connectionState.value === 'offline') return false
  if (connectionState.value === 'online') return true
  return isOnline.value
})

const passwordVisible = ref(false)
const magicEmail = ref('')
const magicLinkLoading = ref(false)
const magicLinkMessage = ref<string | null>(null)
const magicLinkError = ref<string | null>(null)

const form = reactive({
  username: '',
  password: ''
})

async function handleSubmit() {
  await signIn({
    username: form.username,
    password: form.password
  })
}

async function sendMagicLink() {
  if (!import.meta.client) return

  magicLinkLoading.value = true
  magicLinkMessage.value = null
  magicLinkError.value = null

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: magicEmail.value.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/confirm`,
        shouldCreateUser: false
      }
    })

    if (error) throw error

    magicLinkMessage.value = 'Magic link sent. Open the email and confirm it returns to /confirm.'
  } catch (err) {
    magicLinkError.value = err instanceof Error
      ? err.message
      : 'Unable to send magic link right now.'
  } finally {
    magicLinkLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
    <div class="w-full max-w-md p-8">
      <div class="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 p-8">
        <!-- Logo/Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            TimeReward
          </h1>
          <p class="text-slate-400 mt-2">Track your time, earn your rewards</p>
        </div>

        <!-- Offline Banner -->
        <div v-if="!isEffectivelyOnline" class="mb-6 p-4 bg-amber-500/10 border border-amber-500/50 rounded-lg text-amber-400 text-sm flex items-center gap-2">
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728M12 9v4m0 4h.01" />
          </svg>
          You are offline. Sign in requires an internet connection.
        </div>

        <!-- Error Message -->
        <div v-if="error" class="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {{ error }}
        </div>

        <!-- Login Form -->
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <div>
            <label for="username" class="block text-sm font-medium text-slate-300 mb-2">
              Username
            </label>
            <input
              id="username"
              v-model="form.username"
              type="text"
              required
              autocomplete="username"
              class="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg 
                     text-white placeholder-slate-500 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     transition-all duration-200"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <div class="relative">
              <input
                id="password"
                v-model="form.password"
                :type="passwordVisible ? 'text' : 'password'"
                required
                autocomplete="current-password"
                class="w-full px-4 py-3 pr-12 bg-slate-900/50 border border-slate-600 rounded-lg 
                       text-white placeholder-slate-500 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       transition-all duration-200"
                placeholder="Enter your password"
              />
              <button
                type="button"
                :aria-label="passwordVisible ? 'Hide password' : 'Show password'"
                class="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 
                       hover:text-slate-300 hover:bg-slate-700/50 focus:outline-none focus:ring-2 
                       focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 
                       transition-colors"
                @click="passwordVisible = !passwordVisible"
              >
                <!-- Eye (show password) when hidden -->
                <svg v-if="!passwordVisible" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <!-- Eye slash (hide password) when visible -->
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </button>
            </div>
          </div>

          <button
            type="submit"
            :disabled="isLoading || !isEffectivelyOnline"
            class="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-cyan-500 
                   text-white font-semibold rounded-lg shadow-lg
                   hover:from-blue-600 hover:to-cyan-600 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-200"
          >
            <span v-if="isLoading">Signing in...</span>
            <span v-else>Sign In</span>
          </button>
        </form>

        <!-- Register Link -->
        <p class="mt-6 text-center text-slate-400">
          Don't have an account?
          <NuxtLink to="/register" class="text-blue-400 hover:text-blue-300 font-medium">
            Create one
          </NuxtLink>
        </p>

        <div
          v-if="showMagicLinkTest"
          class="mt-8 border-t border-slate-700/50 pt-6"
        >
          <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Dev-only callback test
          </h2>
          <p class="mt-2 text-sm text-slate-400">
            Send a magic link to an existing confirmed email address to verify the `/confirm` callback flow.
          </p>

          <div v-if="magicLinkError" class="mt-4 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-400">
            {{ magicLinkError }}
          </div>

          <div v-if="magicLinkMessage" class="mt-4 rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-4 text-sm text-emerald-400">
            {{ magicLinkMessage }}
          </div>

          <form class="mt-4 space-y-4" @submit.prevent="sendMagicLink">
            <div>
              <label for="magic-email" class="block text-sm font-medium text-slate-300 mb-2">
                Test email
              </label>
              <input
                id="magic-email"
                v-model="magicEmail"
                type="email"
                required
                autocomplete="email"
                class="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg
                       text-white placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent
                       transition-all duration-200"
                placeholder="confirmed-user@example.com"
              />
            </div>

            <button
              type="submit"
              :disabled="magicLinkLoading || !isEffectivelyOnline || !magicEmail.trim()"
              class="w-full py-3 px-4 bg-slate-700/60 border border-slate-600
                     text-white font-semibold rounded-lg
                     hover:bg-slate-700
                     focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200"
            >
              <span v-if="magicLinkLoading">Sending magic link...</span>
              <span v-else>Send magic-link test</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
