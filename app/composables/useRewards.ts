import type { Reward, RewardType, RewardProgress, BankedReward, CashedInReward } from '~/types/rewards'
import { getRewardTypeConfig } from '~/utils/rewardTypeConfig'

interface DbReward {
  id: string
  user_id: string
  name: string
  reward_type: string
  goal_minutes: number
  work_goal: number | null
  work_goal_unit: string | null
  is_recurring: boolean
  is_archived: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

interface DbBankedReward {
  id: string
  user_id: string
  reward_id: string
  banked_at: string
  minutes_banked: number
  period_start: string
  period_end: string
  created_at: string
}

interface DbCashedInReward {
  id: string
  user_id: string
  reward_id: string
  banked_reward_id: string | null
  cashed_at: string
  description: string | null
  created_at: string
}

/**
 * Composable for managing rewards
 */
export function useRewards() {
  const supabase = useHealthySupabaseClient()
  const user = useSupabaseUser()

  const rewards = useState<Reward[]>('rewards', () => [])
  const bankedRewards = useState<BankedReward[]>('banked-rewards', () => [])
  const cashedInRewards = useState<CashedInReward[]>('cashed-in-rewards', () => [])
  const isLoading = useState<boolean>('rewards-loading', () => false)
  const error = useState<string | null>('rewards-error', () => null)
  // Store the current user ID for reliable access in create/update operations
  const currentUserId = useState<string | null>('rewards-user-id', () => null)

  // Get effective rewardable time from activities composable
  // This respects the user's includeNonRewardableInRewards setting
  const { effectiveRewardableSeconds } = useActivities()

  /**
   * Transform database reward to frontend type
   */
  function transformReward(dbReward: DbReward): Reward {
    return {
      id: dbReward.id,
      userId: dbReward.user_id,
      name: dbReward.name,
      rewardType: dbReward.reward_type as RewardType,
      goalMinutes: dbReward.goal_minutes,
      workGoal: dbReward.work_goal,
      workGoalUnit: dbReward.work_goal_unit,
      isRecurring: dbReward.is_recurring,
      isArchived: dbReward.is_archived,
      sortOrder: dbReward.sort_order,
      createdAt: dbReward.created_at,
      updatedAt: dbReward.updated_at
    }
  }

  /**
   * Transform database banked reward to frontend type
   */
  function transformBankedReward(dbBanked: DbBankedReward): BankedReward {
    return {
      id: dbBanked.id,
      userId: dbBanked.user_id,
      rewardId: dbBanked.reward_id,
      bankedAt: dbBanked.banked_at,
      minutesBanked: dbBanked.minutes_banked,
      periodStart: dbBanked.period_start,
      periodEnd: dbBanked.period_end,
      createdAt: dbBanked.created_at
    }
  }

  function transformCashedInReward(dbCashed: DbCashedInReward): CashedInReward {
    return {
      id: dbCashed.id,
      userId: dbCashed.user_id,
      rewardId: dbCashed.reward_id,
      bankedRewardId: dbCashed.banked_reward_id,
      cashedAt: dbCashed.cashed_at,
      description: dbCashed.description,
      createdAt: dbCashed.created_at
    }
  }

  /**
   * Count claimed cycles for a recurring reward within a period.
   * A claimed cycle = one banked reward OR one direct cash-in (banked_reward_id IS NULL).
   * Cash-ins that reference a banked reward are NOT counted separately
   * because the bank itself already consumed the cycle.
   */
  function getClaimedCycles(rewardId: string, periodStart: Date, periodEnd: Date): number {
    const bankedCount = bankedRewards.value.filter(b =>
      b.rewardId === rewardId &&
      new Date(b.periodStart) >= periodStart &&
      new Date(b.periodStart) < periodEnd
    ).length

    const directCashInCount = cashedInRewards.value.filter(c =>
      c.rewardId === rewardId &&
      c.bankedRewardId === null &&
      new Date(c.cashedAt) >= periodStart &&
      new Date(c.cashedAt) < periodEnd
    ).length

    return bankedCount + directCashInCount
  }

  /**
   * Get the period boundaries for a reward type
   * All periods use 3 AM as the rollover time
   */
  function getPeriodBoundaries(rewardType: RewardType, referenceDate: Date = new Date()): { start: Date; end: Date } {
    const date = new Date(referenceDate)
    
    // Adjust to 3 AM rollover - if before 3 AM, we're still in yesterday's period
    if (date.getHours() < 3) {
      date.setDate(date.getDate() - 1)
    }
    
    // Reset to 3 AM of the current effective day
    date.setHours(3, 0, 0, 0)
    
    const start = new Date(date)
    const end = new Date(date)
    
    switch (rewardType) {
      case 'daily':
        end.setDate(end.getDate() + 1)
        break
      case 'semi_weekly':
        // Semi-weekly: Monday-Wednesday, Thursday-Sunday
        const dayOfWeek = date.getDay()
        if (dayOfWeek >= 1 && dayOfWeek <= 3) {
          // Monday, Tuesday, Wednesday
          start.setDate(start.getDate() - (dayOfWeek - 1))
          end.setDate(start.getDate() + 3)
        } else {
          // Thursday, Friday, Saturday, Sunday
          const daysFromThursday = dayOfWeek === 0 ? 3 : dayOfWeek - 4
          start.setDate(start.getDate() - daysFromThursday)
          end.setDate(start.getDate() + 4)
        }
        break
      case 'weekly':
        // Week starts on Monday
        const weekDay = date.getDay()
        const mondayOffset = weekDay === 0 ? -6 : 1 - weekDay
        start.setDate(start.getDate() + mondayOffset)
        end.setDate(start.getDate() + 7)
        break
      case 'monthly':
        start.setDate(1)
        end.setMonth(end.getMonth() + 1)
        end.setDate(1)
        break
      case 'quarterly':
        const currentQuarter = Math.floor(date.getMonth() / 3)
        start.setMonth(currentQuarter * 3, 1)
        end.setMonth((currentQuarter + 1) * 3, 1)
        break
      case 'yearly':
        start.setMonth(0, 1)
        end.setFullYear(end.getFullYear() + 1, 0, 1)
        break
    }
    
    return { start, end }
  }

  /**
   * Fetch all rewards for the current user
   * @param userId - Optional user ID, defaults to user.value?.id
   */
  async function fetchRewards(userId?: string) {
    const effectiveUserId = userId || currentUserId.value || user.value?.id
    if (!effectiveUserId) {
      rewards.value = []
      return
    }

    // Store the user ID for future operations
    currentUserId.value = effectiveUserId

    isLoading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('rewards')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('is_archived', false)
        .order('sort_order', { ascending: true })

      if (fetchError) throw fetchError

      rewards.value = (data as DbReward[] || []).map(transformReward)

      // Also fetch banked rewards and cashed-in rewards
      const [{ data: bankedData }, { data: cashedData }] = await Promise.all([
        supabase
          .from('banked_rewards')
          .select('*')
          .eq('user_id', effectiveUserId)
          .order('banked_at', { ascending: false }),
        supabase
          .from('cashed_in_rewards')
          .select('*')
          .eq('user_id', effectiveUserId)
          .order('cashed_at', { ascending: false })
      ])

      bankedRewards.value = (bankedData as DbBankedReward[] || []).map(transformBankedReward)
      cashedInRewards.value = (cashedData as DbCashedInReward[] || []).map(transformCashedInReward)
    } catch (e) {
      console.error('Error fetching rewards:', e)
      error.value = e instanceof Error ? e.message : 'Failed to fetch rewards'
    } finally {
      isLoading.value = false
    }
  }

