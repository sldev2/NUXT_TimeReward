import { isTestRegistrationOnly } from '../../utils/boz23Registration'

/**
 * GET /api/auth/registration-policy
 * Exposes whether new registrations require "boz23" in the username (BOZ23=1).
 */
export default defineEventHandler(() => {
  const config = useRuntimeConfig()
  return {
    testRegistrationOnly: isTestRegistrationOnly(config.boz23)
  }
})
