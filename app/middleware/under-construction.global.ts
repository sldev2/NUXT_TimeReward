import { isUnderConstruction } from '../../server/utils/underConstruction'

export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) {
    const config = useRuntimeConfig()
    if (isUnderConstruction(config.underConstruction)) {
      return abortNavigation()
    }
    return
  }

  const { underConstruction } = await $fetch<{ underConstruction: boolean }>('/api/site-status')
  if (underConstruction) {
    return navigateTo(useRequestURL().href, { external: true, replace: true })
  }
})
