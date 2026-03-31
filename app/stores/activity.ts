import { defineStore } from 'pinia'
import type { Activity, ActivityTimer, ActivityWithTimer, TimerStatus } from '~/types/activity'

export const useActivityStore = defineStore('activity', () => {
  const activities = ref<ActivityWithTimer[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const supabase = useHealthySupabaseClient()
  const user = useSupabaseUser()

  // Get activities by type
  const rewardableActivities = computed(() => 
    activities.value.filter(a => a.activityType === 'rewardable' && !a.isArchived)
  )

  const nonRewardableActivities = computed(() => 
    activities.value.filter(a => a.activityType === 'non_rewardable' && !a.isArchived)
  )

  const wastedActivities = computed(() => 
    activities.value.filter(a => a.activityType === 'wasted' && !a.isArchived)
  )

  // Get currently running activity
  const runningActivity = computed(() => 
    activities.value.find(a => a.timer.status === 'running')
  )

  // Total rewardable seconds today
  const totalRewardableSeconds = computed(() => 
    rewardableActivities.value.reduce((sum, a) => sum + a.timer.todaySeconds, 0)
  )

  async function fetchActivities() {
    if (!user.value) return

    isLoading.value = true
    error.value = null

    try {
      const { data: activitiesData, error: fetchError } = await supabase
        .from('activities')
        .select(`
          *,
          activity_timers (*)
        `)
        .eq('user_id', user.value.id)
        .eq('is_archived', false)
        .order('sort_order')

      if (fetchError) throw fetchError

      activities.value = (activitiesData || []).map(a => ({
        id: a.id,
        userId: a.user_id,
        name: a.name,
        activityType: a.activity_type,
        sortOrder: a.sort_order,
        isArchived: a.is_archived,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
        timer: a.activity_timers[0] ? {
          id: a.activity_timers[0].id,
          userId: a.activity_timers[0].user_id,
          activityId: a.activity_timers[0].activity_id,
          status: a.activity_timers[0].status as TimerStatus,
          todaySeconds: a.activity_timers[0].today_seconds,
          allTimeSeconds: a.activity_timers[0].all_time_seconds,
          createdAt: a.activity_timers[0].created_at,
          updatedAt: a.activity_timers[0].updated_at
        } : {
          id: '',
          userId: user.value!.id,
          activityId: a.id,
          status: 'idle' as TimerStatus,
          todaySeconds: 0,
          allTimeSeconds: 0,
          createdAt: '',
          updatedAt: ''
        }
      }))
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch activities'
    } finally {
      isLoading.value = false
    }
  }

  function updateTimerLocally(timerId: string, updates: Partial<ActivityTimer>) {
    const activity = activities.value.find(a => a.timer.id === timerId)
    if (activity) {
      Object.assign(activity.timer, updates)
    }
  }

  function incrementRunningTimer() {
    const running = runningActivity.value
    if (running) {
      running.timer.todaySeconds++
      running.timer.allTimeSeconds++
    }
  }

  return {
    activities,
    isLoading,
    error,
    rewardableActivities,
    nonRewardableActivities,
    wastedActivities,
    runningActivity,
    totalRewardableSeconds,
    fetchActivities,
    updateTimerLocally,
    incrementRunningTimer
  }
})
