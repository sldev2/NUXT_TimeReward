import type { Activity, ActivityTimer, ActivityWithTimer, TimerStatus, EstimateType } from '~/types/activity'

interface DbActivity {
  id: string
  user_id: string
  name: string
  description: string | null
  activity_type: string
  sort_order: number | null
  is_archived: boolean | null
  auto_repeat: boolean | null
  // Time estimate fields
  estimate_type: string | null
  general_estimate_hours: number | null
  estimate_mon: number | null
  estimate_tue: number | null
  estimate_wed: number | null
  estimate_thu: number | null
  estimate_fri: number | null
  estimate_sat: number | null
  estimate_sun: number | null
  created_at: string
  updated_at: string
}

interface DbActivityTimer {
  id: string
  user_id: string
  activity_id: string
  status: string
  today_seconds: number
  all_time_seconds: number
  last_started_at: string | null
  last_stopped_at: string | null
  auto_pause_at: string | null
  is_completed: boolean
  completed_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Composable for managing activities and their timers.
 * Fetches real data from Supabase and provides start/stop functionality.
 * Uses useState for shared state across component instances.
 */
export function useActivities() {
  const supabase = useHealthySupabaseClient()
  const user = useSupabaseUser()

  // Use useState for shared state across all component instances
  const activities = useState<ActivityWithTimer[]>('activities', () => [])
  const isLoading = useState<boolean>('activities-loading', () => false)
  const isRefreshing = useState<boolean>('activities-refreshing', () => false)
  const error = useState<string | null>('activities-error', () => null)
  // Store the current user ID for use in timer operations
  const currentUserId = useState<string | null>('activities-user-id', () => null)

  // Track the currently running activity for quick access
  const runningActivity = computed(() =>
    activities.value.find(a => a.timer.status === 'running')
  )

  // Auto-pause configuration - use shared settings from useUserSettings
  const { settings: userSettings, fetchSettings: fetchUserSettings, updateSetting } = useUserSettings()
  const autoPauseTimerId = useState<ReturnType<typeof setTimeout> | null>('auto-pause-timer-id', () => null)
  const isAutoPaused = useState<boolean>('is-auto-paused', () => false)
  const autoPausedAfterSeconds = useState<number>('auto-paused-after-seconds', () => 0)

  // Computed property to get auto-pause minutes from shared settings
  const autoPauseMinutes = computed(() => userSettings.value.autoPauseMinutes)
  const autoPauseCumulativeBase = computed(() => userSettings.value.autoPauseCumulativeBase)

  // Clock synchronization for accurate time display
  const { getServerTime, initClockSync, isSynced } = useClockSync()
  
  // Daily rollover at 3 AM
  const { initDailyRollover, lastResetDate } = useDailyRollover()

  // Get runtime config to check if we're in development
  const config = useRuntimeConfig()
  const isDev = import.meta.dev

  /**
   * Get the effective auto-pause timeout in milliseconds
   * Uses the user's setting from the database (autoPauseMinutes)
   * NOTE: Previously hardcoded to 1 minute in dev mode, but this broke E2E tests
   * that set their own AutoPause values. Now respects the user setting always.
   */
  function getAutoPauseTimeoutMs(): number {
    // Always use the user's setting - do NOT override in dev mode
    // Tests set their own AutoPause value via the settings page
    const minutes = autoPauseMinutes.value
    return minutes * 60 * 1000
  }

  /**
   * Schedule auto-pause for the currently running timer
   * Based on cumulative time across ALL activity types (rewardable + non_rewardable + wasted)
   */
  function scheduleAutoPause() {
    // Clear any existing timer
    if (autoPauseTimerId.value) {
      clearTimeout(autoPauseTimerId.value)
      autoPauseTimerId.value = null
    }

    const running = runningActivity.value
    if (!running || !running.timer.lastStartedAt) {
      return
    }

    // Calculate cumulative time across ALL activity types (matching the countdown display)
    const cumulativeSeconds = activities.value.reduce((total, activity) => {
      let seconds = activity.timer.todaySeconds
      
      if (activity.timer.status === 'running' && activity.timer.lastStartedAt) {
        const startTime = new Date(activity.timer.lastStartedAt).getTime()
        const runningElapsed = Math.floor((Date.now() - startTime) / 1000)
        seconds += runningElapsed
      }
      
      return total + seconds
    }, 0)
    
    // Subtract the cumulative base (time consumed by previous AutoPause cycles today)
    // This gives us the effective time in the current window (PRD 4.1.1 fresh window)
    // Clamp to 0 in case base exceeds cumulative (e.g. after demo data reset)
    const effectiveCumulative = Math.max(0, cumulativeSeconds - autoPauseCumulativeBase.value)
    const timeoutSeconds = autoPauseMinutes.value * 60
    const remainingSeconds = timeoutSeconds - effectiveCumulative

    if (remainingSeconds <= 0) {
      triggerAutoPause(running.timer.id)
    } else {
      console.log(`[AutoPause] Scheduled in ${remainingSeconds}s (effective: ${effectiveCumulative}s, base: ${autoPauseCumulativeBase.value}s, threshold: ${timeoutSeconds}s)`)
      autoPauseTimerId.value = setTimeout(() => {
        triggerAutoPause(running.timer.id)
      }, remainingSeconds * 1000)
    }
  }

  /**
   * Trigger auto-pause for a timer
   */
  /**
   * Play audio notification for auto-pause
   */
  function playAutoPauseSound() {
    if (import.meta.server) return
    if (!userSettings.value.audioOnAutoPause) return
    
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Configure sound - a gentle two-tone chime
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime) // A5
      oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.15) // E5
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.4)
    } catch (e) {
      console.warn('[AutoPause] Could not play notification sound:', e)
    }
  }

  async function triggerAutoPause(timerId: string) {
    console.log('[AutoPause] Triggering auto-pause for timer:', timerId)
    isAutoPaused.value = true

    playAutoPauseSound()

    const thresholdSeconds = autoPauseMinutes.value * 60
    // Capture the exact moment autopause fires — this is the canonical pause time
    // even if the RPC is delayed (e.g. offline replay)
    const pausedAtISO = new Date().toISOString()

    // Compute the cumulative seconds at this moment (for fresh-window base and status display)
    const cumulativeNow = activities.value.reduce((total, activity) => {
      let seconds = activity.timer.todaySeconds
      if (activity.timer.status === 'running' && activity.timer.lastStartedAt) {
        const startTime = new Date(activity.timer.lastStartedAt).getTime()
        seconds += Math.floor((Date.now() - startTime) / 1000)
      }
      return total + seconds
    }, 0)

    // Cap the "after N minutes" display to the threshold — if the timer overran
    // (e.g. during offline), don't report more than the configured autopause window
    const rawWindowSeconds = cumulativeNow - autoPauseCumulativeBase.value
    autoPausedAfterSeconds.value = Math.min(rawWindowSeconds, thresholdSeconds)

    // Set the new cumulative base so the next activity start gets a fresh window (PRD 4.1.1)
    await updateSetting('autoPauseCumulativeBase', cumulativeNow)

    const connState = useState<string>('connection-state')

    // Optimistic UI update: immediately mark the timer as auto_paused in local state
    // so the card shows yellow coloring without waiting for the server round-trip.
    // Reassign array to trigger shallowRef reactivity.
    activities.value = activities.value.map(a => {
      if (a.timer.id === timerId && a.timer.status === 'running') {
        return { ...a, timer: { ...a.timer, status: 'auto_paused' as TimerStatus, autoPauseAt: pausedAtISO } }
      }
      return a
    })

    try {
      const { error: rpcError } = await rpcWithTimeout('auto_pause_activity', {
        p_timer_id: timerId,
        p_paused_at: pausedAtISO
      })

      if (rpcError) {
        console.error('[AutoPause] Error:', rpcError)
        if (connState.value === 'offline' || rpcError.message?.includes('Failed to fetch')) {
          const { enqueue } = useOfflineQueue()
          enqueue('AUTO_PAUSE_ACTIVITY', { timerId, pausedAt: pausedAtISO })
          console.log('[AutoPause] Queued for offline replay')
        }
      } else {
        await fetchActivities()
      }
    } catch (e: any) {
      console.error('[AutoPause] Exception:', e)
      const { enqueue } = useOfflineQueue()
      enqueue('AUTO_PAUSE_ACTIVITY', { timerId, pausedAt: pausedAtISO })
      console.log('[AutoPause] Queued for offline replay (exception)')
    }
  }

  /**
   * Clear auto-pause state (called when user resumes activity)
   */
  function clearAutoPause() {
    if (autoPauseTimerId.value) {
      clearTimeout(autoPauseTimerId.value)
      autoPauseTimerId.value = null
    }
    isAutoPaused.value = false
  }

  // Calculate today's totals by activity type
  const todaysTotals = computed(() => {
    const totals = { rewardable: 0, non_rewardable: 0, wasted: 0 }
    for (const activity of activities.value) {
      const type = activity.activityType as keyof typeof totals
      if (type in totals) {
        totals[type] += activity.timer.todaySeconds
      }
    }
    return totals
  })

  /**
   * Calculate effective rewardable seconds based on user setting
   * When includeNonRewardableInRewards is true, includes both rewardable and non_rewardable time
   * This is used for Rewardable Time display and Reward progress calculations
   */
  const effectiveRewardableSeconds = computed(() => {
    const baseRewardable = todaysTotals.value.rewardable
    if (userSettings.value.includeNonRewardableInRewards) {
      return baseRewardable + todaysTotals.value.non_rewardable
    }
    return baseRewardable
  })

  /**
   * Transform database activity to frontend Activity type
   */
  function transformActivity(dbActivity: DbActivity): Activity {
    return {
      id: dbActivity.id,
      userId: dbActivity.user_id,
      name: dbActivity.name,
      description: dbActivity.description,
      activityType: dbActivity.activity_type as Activity['activityType'],
      sortOrder: dbActivity.sort_order ?? 0,
      isArchived: dbActivity.is_archived ?? false,
      autoRepeat: dbActivity.auto_repeat ?? false,
      // Time estimate fields
      estimateType: (dbActivity.estimate_type as EstimateType) ?? 'none',
      generalEstimateHours: dbActivity.general_estimate_hours ?? 1.0,
      estimateMon: dbActivity.estimate_mon ?? 1.0,
      estimateTue: dbActivity.estimate_tue ?? 1.0,
      estimateWed: dbActivity.estimate_wed ?? 1.0,
      estimateThu: dbActivity.estimate_thu ?? 1.0,
      estimateFri: dbActivity.estimate_fri ?? 1.0,
      estimateSat: dbActivity.estimate_sat ?? 0.0,
      estimateSun: dbActivity.estimate_sun ?? 0.0,
      createdAt: dbActivity.created_at,
      updatedAt: dbActivity.updated_at
    }
  }

  /**
   * Transform database timer to frontend ActivityTimer type
   */
  function transformTimer(dbTimer: DbActivityTimer): ActivityTimer {
    return {
      id: dbTimer.id,
      userId: dbTimer.user_id,
      activityId: dbTimer.activity_id,
      status: dbTimer.status as TimerStatus,
      todaySeconds: dbTimer.today_seconds ?? 0,
      allTimeSeconds: dbTimer.all_time_seconds ?? 0,
      lastStartedAt: dbTimer.last_started_at,
      lastStoppedAt: dbTimer.last_stopped_at,
      autoPauseAt: dbTimer.auto_pause_at,
      isCompleted: dbTimer.is_completed ?? false,
      completedAt: dbTimer.completed_at,
      expiresAt: dbTimer.expires_at,
      createdAt: dbTimer.created_at,
      updatedAt: dbTimer.updated_at
    }
  }

  /**
   * Fetch all activities with their timers for the current user
   * @param userId - Optional user ID to use (if not provided, uses stored currentUserId)
   */
  async function fetchActivities(userId?: string) {
    const effectiveUserId = userId || currentUserId.value || user.value?.id
    
    if (!effectiveUserId) {
      activities.value = []
      return
    }

    // Skip fetch when offline — keep existing cached state instead of failing
    const connState = useState<string>('connection-state')
    if (connState.value === 'offline' && activities.value.length > 0) {
      return
    }
    
    // Store the user ID for future operations
    currentUserId.value = effectiveUserId

    // Only show loading spinner on initial load (when activities array is empty)
    // For refreshes, use isRefreshing to avoid flash
    const isInitialLoad = activities.value.length === 0
    if (isInitialLoad) {
      isLoading.value = true
    } else {
      isRefreshing.value = true
    }
    error.value = null

    try {
      const { data: activityData, error: activityError } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('is_archived', false)
        .order('sort_order', { ascending: true })

      if (activityError) throw activityError

      const { data: timerData, error: timerError } = await supabase
        .from('activity_timers')
        .select('*')
        .eq('user_id', effectiveUserId)

      if (timerError) throw timerError

      // Guard against RLS-empty results: after a wrapper client reset, the fresh
      // client's auth may not be recognized by Supabase RLS, which returns []
      // instead of an error. If we have cached activities but the fetch returned
      // nothing, keep the cached data rather than wiping the UI.
      const fetchedActivities = (activityData as DbActivity[]) || []
      if (fetchedActivities.length === 0 && activities.value.length > 0) {
        console.warn('[fetchActivities] Server returned 0 activities but we have', activities.value.length, 'cached — keeping cache')
        return
      }

      // Create a map of timers by activity_id for quick lookup
      const timerMap = new Map<string, DbActivityTimer>()
      for (const timer of (timerData as DbActivityTimer[]) || []) {
        timerMap.set(timer.activity_id, timer)
      }

      // Combine activities with their timers, filtering out expired non-recurring
      activities.value = fetchedActivities
        .map(dbActivity => {
          const activity = transformActivity(dbActivity)
          const dbTimer = timerMap.get(dbActivity.id)

          // Create a default timer if one doesn't exist
          const timer: ActivityTimer = dbTimer
            ? transformTimer(dbTimer)
            : {
                id: '',
                userId: effectiveUserId,
                activityId: activity.id,
                status: 'idle',
                todaySeconds: 0,
                allTimeSeconds: 0,
                lastStartedAt: null,
                lastStoppedAt: null,
                autoPauseAt: null,
                isCompleted: false,
                completedAt: null,
                expiresAt: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }

          return { ...activity, timer }
        })
        .filter(activity => {
          // Hide expired non-recurring activities
          if (!activity.autoRepeat && activity.timer.isCompleted && activity.timer.expiresAt) {
            return new Date(activity.timer.expiresAt) > new Date()
          }
          return true
        })

      // Schedule auto-pause if there's a running timer
      if (import.meta.client) {
        scheduleAutoPause()
      }
    } catch (e) {
      console.error('Error fetching activities:', e)
      // Only show error and clear activities on initial load (no cached data).
      // During reconnection, keep showing cached activities instead of
      // flashing "No activities yet" from a transient auth/network failure.
      if (activities.value.length === 0) {
        error.value = e instanceof Error ? e.message : 'Failed to fetch activities'
      } else {
        console.warn('[fetchActivities] Keeping cached activities after transient error')
      }
    } finally {
      isLoading.value = false
      isRefreshing.value = false
    }
  }

  /**
   * Wraps a Supabase RPC call with a timeout so it fails loudly
   * instead of hanging forever when the Supabase client is in a bad state
   * (e.g. navigator.locks deadlock during token refresh).
   *
   * On the first timeout it attempts to recover by refreshing the auth
   * session and retrying once. If the retry also times out it gives up.
   */
  async function rpcWithTimeout<T>(
    rpcName: string,
    params: Record<string, unknown>,
    timeoutMs = 15_000
  ): Promise<{ data: T | null; error: any }> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const result = await Promise.race([
          supabase.rpc(rpcName, params),
          new Promise<never>((_, reject) => {
            controller.signal.addEventListener('abort', () =>
              reject(new Error(`RPC '${rpcName}' timed out after ${timeoutMs / 1000}s`))
            )
          })
        ])
        return result as { data: T | null; error: any }
      } catch (e) {
        if (attempt === 0 && e instanceof Error && e.message.includes('timed out')) {
          console.warn(`[rpcWithTimeout] ${rpcName} timed out — attempting session recovery and retry…`)
          try {
            await Promise.race([
              supabase.auth.refreshSession(),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error('refreshSession timed out')), 5_000))
            ])
            console.log('[rpcWithTimeout] Session refreshed, retrying RPC…')
          } catch {
            console.warn('[rpcWithTimeout] Session refresh also failed — giving up')
            throw new Error(`RPC '${rpcName}' timed out and session recovery failed — please refresh the page`)
          }
          continue
        }
        throw e
      } finally {
        clearTimeout(timer)
      }
    }
    throw new Error(`RPC '${rpcName}' failed after retry — please refresh the page`)
  }

  /**
   * Apply optimistic start: stop any running timer and mark this one as running.
   * Reassigns activities.value to trigger shallowRef reactivity (Nuxt useState).
   */
  function applyOptimisticStart(timerId: string, startedAt: string) {
    activities.value = activities.value.map(a => {
      if (a.timer.id === timerId) {
        return { ...a, timer: { ...a.timer, status: 'running' as TimerStatus, lastStartedAt: startedAt } }
      }
      if (a.timer.status === 'running') {
        return { ...a, timer: { ...a.timer, status: 'idle' as TimerStatus } }
      }
      return a
    })
    console.log('[applyOptimisticStart]', timerId, '→ running, lastStartedAt:', startedAt)
  }

  /**
   * Start a timer for the given activity.
   * Uses the start_activity RPC which will stop any other running timer first.
   * When offline, queues the action and applies an optimistic UI update.
   * The real start timestamp is captured immediately and passed to the server
   * (either directly or via the offline queue) so offline time is preserved.
   */
  async function startTimer(timerId: string) {
    error.value = null
    const connState = useState<string>('connection-state')
    const { enqueue } = useOfflineQueue()

    // Capture the real start time now — this is the canonical moment the user
    // clicked Start, regardless of when the RPC actually reaches the server.
    const startedAtISO = new Date().toISOString()

    const effectivelyOffline = connState.value !== 'online' ||
      (import.meta.client && !navigator.onLine)

    if (effectivelyOffline) {
      console.log('[startTimer] Offline — queuing start for', timerId)
      enqueue('START_ACTIVITY', { timerId, startedAt: startedAtISO })
      applyOptimisticStart(timerId, startedAtISO)
      return
    }

    // Apply optimistic UI immediately so the timer starts ticking in the UI
    // while the RPC runs in the background. On success, fetchActivities
    // overwrites with authoritative server state.
    applyOptimisticStart(timerId, startedAtISO)

    try {
      console.log('[startTimer] Starting timer:', timerId)
      const { error: rpcError } = await rpcWithTimeout('start_activity', {
        p_timer_id: timerId,
        p_started_at: startedAtISO
      })

      if (rpcError) throw rpcError

      await fetchActivities()
    } catch (e: any) {
      const isNetworkError = e?.message?.includes('Failed to fetch') || e?.code === '' ||
                             e?.message?.includes('timed out')
      if (isNetworkError) {
        console.log('[startTimer] Network/timeout error — falling back to offline queue for', timerId)
        enqueue('START_ACTIVITY', { timerId, startedAt: startedAtISO })
      } else {
        console.error('Error starting timer:', e)
        error.value = e instanceof Error ? e.message : 'Failed to start timer'
      }
    }
  }

  /**
   * Apply optimistic stop: accumulate elapsed time and set status to idle.
   * Reassigns activities.value to trigger shallowRef reactivity (Nuxt useState).
   */
  function applyOptimisticStop(timerId: string) {
    activities.value = activities.value.map(a => {
      if (a.timer.id === timerId && a.timer.lastStartedAt) {
        const elapsed = Math.floor((Date.now() - new Date(a.timer.lastStartedAt).getTime()) / 1000)
        return {
          ...a,
          timer: {
            ...a.timer,
            todaySeconds: a.timer.todaySeconds + Math.max(0, elapsed),
            allTimeSeconds: a.timer.allTimeSeconds + Math.max(0, elapsed),
            status: 'idle' as TimerStatus,
            lastStartedAt: null
          }
        }
      }
      return a
    })
  }

  /**
   * Stop a timer for the given activity.
   * When offline, queues the action and applies an optimistic UI update.
   */
  async function stopTimer(timerId: string) {
    error.value = null
    const connState = useState<string>('connection-state')
    const { enqueue } = useOfflineQueue()
    
    // Clear auto-pause timer when stopping
    clearAutoPause()

    // Capture the exact stop time so offline replay uses the real moment, not reconnection time
    const stoppedAtISO = new Date().toISOString()

    const effectivelyOffline = connState.value !== 'online' ||
      (import.meta.client && !navigator.onLine)

    if (effectivelyOffline) {
      console.log('[stopTimer] Not online — queuing stop for', timerId)
      enqueue('STOP_ACTIVITY', { timerId, stoppedAt: stoppedAtISO })
      applyOptimisticStop(timerId)
      return
    }

    // Apply optimistic UI immediately so the display updates while RPC runs
    applyOptimisticStop(timerId)

    try {
      console.log('[stopTimer] Stopping timer:', timerId)
      const { error: rpcError } = await rpcWithTimeout('stop_activity', {
        p_timer_id: timerId,
        p_stopped_at: stoppedAtISO
      })

      if (rpcError) throw rpcError

      await fetchActivities()
    } catch (e: any) {
      const isNetworkError = e?.message?.includes('Failed to fetch') || e?.code === '' ||
                             e?.message?.includes('timed out')
      if (isNetworkError) {
        console.log('[stopTimer] Network/timeout error — falling back to offline queue for', timerId)
        enqueue('STOP_ACTIVITY', { timerId, stoppedAt: stoppedAtISO })
      } else {
        console.error('Error stopping timer:', e)
        error.value = e instanceof Error ? e.message : 'Failed to stop timer'
      }
    }
  }

  /**
   * Toggle a timer - start if stopped, stop if running
   */
  async function toggleTimer(activity: ActivityWithTimer) {
    if (activity.timer.status === 'running') {
      await stopTimer(activity.timer.id)
    } else {
      await startTimer(activity.timer.id)
    }
  }

  /**
   * Check if connection is online; if offline, show toast and return false
   */
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
   * Toggle activity completion (check-off)
   * For recurring activities: marks complete, auto-unchecks at next rollover
   * For non-recurring activities: marks complete with expiration at next 3 AM
   */
  async function toggleActivityComplete(activity: ActivityWithTimer) {
    if (!requireOnline('Toggling completion')) return
    if (!activity.timer.id) {
      console.error('No timer ID for activity:', activity.name)
      return
    }

    error.value = null

    try {
      const { error: rpcError } = await supabase
        .rpc('toggle_activity_complete', { p_timer_id: activity.timer.id })

      if (rpcError) throw rpcError

      // Refresh activities to get updated state
      await fetchActivities()
    } catch (e) {
      console.error('Error toggling activity completion:', e)
      error.value = e instanceof Error ? e.message : 'Failed to toggle activity completion'
    }
  }

  /**
   * Activity creation options
   */
  interface CreateActivityOptions {
    name: string
    activityType: 'rewardable' | 'non_rewardable' | 'wasted'
    description?: string
    autoRepeat?: boolean
    estimateType?: EstimateType
    generalEstimateHours?: number
    estimateMon?: number
    estimateTue?: number
    estimateWed?: number
    estimateThu?: number
    estimateFri?: number
    estimateSat?: number
    estimateSun?: number
  }

  /**
   * Create a new activity with its timer
   */
  async function createActivity(
    nameOrOptions: string | CreateActivityOptions,
    activityType?: 'rewardable' | 'non_rewardable' | 'wasted'
  ) {
    if (!requireOnline('Creating activities')) return null

    // Support both old signature (name, type) and new signature (options object)
    const options: CreateActivityOptions = typeof nameOrOptions === 'string'
      ? { name: nameOrOptions, activityType: activityType! }
      : nameOrOptions

    const userId = currentUserId.value
    if (!userId) {
      error.value = 'Not authenticated'
      return null
    }

    error.value = null

    try {
      // Get the next sort order
      const maxSortOrder = activities.value.reduce((max, a) => Math.max(max, a.sortOrder), 0)

      // Create the activity with all fields
      const insertData: Record<string, unknown> = {
        user_id: userId,
        name: options.name.trim(),
        activity_type: options.activityType,
        sort_order: maxSortOrder + 1,
        is_archived: false
      }

      // Add optional fields if provided
      if (options.description !== undefined) insertData.description = options.description
      if (options.autoRepeat !== undefined) insertData.auto_repeat = options.autoRepeat
      if (options.estimateType !== undefined) insertData.estimate_type = options.estimateType
      if (options.generalEstimateHours !== undefined) insertData.general_estimate_hours = options.generalEstimateHours
      if (options.estimateMon !== undefined) insertData.estimate_mon = options.estimateMon
      if (options.estimateTue !== undefined) insertData.estimate_tue = options.estimateTue
      if (options.estimateWed !== undefined) insertData.estimate_wed = options.estimateWed
      if (options.estimateThu !== undefined) insertData.estimate_thu = options.estimateThu
      if (options.estimateFri !== undefined) insertData.estimate_fri = options.estimateFri
      if (options.estimateSat !== undefined) insertData.estimate_sat = options.estimateSat
      if (options.estimateSun !== undefined) insertData.estimate_sun = options.estimateSun

      const { data: activityData, error: activityError } = await supabase
        .from('activities')
        .insert(insertData)
        .select()
        .single()

      if (activityError) throw activityError

      // Create the timer for this activity
      const { error: timerError } = await supabase
        .from('activity_timers')
        .insert({
          user_id: userId,
          activity_id: activityData.id,
          status: 'idle',
          today_seconds: 0,
          all_time_seconds: 0
        })

      if (timerError) throw timerError

      // Refresh activities to get the new one
      await fetchActivities()

      return activityData
    } catch (e) {
      console.error('Error creating activity:', e)
      error.value = e instanceof Error ? e.message : 'Failed to create activity'
      return null
    }
  }

  /**
   * Activity update options
   */
  interface UpdateActivityOptions {
    name?: string
    activityType?: 'rewardable' | 'non_rewardable' | 'wasted'
    description?: string
    autoRepeat?: boolean
    estimateType?: EstimateType
    generalEstimateHours?: number
    estimateMon?: number
    estimateTue?: number
    estimateWed?: number
    estimateThu?: number
    estimateFri?: number
    estimateSat?: number
    estimateSun?: number
  }

  /**
   * Update an existing activity
   */
  async function updateActivity(activityId: string, updates: UpdateActivityOptions): Promise<boolean> {
    if (!requireOnline('Editing activities')) return false
    error.value = null

    try {
      const updateData: Record<string, unknown> = {}
      if (updates.name !== undefined) updateData.name = updates.name.trim()
      if (updates.activityType !== undefined) updateData.activity_type = updates.activityType
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.autoRepeat !== undefined) updateData.auto_repeat = updates.autoRepeat
      if (updates.estimateType !== undefined) updateData.estimate_type = updates.estimateType
      if (updates.generalEstimateHours !== undefined) updateData.general_estimate_hours = updates.generalEstimateHours
      if (updates.estimateMon !== undefined) updateData.estimate_mon = updates.estimateMon
      if (updates.estimateTue !== undefined) updateData.estimate_tue = updates.estimateTue
      if (updates.estimateWed !== undefined) updateData.estimate_wed = updates.estimateWed
      if (updates.estimateThu !== undefined) updateData.estimate_thu = updates.estimateThu
      if (updates.estimateFri !== undefined) updateData.estimate_fri = updates.estimateFri
      if (updates.estimateSat !== undefined) updateData.estimate_sat = updates.estimateSat
      if (updates.estimateSun !== undefined) updateData.estimate_sun = updates.estimateSun

      const { error: updateError } = await supabase
        .from('activities')
        .update(updateData)
        .eq('id', activityId)

      if (updateError) throw updateError

      await fetchActivities()
      return true
    } catch (e) {
      console.error('Error updating activity:', e)
      error.value = e instanceof Error ? e.message : 'Failed to update activity'
      return false
    }
  }

  /**
   * Archive an activity (soft delete)
   */
  async function archiveActivity(activityId: string) {
    if (!requireOnline('Deleting activities')) return
    error.value = null

    try {
      const { error: archiveError } = await supabase
        .from('activities')
        .update({ is_archived: true })
        .eq('id', activityId)

      if (archiveError) throw archiveError

      // Refresh activities to remove the archived one
      await fetchActivities()
    } catch (e) {
      console.error('Error archiving activity:', e)
      error.value = e instanceof Error ? e.message : 'Failed to archive activity'
    }
  }

  /**
   * Unarchive an activity (restore from soft delete)
   */
  async function unarchiveActivity(activityId: string) {
    if (!requireOnline('Restoring activities')) return
    error.value = null

    try {
      const { error: unarchiveError } = await supabase
        .from('activities')
        .update({ is_archived: false })
        .eq('id', activityId)

      if (unarchiveError) throw unarchiveError

      // Refresh activities to include the restored one
      await fetchActivities()
      // Also refresh archived list
      await fetchArchivedActivities()
    } catch (e) {
      console.error('Error unarchiving activity:', e)
      error.value = e instanceof Error ? e.message : 'Failed to restore activity'
    }
  }

  // Archived activities state
  const archivedActivities = useState<ActivityWithTimer[]>('archived-activities', () => [])

  /**
   * Fetch archived activities for the current user
   */
  async function fetchArchivedActivities() {
    const effectiveUserId = currentUserId.value
    
    if (!effectiveUserId) {
      archivedActivities.value = []
      return
    }

    try {
      // Fetch archived activities
      const { data: activityData, error: activityError } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('is_archived', true)
        .order('updated_at', { ascending: false })

      if (activityError) throw activityError

      // Fetch timers for these activities
      const { data: timerData, error: timerError } = await supabase
        .from('activity_timers')
        .select('*')
        .eq('user_id', effectiveUserId)

      if (timerError) throw timerError

      // Create a map of timers by activity_id for quick lookup
      const timerMap = new Map<string, DbActivityTimer>()
      for (const timer of (timerData as DbActivityTimer[]) || []) {
        timerMap.set(timer.activity_id, timer)
      }

      // Combine activities with their timers
      archivedActivities.value = (activityData as DbActivity[] || []).map(dbActivity => {
        const activity = transformActivity(dbActivity)
        const dbTimer = timerMap.get(dbActivity.id)

        // Create a default timer if one doesn't exist
        const timer: ActivityTimer = dbTimer
          ? transformTimer(dbTimer)
          : {
              id: '',
              userId: effectiveUserId,
              activityId: activity.id,
              status: 'idle',
              todaySeconds: 0,
              allTimeSeconds: 0,
              lastStartedAt: null,
              lastStoppedAt: null,
              autoPauseAt: null,
              isCompleted: false,
              completedAt: null,
              expiresAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }

        return { ...activity, timer }
      })
    } catch (e) {
      console.error('Error fetching archived activities:', e)
    }
  }

  /**
   * Delete an activity (soft delete - archives it)
   * Uses archiveActivity under the hood for Realtime sync compatibility
   */
  async function deleteActivity(activityId: string) {
    // Use soft delete (archive) instead of hard delete
    // This ensures Realtime UPDATE events fire and sync across browsers
    await archiveActivity(activityId)
  }

  // Track the realtime subscription channel
  const realtimeChannel = useState<ReturnType<typeof supabase.channel> | null>('activities-realtime-channel', () => null)

  // Guard: only register onAuthStateChange once across all instances of this composable
  const _authListenerRegistered = useState<boolean>('activities-auth-listener-registered', () => false)

  /**
   * Update a single timer in the activities array without refetching everything
   */
  function updateTimerInPlace(dbTimer: DbActivityTimer) {
    const index = activities.value.findIndex(a => a.timer.id === dbTimer.id)
    if (index !== -1) {
      // Create a new array to trigger reactivity
      const updated = [...activities.value]
      updated[index] = {
        ...updated[index],
        timer: transformTimer(dbTimer)
      }
      activities.value = updated
    }
  }

  /**
   * Set up Supabase Realtime subscription for activity_timers
   * This enables multi-browser sync.
   * Should only be called on SIGNED_IN / INITIAL_SESSION, not on TOKEN_REFRESHED.
   */
  async function setupRealtimeSubscription(userId: string) {
    // Clean up existing subscription if any
    if (realtimeChannel.value) {
      supabase.removeChannel(realtimeChannel.value)
      realtimeChannel.value = null
    }

    const channel = supabase
      .channel(`activity-timers-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_timers',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('[Realtime] Timer change received:', payload.eventType)
          
          if (payload.eventType === 'UPDATE') {
            updateTimerInPlace(payload.new as DbActivityTimer)
            const newStatus = (payload.new as DbActivityTimer).status
            if (newStatus === 'running' || newStatus === 'auto_paused' || newStatus === 'paused' || newStatus === 'idle') {
              scheduleAutoPause()
            }
          } else {
            fetchActivities(userId)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          console.log('[Realtime] Activity INSERT received:', payload.new)
          await fetchActivities(userId)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'activities',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          console.log('[Realtime] Activity UPDATE received:', payload.new)
          await fetchActivities(userId)
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status)
      })

    realtimeChannel.value = channel

    await fetchUserSettings()
  }

  /**
   * Clean up the realtime subscription
   */
  function cleanupRealtimeSubscription() {
    if (realtimeChannel.value) {
      supabase.removeChannel(realtimeChannel.value)
      realtimeChannel.value = null
    }
  }

  /**
   * Get the current effective cumulative seconds for AutoPause calculation.
   * Useful for the settings page to determine if a new threshold has been exceeded.
   */
  function getEffectiveAutoPauseCumulative(): number {
    const total = activities.value.reduce((sum, activity) => {
      let seconds = activity.timer.todaySeconds
      if (activity.timer.status === 'running' && activity.timer.lastStartedAt) {
        const startTime = new Date(activity.timer.lastStartedAt).getTime()
        seconds += Math.floor((Date.now() - startTime) / 1000)
      }
      return sum + seconds
    }, 0)
    return Math.max(0, total - autoPauseCumulativeBase.value)
  }

  // Watch autoPauseMinutes so the scheduled timeout is updated when the setting changes (PRD 4.1.3 Case 2)
  if (import.meta.client) {
    watch(autoPauseMinutes, () => {
      if (runningActivity.value) {
        scheduleAutoPause()
      }
    })
  }

  // Only fetch activities on the client side after hydration
  // SSR doesn't have access to the auth session
  if (import.meta.client) {
    // Initialize clock synchronization
    initClockSync()
    
    // Initialize daily rollover with callback to refresh activities and reset AutoPause base
    initDailyRollover(async () => {
      const userId = currentUserId.value
      if (userId) {
        await updateSetting('autoPauseCumulativeBase', 0)
        await fetchActivities(userId)
      }
    })
    
    // Register onAuthStateChange ONCE across all composable instances.
    // TOKEN_REFRESHED fires roughly every hour; we must NOT tear down
    // the Realtime channel on each refresh — only re-fetch activities.
    if (!_authListenerRegistered.value) {
      _authListenerRegistered.value = true

      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[Auth] State change:', event)

        if (event === 'SIGNED_OUT') {
          activities.value = []
          currentUserId.value = null
          cleanupRealtimeSubscription()
          return
        }

        if (session?.user?.id) {
          await fetchActivities(session.user.id)

          // Build the Realtime channel once. INITIAL_SESSION fires first,
          // then SIGNED_IN follows immediately on page load — skip the
          // second one to avoid tearing down a perfectly good channel.
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && !realtimeChannel.value) {
            setupRealtimeSubscription(session.user.id)
          }
        }
      })
    }
    
    // Also check if user is already available (for hot reload scenarios)
    if (user.value?.id) {
      fetchActivities(user.value.id)
      if (!realtimeChannel.value) {
        setupRealtimeSubscription(user.value.id)
      }
    }
  }

  return {
    activities: readonly(activities),
    archivedActivities: readonly(archivedActivities),
    isLoading: readonly(isLoading),
    isRefreshing: readonly(isRefreshing),
    error: readonly(error),
    runningActivity,
    todaysTotals,
    effectiveRewardableSeconds,
    isAutoPaused: readonly(isAutoPaused),
    autoPausedAfterSeconds: readonly(autoPausedAfterSeconds),
    autoPauseCumulativeBase,
    autoPauseMinutes,
    fetchActivities,
    fetchArchivedActivities,
    startTimer,
    stopTimer,
    toggleTimer,
    toggleActivityComplete,
    createActivity,
    updateActivity,
    archiveActivity,
    unarchiveActivity,
    deleteActivity,
    clearAutoPause,
    clearError: () => { error.value = null },
    requireOnline,
    getEffectiveAutoPauseCumulative,
    triggerAutoPause,
    scheduleAutoPause,
    // Clock sync
    getServerTime,
    isSynced,
    // Daily rollover
    lastResetDate
  }
}
