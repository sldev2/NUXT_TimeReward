<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

const { signUp, isLoading, error } = useAuth()
const { isOnline } = useNetwork()
const connectionState = useState<string>('connection-state', () => 'connecting')
const probeOffline = ref(false)
const runtimeConfig = useRuntimeConfig()

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
    probeInterval = setInterval(() => {
      if (document.visibilityState === 'visible') probeNetwork()
    }, 8000)
  })

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

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: ''
})

const validationError = ref<string | null>(null)

async function handleSubmit() {
  validationError.value = null

  if (form.password !== form.confirmPassword) {
    validationError.value = 'Passwords do not match'
    return
  }

  if (form.password.length < 8) {
    validationError.value = 'Password must be at least 8 characters'
    return
  }

  if (form.username.length < 3) {
    validationError.value = 'Username must be at least 3 characters'
    return
  }

  await signUp({
    username: form.username,
    email: form.email,
    password: form.password,
    firstName: form.firstName || form.username,
    lastName: form.lastName
  })
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12">
    <div class="w-full max-w-md p-8">
      <div class="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 p-8">
        <!-- Logo/Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Create Account
          </h1>
          <p class="text-slate-400 mt-2">Start tracking your time today</p>
        </div>

        <!-- Offline Banner -->
        <div v-if="!isEffectivelyOnline" class="mb-6 p-4 bg-amber-500/10 border border-amber-500/50 rounded-lg text-amber-400 text-sm flex items-center gap-2">
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728M12 9v4m0 4h.01" />
          </svg>
          You are offline. Registration requires an internet connection.
        </div>

        <!-- Error Message -->
        <div v-if="error || validationError" class="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {{ error || validationError }}
        </div>

        <!-- Register Form -->
        <form @submit.prevent="handleSubmit" class="space-y-5">
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
              placeholder="Choose a username"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="firstName" class="block text-sm font-medium text-slate-300 mb-2">
                First Name
              </label>
              <input
                id="firstName"
                v-model="form.firstName"
                type="text"
                required
                autocomplete="given-name"
                class="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg 
                       text-white placeholder-slate-500 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       transition-all duration-200"
                placeholder="First name"
              />
            </div>
            <div>
              <label for="lastName" class="block text-sm font-medium text-slate-300 mb-2">
                Last Name
              </label>
              <input
                id="lastName"
                v-model="form.lastName"
                type="text"
                required
                autocomplete="family-name"
                class="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg 
                       text-white placeholder-slate-500 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       transition-all duration-200"
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <label for="email" class="block text-sm font-medium text-slate-300 mb-2">
              Email
            </label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              required
              autocomplete="email"
              class="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg 
                     text-white placeholder-slate-500 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     transition-all duration-200"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              required
              autocomplete="new-password"
              class="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg 
                     text-white placeholder-slate-500 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     transition-all duration-200"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-slate-300 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              v-model="form.confirmPassword"
              type="password"
              required
              autocomplete="new-password"
              class="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg 
                     text-white placeholder-slate-500 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     transition-all duration-200"
              placeholder="Confirm your password"
            />
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
            <span v-if="isLoading">Creating account...</span>
            <span v-else>Create Account</span>
          </button>
        </form>

        <!-- Login Link -->
        <p class="mt-6 text-center text-slate-400">
          Already have an account?
          <NuxtLink to="/login" class="text-blue-400 hover:text-blue-300 font-medium">
            Sign in
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>
