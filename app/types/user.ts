export type SubscriptionStatus = 'trial' | 'active' | 'canceled' | 'expired'

export interface UserProfile {
  id: string
  username: string
  firstName: string
  lastName: string
  email: string
  stripeCustomerId: string | null
  subscriptionStatus: SubscriptionStatus
  trialEnd: string | null
  createdAt: string
  updatedAt: string
}

export interface UserSettings {
  id: string
  userId: string
  autoPauseMinutes: number
  flashOnAutoPause: boolean
  includeNonRewardableInBreaks: boolean
  theme: 'light' | 'dark' | 'system'
  createdAt: string
  updatedAt: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
  firstName: string
  lastName: string
}