  function requireOnline(actionLabel: string): boolean {
    const connState = useState<string>('connection-state')
    if (connState.value === 'offline') {
      const toast = useState<string>('connection-toast')
      const toastType = useState<string>('connection-toast-type')
      toast.value = `You're offline. ${actionLabel} requires a connection.`
      toastType.value = 'warning'
      setTimeout(() => { toast.value = '' }, 3000)
      return false
    }
    return true
  }

  /**
   * Create a new reward
   */
  async function createReward(name: string, rewardType: RewardType, workGoal: number, isRecurring: boolean = true) {
    if (!requireOnline('Creating rewards')) return null
    const userId = currentUserId.value
    if (!userId) {
      error.value = 'Not authenticated'
      return null
    }

    try {
      const config = getRewardTypeConfig(rewardType)
      const goalMinutes = config.toMinutes(workGoal)
      const maxSortOrder = rewards.value.reduce((max, r) => Math.max(max, r.sortOrder), 0)

      const { data, error: insertError } = await supabase
        .from('rewards')
        .insert({
          user_id: userId,
          name: name.trim(),
          reward_type: rewardType,
          goal_minutes: goalMinutes,
          work_goal: workGoal,
          work_goal_unit: config.unit,
          is_recurring: isRecurring,
          sort_order: maxSortOrder + 1
        })
        .select()
        .single()

      if (insertError) throw insertError

      await fetchRewards()
      return data
    } catch (e) {
      console.error('Error creating reward:', e)
      error.value = e instanceof Error ? e.message : 'Failed to create reward'
      return null
    }
  }

