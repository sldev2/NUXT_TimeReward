import { isUnderConstruction } from '../utils/underConstruction'

/**
 * GET /api/site-status
 * Lightweight flag for client-side route guards when UNDER_CONSTRUCTION=1.
 */
export default defineEventHandler(() => {
  const config = useRuntimeConfig()
  return {
    underConstruction: isUnderConstruction(config.underConstruction)
  }
})
