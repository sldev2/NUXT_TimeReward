export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()

  if (!user.value) {
    return navigateTo('/login')
  }

  // On the client, verify the session is still valid (not just the user object).
  // A stale cookie can leave a user object present while the token is expired.
  if (import.meta.client) {
    const client = useHealthySupabaseClient()
    const { data: { session } } = await client.auth.getSession()
    if (!session) {
      return navigateTo('/login')
    }
  }
})
