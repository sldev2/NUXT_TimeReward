/**
 * POST /api/admin/load-demo-data
 * 
 * Loads demo data for the authenticated user (resets their activities, rewards, breaks).
 * This endpoint is for development/testing purposes.
 * 
 * Response:
 *   { success: true, message: string, data: { activities, rewards, breaks } }
 */

import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

// Standard demo activities
const DEMO_ACTIVITIES = [
  { name: 'Work', activityType: 'rewardable', sortOrder: 1, estimateType: 'none', autoRepeat: true },
  { 
    name: 'Test', 
    activityType: 'rewardable', 
    sortOrder: 2, 
    estimateType: 'weekday',  // Weekday-specific estimates (matches frontend EstimateType)
    autoRepeat: true,
    estimateMon: 0.25,
    estimateTue: 0.25,
    estimateWed: 0.25,
    estimateThu: 0.25,
    estimateFri: 0.25,
    estimateSat: 0.25,
    estimateSun: 0.25,
  },
  { name: 'Chores', activityType: 'non_rewardable', sortOrder: 3, estimateType: 'none', autoRepeat: true },
  { name: 'Facebook', activityType: 'wasted', sortOrder: 4, estimateType: 'none', autoRepeat: false },
]

// Sample rewards with work_goal in human-friendly units
// goalMinutes: hours*60, days*480 (8h/day), weeks*2400 (5d*8h/day)
const DEMO_REWARDS = [
  { name: 'Daily Gaming', rewardType: 'daily', workGoal: 1, workGoalUnit: 'hours', goalMinutes: 60, isRecurring: true },
  { name: 'Daily Coffee', rewardType: 'daily', workGoal: 0.5, workGoalUnit: 'hours', goalMinutes: 30, isRecurring: true },
  { name: 'Weekly Restaurant', rewardType: 'weekly', workGoal: 5, workGoalUnit: 'hours', goalMinutes: 300, isRecurring: true },
  { name: 'Weekly Movie', rewardType: 'weekly', workGoal: 3, workGoalUnit: 'hours', goalMinutes: 180, isRecurring: false },
  { name: 'Monthly Treat', rewardType: 'monthly', workGoal: 1, workGoalUnit: 'days', goalMinutes: 480, isRecurring: true },
]

// Sample breaks
const DEMO_BREAKS = [
  { name: 'Coffee Break', goalMinutes: 30, breakDurationMinutes: 5, isRecurring: true },
  { name: 'Stretch Break', goalMinutes: 60, breakDurationMinutes: 10, isRecurring: true },
  { name: '2 min breaky-break', goalMinutes: 2, breakDurationMinutes: 2, isRecurring: true },
]

export default defineEventHandler(async (event) => {
  // Get authenticated user
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - must be logged in'
    })
  }

  // Only allow in development mode (for safety)
  const isDev = process.env.NODE_ENV === 'development' || process.env.ALLOW_DEMO_DATA === 'true'
  if (!isDev) {
    throw createError({
      statusCode: 403,
      message: 'Demo data loading is only available in development mode'
    })
  }

  // Use service role client to bypass RLS for admin operations
  const supabase = await serverSupabaseServiceRole(event)
  
  // serverSupabaseUser returns JWT payload where user ID is in 'sub' field, not 'id'
  const userId = (user as any).sub || user.id
  
  console.log('[load-demo-data] Using userId:', userId)
  
  if (!userId) {
    throw createError({
      statusCode: 500,
      message: `User ID is null or undefined. User keys: ${Object.keys(user || {}).join(', ')}`
    })
  }

  try {
    // Reset existing data for this user
    // Delete existing timers first (due to foreign key)
    await supabase.from('activity_timers').delete().eq('user_id', userId)
    
    // Delete existing activities
    await supabase.from('activities').delete().eq('user_id', userId)
    
    // Delete existing rewards and breaks
    await supabase.from('banked_rewards').delete().eq('user_id', userId)
    await supabase.from('cashed_in_rewards').delete().eq('user_id', userId)
    await supabase.from('rewards').delete().eq('user_id', userId)
    await supabase.from('user_breaks').delete().eq('user_id', userId)

    // Reset AutoPause cumulative base (timers are zeroed, so the base must match)
    await supabase
      .from('user_settings')
      .update({ auto_pause_cumulative_base: 0 })
      .eq('user_id', userId)

    // Create demo activities with timers
    const createdActivities = []
    for (const activity of DEMO_ACTIVITIES) {
      const activityRecord: Record<string, unknown> = {
        user_id: userId,
        name: activity.name,
        activity_type: activity.activityType,
        sort_order: activity.sortOrder,
        is_archived: false,
        auto_repeat: activity.autoRepeat ?? true,
        estimate_type: activity.estimateType || 'none',
      }
      
      // Add specific day estimates if present
      if (activity.estimateType === 'weekday') {
        activityRecord.estimate_mon = (activity as any).estimateMon ?? 1.0
        activityRecord.estimate_tue = (activity as any).estimateTue ?? 1.0
        activityRecord.estimate_wed = (activity as any).estimateWed ?? 1.0
        activityRecord.estimate_thu = (activity as any).estimateThu ?? 1.0
        activityRecord.estimate_fri = (activity as any).estimateFri ?? 1.0
        activityRecord.estimate_sat = (activity as any).estimateSat ?? 0.0
        activityRecord.estimate_sun = (activity as any).estimateSun ?? 0.0
      }
      
      const { data: activityData, error: activityError } = await supabase
        .from('activities')
        .insert(activityRecord)
        .select()
        .single()

      if (activityError) {
        console.error(`Error creating activity ${activity.name}:`, activityError)
        continue
      }

      // Create timer for this activity
      await supabase
        .from('activity_timers')
        .insert({
          user_id: userId,
          activity_id: activityData.id,
          status: 'idle',
          today_seconds: 0,
          all_time_seconds: 0
        })

      createdActivities.push(activityData)
    }

    // Create demo rewards
    const createdRewards = []
    for (let i = 0; i < DEMO_REWARDS.length; i++) {
      const reward = DEMO_REWARDS[i]
      const { data: rewardData, error: rewardError } = await supabase
        .from('rewards')
        .insert({
          user_id: userId,
          name: reward.name,
          reward_type: reward.rewardType,
          goal_minutes: reward.goalMinutes,
          work_goal: reward.workGoal,
          work_goal_unit: reward.workGoalUnit,
          is_recurring: reward.isRecurring,
          is_archived: false,
          sort_order: i
        })
        .select()
        .single()

      if (!rewardError && rewardData) {
        createdRewards.push(rewardData)
      }
    }

    // Create demo breaks
    const createdBreaks = []
    for (const brk of DEMO_BREAKS) {
      const { data: breakData, error: breakError } = await supabase
        .from('user_breaks')
        .insert({
          user_id: userId,
          name: brk.name,
          goal_minutes: brk.goalMinutes,
          break_duration_minutes: brk.breakDurationMinutes,
          is_recurring: brk.isRecurring,
          progress_seconds: 0,
          baseline_seconds: 0,
          is_archived: false
        })
        .select()
        .single()

      if (!breakError && breakData) {
        createdBreaks.push(breakData)
      }
    }

    return {
      success: true,
      message: 'Demo data loaded successfully',
      data: {
        activities: createdActivities.length,
        rewards: createdRewards.length,
        breaks: createdBreaks.length
      }
    }

  } catch (e) {
    console.error('Error loading demo data:', e)
    throw createError({
      statusCode: 500,
      message: e instanceof Error ? e.message : 'Failed to load demo data'
    })
  }
})
