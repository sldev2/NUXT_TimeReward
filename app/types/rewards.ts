export type RewardType = 'daily' | 'semi_weekly' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface Reward {
  id: string
  userId: string
  name: string
  rewardType: RewardType
  goalMinutes: number
  workGoal: number | null
  workGoalUnit: string | null
  isRecurring: boolean
  isArchived: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface UserBreak {
  id: string
  userId: string
  name: string
  goalMinutes: number
  breakDurationMinutes: number | null  // null = open-ended break (no countdown)
  progressSeconds: number
  baselineSeconds: number
  completedAt: string | null
  isRecurring: boolean
  activatedToday: boolean
  lastStart: string | null
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export interface BankedReward {
  id: string
  userId: string
  rewardId: string
  bankedAt: string
  minutesBanked: number
  periodStart: string
  periodEnd: string
  createdAt: string
}

export interface CashedInReward {
  id: string
  userId: string
  rewardId: string
  bankedRewardId: string | null
  cashedAt: string
  description: string | null
  createdAt: string
}

// Progress calculation for a reward
export interface RewardProgress {
  reward: Reward
  currentMinutes: number
  goalMinutes: number
  progressPercent: number
  isComplete: boolean
  periodStart: Date
  periodEnd: Date
}

// Break progress
export interface BreakProgress {
  break: UserBreak
  progressMinutes: number
  goalMinutes: number
  progressPercent: number
  isComplete: boolean
  earnedBreakMinutes: number
}
