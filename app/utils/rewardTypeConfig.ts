import type { RewardType } from '~/types/rewards'

export type WorkGoalUnit = 'hours' | 'days' | 'weeks'

export interface RewardTypeConfig {
  unit: WorkGoalUnit
  label: string
  min: number
  max: number
  step: number
  default: number
  toMinutes: (workGoal: number) => number
}

const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 60 * 8       // 1 work-day = 8 hours
const MINUTES_PER_WEEK = 60 * 8 * 5  // 1 work-week = 5 days × 8 hours = 40 hours

export const REWARD_TYPE_CONFIG: Record<RewardType, RewardTypeConfig> = {
  daily: {
    unit: 'hours',
    label: 'Work Goal (hours)',
    min: 0.5,
    max: 20,
    step: 0.25,
    default: 8,
    toMinutes: (val) => Math.round(val * MINUTES_PER_HOUR)
  },
  semi_weekly: {
    unit: 'hours',
    label: 'Work Goal (hours)',
    min: 0.5,
    max: 60,
    step: 0.25,
    default: 20,
    toMinutes: (val) => Math.round(val * MINUTES_PER_HOUR)
  },
  weekly: {
    unit: 'hours',
    label: 'Work Goal (hours)',
    min: 0.5,
    max: 280,
    step: 0.25,
    default: 40,
    toMinutes: (val) => Math.round(val * MINUTES_PER_HOUR)
  },
  monthly: {
    unit: 'days',
    label: 'Work Goal (days)',
    min: 1,
    max: 24,
    step: 1,
    default: 20,
    toMinutes: (val) => Math.round(val * MINUTES_PER_DAY)
  },
  quarterly: {
    unit: 'weeks',
    label: 'Work Goal (weeks)',
    min: 1,
    max: 15,
    step: 1,
    default: 12,
    toMinutes: (val) => Math.round(val * MINUTES_PER_WEEK)
  },
  yearly: {
    unit: 'weeks',
    label: 'Work Goal (weeks)',
    min: 1,
    max: 52,
    step: 1,
    default: 48,
    toMinutes: (val) => Math.round(val * MINUTES_PER_WEEK)
  }
}

export function getRewardTypeConfig(type: RewardType): RewardTypeConfig {
  return REWARD_TYPE_CONFIG[type]
}

/**
 * Format a seconds value into a human-readable time string for reward display.
 *
 * Display tiers based on magnitude (work-time constants):
 *   < 1 hour (3,600s):          "0h Xm"
 *   1h – 4 work-days (32h):     "Xh Ym"
 *   > 4 work-days (> 32h):      "Xw Yd" / "Xw" / "Xd"
 *
 * 1 work-day = 8 hours, 1 work-week = 5 days = 40 hours.
 */
const SECONDS_PER_HOUR = 3600
const SECONDS_PER_WORK_DAY = 8 * 3600        // 28,800
const SECONDS_PER_WORK_WEEK = 5 * 8 * 3600   // 144,000
const THRESHOLD_WEEKS_DAYS = 4 * SECONDS_PER_WORK_DAY  // 115,200 (4 work-days = 32h)

export function formatRewardSeconds(seconds: number): string {
  seconds = Math.max(0, Math.floor(seconds))

  if (seconds < SECONDS_PER_HOUR) {
    const m = Math.floor(seconds / 60)
    return `0h ${m}m`
  }

  if (seconds <= THRESHOLD_WEEKS_DAYS) {
    const h = Math.floor(seconds / SECONDS_PER_HOUR)
    const m = Math.floor((seconds % SECONDS_PER_HOUR) / 60)
    return `${h}h ${m}m`
  }

  const totalDays = Math.floor(seconds / SECONDS_PER_WORK_DAY)
  const weeks = Math.floor(totalDays / 5)
  const remainderDays = totalDays % 5

  if (weeks === 0) return `${totalDays}d`
  if (remainderDays === 0) return `${weeks}w`
  return `${weeks}w ${remainderDays}d`
}
