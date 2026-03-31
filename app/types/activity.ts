export type ActivityType = 'rewardable' | 'non_rewardable' | 'wasted'

export type TimerStatus = 'idle' | 'running' | 'paused' | 'auto_paused'

export type EstimateType = 'none' | 'general' | 'weekday'

export interface Activity {
  id: string
  userId: string
  name: string
  description: string | null
  activityType: ActivityType
  sortOrder: number
  isArchived: boolean
  autoRepeat: boolean
  // Time estimate settings
  estimateType: EstimateType
  generalEstimateHours: number
  estimateMon: number
  estimateTue: number
  estimateWed: number
  estimateThu: number
  estimateFri: number
  estimateSat: number
  estimateSun: number
  createdAt: string
  updatedAt: string
}

/**
 * Get the estimated seconds for an activity based on its estimate type and current day
 * Returns null if no estimate is configured
 */
export function getActivityEstimateSeconds(activity: Activity): number | null {
  if (activity.estimateType === 'none') {
    return null
  }
  
  if (activity.estimateType === 'general') {
    return activity.generalEstimateHours * 3600
  }
  
  // Weekday-specific estimate (estimateType === 'weekday')
  if (activity.estimateType === 'weekday') {
    const today = new Date().getDay() // 0 = Sunday
    const estimates: Record<number, number> = {
      0: activity.estimateSun,
      1: activity.estimateMon,
      2: activity.estimateTue,
      3: activity.estimateWed,
      4: activity.estimateThu,
      5: activity.estimateFri,
      6: activity.estimateSat
    }
    
    const hours = estimates[today] ?? 0
    return hours > 0 ? hours * 3600 : null
  }
  
  return null
}

export interface ActivityTimer {
  id: string
  userId: string
  activityId: string
  status: TimerStatus
  todaySeconds: number
  allTimeSeconds: number
  lastStartedAt: string | null
  lastStoppedAt: string | null
  autoPauseAt: string | null
  // Completion tracking
  isCompleted: boolean
  completedAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ActivityTimeLog {
  id: string
  userId: string
  activityId: string
  timerId: string
  startedAt: string
  endedAt: string | null
  autoPauseAt: string | null
  wasAutoStopped: boolean
  createdAt: string
}

// Combined activity with its timer for UI display
export interface ActivityWithTimer extends Activity {
  timer: ActivityTimer
}
