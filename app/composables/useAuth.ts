import type { LoginCredentials, RegisterData, UserProfile } from '~/types/user'

function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  if (e instanceof TypeError && /fetch|network/i.test(e.message)) return true
  // Supabase wraps fetch errors into PostgrestError/AuthError objects
  // whose message contains the original network error text
  const msg = (e as any)?.message ?? ''
  if (/failed to fetch|networkerror|err_name_not_resolved|fetch error/i.test(msg)) return true
  return false
}

function getErrorMessage(e: unknown): string {
  const dataMessage = (e as any)?.data?.message
  if (typeof dataMessage === 'string' && dataMessage.length > 0) {
    if (/email rate limit exceeded/i.test(dataMessage)) {
      return 'Too many auth emails were sent recently. Please wait a while before trying again.'
    }
    return dataMessage
  }

  const statusMessage = (e as any)?.statusMessage
  if (typeof statusMessage === 'string' && statusMessage.length > 0) {
    return statusMessage
  }

  if (e instanceof Error && e.message) {
    if (/429/.test(e.message) && /server error/i.test(e.message)) {
      return 'Too many auth emails were sent recently. Please wait a while before trying again.'
    }
    return e.message
  }

  return 'Something went wrong. Please try again in a moment.'
}

export function useAuth() {
  const supabase = useHealthySupabaseClient()
  const user = useSupabaseUser()
  const { isOnline } = useNetwork()
  
  const profile = useState<UserProfile | null>('auth-profile', () => null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Fetch user profile when user changes
  watch(user, async (newUser) => {
    if (newUser?.id) {
      await fetchProfile()
    } else {
      profile.value = null
    }
  }, { immediate: true })

  // Also fetch on client mount — useSupabaseUser() can be null on client
  // even when authenticated (session not yet restored from cookie)
  if (import.meta.client && !profile.value) {
    fetchProfile()
  }

  async function fetchProfile() {
    // Try useSupabaseUser first, fall back to getSession
    let userId = user.value?.id
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession()
      userId = session?.user?.id
    }
    if (!userId) return

    if (profile.value?.id === userId) return

    const { data, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError) {
      console.error('[useAuth] Error fetching profile:', fetchError)
      return
    }

    profile.value = {
      id: data.id,
      username: data.username,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      stripeCustomerId: data.stripe_customer_id,
      subscriptionStatus: data.subscription_status,
      trialEnd: data.trial_end,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  async function signIn(credentials: LoginCredentials) {
    isLoading.value = true
    error.value = null

    try {
      // First, look up the user's email by username using RPC function
      // This bypasses RLS so anonymous users can look up emails for login
      let email: string | null = null
      try {
        const { data, error: lookupError } = await supabase
          .rpc('get_email_by_username', { p_username: credentials.username })

        if (lookupError) throw lookupError
        email = data
      } catch (e) {
        if (isNetworkError(e)) {
          throw new Error('Unable to connect. Please check your internet connection and try again.')
        }
        throw new Error('Invalid username or password')
      }

      if (!email) {
        throw new Error('Invalid username or password')
      }

      // Now sign in with the email
      try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: credentials.password
        })

        if (signInError) {
          throw new Error('Invalid username or password')
        }
      } catch (e) {
        if (isNetworkError(e)) {
          throw new Error('Unable to connect. Please check your internet connection and try again.')
        }
        throw e
      }

      // Full reload establishes server-side session cookies for SSR.
      // When offline, fall back to client-side navigation to avoid a broken
      // page (SSR hangs on JWKS fetch and CSS assets fail to load).
      const canReachServer = typeof navigator !== 'undefined' && navigator.onLine
      await navigateTo('/home', canReachServer ? { external: true } : undefined)
    } catch (e) {
      error.value = getErrorMessage(e)
    } finally {
      isLoading.value = false
    }
  }

  async function signUp(data: RegisterData) {
    isLoading.value = true
    error.value = null

    try {
      // Check if username is already taken (use RPC to bypass RLS for anonymous users)
      try {
        const { data: existingEmail } = await supabase
          .rpc('get_email_by_username', { p_username: data.username.toLowerCase() })

        if (existingEmail) {
          throw new Error('Username is already taken')
        }
      } catch (e) {
        if (isNetworkError(e)) {
          throw new Error('Unable to connect. Please check your internet connection and try again.')
        }
        throw e
      }

      // Sign out any existing session so the new user gets a clean session
      await supabase.auth.signOut()
      profile.value = null

      // Register via the server endpoint so dev can auto-confirm users while
      // confirmation-required environments still use the normal signup flow.
      let registerResult
      try {
        registerResult = await $fetch('/api/auth/register', {
          method: 'POST',
          body: {
            email: data.email,
            password: data.password,
            username: data.username.toLowerCase(),
            firstName: data.firstName,
            lastName: data.lastName
          }
        })
      } catch (e) {
        if (isNetworkError(e)) {
          throw new Error('Unable to connect. Please check your internet connection and try again.')
        }
        throw e
      }

      if (!registerResult.emailConfirmed) {
        error.value = 'Account created! Please check your email to confirm your account before signing in.'
        return
      }

      // Sign in as the new user to establish a client-side session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      })

      if (signInError) throw signInError

      const canReachServer = typeof navigator !== 'undefined' && navigator.onLine
      await navigateTo('/home', canReachServer ? { external: true } : undefined)
    } catch (e) {
      if (isNetworkError(e)) {
        error.value = 'Unable to connect. Please check your internet connection and try again.'
      } else {
        error.value = getErrorMessage(e)
      }
    } finally {
      isLoading.value = false
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    profile.value = null
    await navigateTo('/login')
  }

  return {
    user,
    profile: readonly(profile),
    isLoading: readonly(isLoading),
    error: readonly(error),
    isAuthenticated: computed(() => !!user.value),
    signIn,
    signUp,
    signOut,
    fetchProfile
  }
}