  /**
   * Update a reward
   */
  async function updateReward(rewardId: string, updates: Partial<Pick<Reward, 'name' | 'workGoal' | 'rewardType' | 'isRecurring'>>): Promise<boolean> {
    if (!requireOnline('Editing rewards')) return false
    try {
      const dbUpdates: Record<string, unknown> = {}
      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.isRecurring !== undefined) dbUpdates.is_recurring = updates.isRecurring
      if (updates.rewardType !== undefined) dbUpdates.reward_type = updates.rewardType

      if (updates.workGoal !== undefined) {
        const effectiveType = updates.rewardType
          ?? rewards.value.find(r => r.id === rewardId)?.rewardType
          ?? 'daily'
        const config = getRewardTypeConfig(effectiveType)
        dbUpdates.work_goal = updates.workGoal
        dbUpdates.work_goal_unit = config.unit
        dbUpdates.goal_minutes = config.toMinutes(updates.workGoal)
      }

      const { error: updateError } = await supabase
        .from('rewards')
        .update(dbUpdates)
        .eq('id', rewardId)

      if (updateError) throw updateError

      await fetchRewards()
      return true
    } catch (e) {
      console.error('Error updating reward:', e)
      error.value = e instanceof Error ? e.message : 'Failed to update reward'
      return false
    }
  }

  /**
   * Archive a reward
   */
  async function archiveReward(rewardId: string) {
    if (!requireOnline('Deleting rewards')) return
    try {
      const { error: archiveError } = await supabase
        .from('rewards')
        .update({ is_archived: true })
        .eq('id', rewardId)

      if (archiveError) throw archiveError

      await fetchRewards()
    } catch (e) {
      console.error('Error archiving reward:', e)
      error.value = e instanceof Error ? e.message : 'Failed to archive reward'
    }
  }

  /**
   * Bank a reward (save for later)
   */
  async function bankReward(rewardId: string) {
    const reward = rewards.value.find(r => r.id === rewardId)
    const userId = currentUserId.value
    if (!reward || !userId) return

    try {
      const { start, end } = getPeriodBoundaries(reward.rewardType)

      const { error: bankError } = await supabase
        .from('banked_rewards')
        .insert({
          user_id: userId,
          reward_id: rewardId,
          minutes_banked: reward.goalMinutes,
          period_start: start.toISOString(),
          period_end: end.toISOString()
        })

      if (bankError) throw bankError

      await fetchRewards()
    } catch (e) {
      console.error('Error banking reward:', e)
      error.value = e instanceof Error ? e.message : 'Failed to bank reward'
    }
  }

  /**
   * Cash in a reward
   */
  async function cashInReward(rewardId: string, bankedRewardId: string | null, description: string) {
    if (!requireOnline('Cashing in rewards')) return
    const userId = currentUserId.value
    if (!userId) return

    try {
      const { error: cashError } = await supabase
        .from('cashed_in_rewards')
        .insert({
          user_id: userId,
          reward_id: rewardId,
          banked_reward_id: bankedRewardId,
          description
        })

      if (cashError) throw cashError

      await fetchRewards()
    } catch (e) {
      console.error('Error cashing in reward:', e)
      error.value = e instanceof Error ? e.message : 'Failed to cash in reward'
    }
  }

  /**
   * Get progress for all rewards.
   * For recurring rewards, subtracts claimed cycles so progress reflects
   * the current earning cycle rather than raw accumulated time.
   */
  const rewardProgress = computed((): RewardProgress[] => {
    const rawMinutes = Math.floor(effectiveRewardableSeconds.value / 60)
    
    return rewards.value.map(reward => {
      const { start, end } = getPeriodBoundaries(reward.rewardType)

      if (reward.isRecurring && reward.goalMinutes > 0) {
        const totalEarned = Math.floor(rawMinutes / reward.goalMinutes)
        const claimed = getClaimedCycles(reward.id, start, end)
        const unclaimed = Math.max(0, totalEarned - claimed)
        const consumedMinutes = claimed * reward.goalMinutes
        const effectiveMinutes = Math.max(0, rawMinutes - consumedMinutes)
        const cycleMinutes = effectiveMinutes % reward.goalMinutes
        const progressPercent = (cycleMinutes / reward.goalMinutes) * 100

        return {
          reward,
          currentMinutes: cycleMinutes,
          goalMinutes: reward.goalMinutes,
          progressPercent,
          isComplete: unclaimed > 0,
          periodStart: start,
          periodEnd: end
        }
      }

      const progressPercent = Math.min(100, (rawMinutes / reward.goalMinutes) * 100)
      return {
        reward,
        currentMinutes: Math.min(rawMinutes, reward.goalMinutes),
        goalMinutes: reward.goalMinutes,
        progressPercent,
        isComplete: rawMinutes >= reward.goalMinutes,
        periodStart: start,
        periodEnd: end
      }
    })
  })

  // Initialize
  if (import.meta.client) {
    // Use auth state change event - more reliable than watching user ref
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.id) {
        // Pass user ID from session to avoid timing issues with user ref
        await fetchRewards(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        rewards.value = []
        bankedRewards.value = []
        cashedInRewards.value = []
        currentUserId.value = null
      }
    })
    
    // Also check if user is already available (for hot reload scenarios)
    if (user.value?.id) {
      fetchRewards(user.value.id)
    }
  }

  const availableBankedRewards = computed(() =>
    bankedRewards.value.filter(b =>
      !cashedInRewards.value.some(c => c.bankedRewardId === b.id)
    )
  )

  return {
    rewards: readonly(rewards),
    bankedRewards: readonly(bankedRewards),
    cashedInRewards: readonly(cashedInRewards),
    availableBankedRewards,
    rewardProgress,
    isLoading: readonly(isLoading),
    error: readonly(error),
    fetchRewards,
    createReward,
    updateReward,
    archiveReward,
    bankReward,
    cashInReward,
    getPeriodBoundaries,
    getClaimedCycles
  }
}
