/**
 * Client-side fallback: catches Supabase AbortError during hydration.
 *
 * With navigator.locks disabled (supabase-no-lock plugin), AbortErrors during
 * initialization should be rare. This plugin handles any remaining edge cases
 * by clearing the error and reloading once.
 */

export default defineNuxtPlugin((nuxtApp) => {
  let hasRecovered = false

  nuxtApp.hook('app:error', async (error: any) => {
    const msg = error?.message || ''
    const causeMsg = error?.cause?.message || ''

    if (!msg.includes('signal is aborted') && !causeMsg.includes('signal is aborted')) {
      return
    }

    // Only attempt recovery once per page load to prevent reload loops
    if (hasRecovered) {
      console.warn('[auth-recovery] AbortError persists after recovery — suppressing')
      clearError()
      return
    }

    hasRecovered = true
    console.warn('[auth-recovery] Caught Supabase AbortError — clearing and reloading')
    clearError()

    // Brief delay then reload to get a clean initialization
    await new Promise(resolve => setTimeout(resolve, 500))
    window.location.reload()
  })
})
