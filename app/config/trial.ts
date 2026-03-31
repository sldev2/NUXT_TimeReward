/**
 * Trial Duration Configuration
 * 
 * Configures trial period durations per environment.
 * PRD Section 17.4.1 specifies:
 * - Development: 1 day
 * - Staging: 30 days
 * - Production: 30 days
 */

export interface TrialConfig {
  /** Trial duration in days */
  days: number
  /** Trial duration in milliseconds */
  ms: number
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Get the trial configuration for the current environment
 */
export function getTrialConfig(): TrialConfig {
  // Check for explicit environment override first
  const envOverride = process.env.NUXT_TRIAL_DAYS || process.env.TRIAL_DAYS
  if (envOverride) {
    const days = parseInt(envOverride, 10)
    if (!isNaN(days) && days > 0) {
      return { days, ms: days * DAY_MS }
    }
  }

  // Determine environment
  const isDev = import.meta.dev || process.env.NODE_ENV === 'development'
  const isStaging = process.env.NUXT_PUBLIC_APP_ENV === 'staging'
  
  if (isDev) {
    // Development: 1 day trial
    return { days: 1, ms: 1 * DAY_MS }
  }
  
  if (isStaging) {
    // Staging: 30 days trial
    return { days: 30, ms: 30 * DAY_MS }
  }
  
  // Production: 30 days trial (default)
  return { days: 30, ms: 30 * DAY_MS }
}

/**
 * Calculate the trial end date from now
 */
export function getTrialEndDate(): Date {
  const config = getTrialConfig()
  return new Date(Date.now() + config.ms)
}

/**
 * Get trial end date as ISO string for database storage
 */
export function getTrialEndISOString(): string {
  return getTrialEndDate().toISOString()
}
