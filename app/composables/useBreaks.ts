import type { UserBreak, BreakProgress } from '~/types/rewards'

interface DbUserBreak {
  id: string
  user_id: string
  name: string
  goal_minutes: number
  break_duration_minutes: number | null  // null = open-ended break
  progress_seconds: number
  baseline_seconds: number
  completed_at: string | null
  is_recurring: boolean
  activated_today: boolean
  last_start: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

/**
 * Composable for managing earned breaks
 */
export function useBreaks() {
  const supabase = useHealthySupabaseClient()
  const user = useSupabaseUser()

  const breaks = useState<UserBreak[]>('user-breaks', () => [])
  const isLoading = useState<boolean>('breaks-loading', () => false)
  const error = useState<string | null>('breaks-error', () => null)
  // Store the current user ID for reliable access in create/update operations
  const currentUserId = useState<string | null>('breaks-user-id', () => null)
  
  // Active break state - tracks the currently active (being taken) break
  const activeBreak = useState<UserBreak | null>('active-break', () => null)
  const breakStartedAt = useState<number | null>('break-started-at', () => null)
  // Flag to show "Break over" status after break ends
  const breakJustEnded = useState<boolean>('break-just-ended', () => false)

  /**
   * Transform database break to frontend type
   */
  function transformBreak(dbBreak: DbUserBreak): UserBreak {
    return {
      id: dbBreak.id,
      userId: dbBreak.user_id,
      name: dbBreak.name,
      goalMinutes: dbBreak.goal_minutes,
      breakDurationMinutes: dbBreak.break_duration_minutes,
      progressSeconds: dbBreak.progress_seconds,
      baselineSeconds: dbBreak.baseline_seconds ?? 0,
      completedAt: dbBreak.completed_at,
      isRecurring: dbBreak.is_recurring,
      activatedToday: dbBreak.activated_today,
      lastStart: dbBreak.last_start,
      isArchived: dbBreak.is_archived,
      createdAt: dbBreak.created_at,
      updatedAt: dbBreak.updated_at
    }
  }

  /**
   * Fetch all breaks for the current user
   * @param userId - Optional user ID, defaults to user.value?.id
   */
  async function fetchBreaks(userId?: string) {
    const effectiveUserId = userId || currentUserId.value || user.value?.id
    if (!effectiveUserId) {
      breaks.value = []
      return
    }

    // Store the user ID for future operations
    currentUserId.value = effectiveUserId

    isLoading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('user_breaks')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('is_archived', false)
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError

      breaks.value = (data as DbUserBreak[] || []).map(transformBreak)
    } catch (e) {
      console.error('Error fetching breaks:', e)
      error.value = e instanceof Error ? e.message : 'Failed to fetch breaks'
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
   * Create a new break
   * @param breakDurationMinutes - Optional. If null/undefined, creates open-ended break with no countdown.
   */
  async function createBreak(
    name: string, 
    goalMinutes: number, 
    breakDurationMinutes: number | null | undefined,
    isRecurring: boolean = true,
    baselineSeconds: number = 0
  ) {
    if (!requireOnline('Creating breaks')) return null
    const userId = currentUserId.value
    if (!userId) {
      error.value = 'Not authenticated'
      return null
    }

    try {
      const { data, error: insertError } = await supabase
        .from('user_breaks')
        .insert({
          user_id: userId,
          name: name.trim(),
          goal_minutes: goalMinutes,
          break_duration_minutes: breakDurationMinutes || null,
          is_recurring: isRecurring,
          progress_seconds: 0,
          baseline_seconds: baselineSeconds
        })
        .select()
        .single()

      if (insertError) throw insertError

      await fetchBreaks()
      return data
    } catch (e) {
      console.error('Error creating break:', e)
      error.value = e instanceof Error ? e.message : 'Failed to create break'
      return null
    }
  }

  /**
   * Update break progress
   */
  async function updateBreakProgress(breakId: string, progressSeconds: number) {
    try {
      const userBreak = breaks.value.find(b => b.id === breakId)
      if (!userBreak) return

      const updates: Record<string, unknown> = {
        progress_seconds: progressSeconds
      }

      // Check if goal is reached
      const goalSeconds = userBreak.goalMinutes * 60
      if (progressSeconds >= goalSeconds && !userBreak.completedAt) {
        updates.completed_at = new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('user_breaks')
        .update(updates)
        .eq('id', breakId)

      if (updateError) throw updateError

      await fetchBreaks()
    } catch (e) {
      console.error('Error updating break progress:', e)
      error.value = e instanceof Error ? e.message : 'Failed to update break'
    }
  }

  /**
   * Activate a break (use it)
   */
  async function activateBreak(breakId: string) {
    try {
      const { error: updateError } = await supabase
        .from('user_breaks')
        .update({
          activated_today: true,
          last_start: new Date().toISOString()
        })
        .eq('id', breakId)

      if (updateError) throw updateError

      await fetchBreaks()
    } catch (e) {
      console.error('Error activating break:', e)
      error.value = e instanceof Error ? e.message : 'Failed to activate break'
    }
  }

  /**
   * Reset a recurring break (for new period)
   */
  async function resetBreak(breakId: string, baselineSeconds: number = 0) {
    try {
      const { error: updateError } = await supabase
        .from('user_breaks')
        .update({
          progress_seconds: 0,
          completed_at: null,
          activated_today: false,
          baseline_seconds: baselineSeconds
        })
        .eq('id', breakId)

      if (updateError) throw updateError

      await fetchBreaks()
    } catch (e) {
      console.error('Error resetting break:', e)
      error.value = e instanceof Error ? e.message : 'Failed to reset break'
    }
  }

  /**
   * Update a break's properties (name, goal, duration, recurring)
   */
  async function updateBreak(breakId: string, updates: Partial<Pick<UserBreak, 'name' | 'goalMinutes' | 'breakDurationMinutes' | 'isRecurring'>>): Promise<boolean> {
    if (!requireOnline('Editing breaks')) return false
    try {
      const dbUpdates: Record<string, unknown> = {}
      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.goalMinutes !== undefined) dbUpdates.goal_minutes = updates.goalMinutes
      if (updates.breakDurationMinutes !== undefined) dbUpdates.break_duration_minutes = updates.breakDurationMinutes
      if (updates.isRecurring !== undefined) dbUpdates.is_recurring = updates.isRecurring

      const { error: updateError } = await supabase
        .from('user_breaks')
        .update(dbUpdates)
        .eq('id', breakId)

      if (updateError) throw updateError

      await fetchBreaks()
      return true
    } catch (e) {
      console.error('Error updating break:', e)
      error.value = e instanceof Error ? e.message : 'Failed to update break'
      return false
    }
  }

  /**
   * Archive a break
   */
  async function archiveBreak(breakId: string) {
    if (!requireOnline('Deleting breaks')) return
    try {
      const { error: archiveError } = await supabase
        .from('user_breaks')
        .update({ is_archived: true })
        .eq('id', breakId)

      if (archiveError) throw archiveError

      await fetchBreaks()
    } catch (e) {
      console.error('Error archiving break:', e)
      error.value = e instanceof Error ? e.message : 'Failed to archive break'
    }
  }

  /**
   * Take a break - sets the active break state
   * Note: The caller (home.vue) is responsible for stopping any running activity first
   * @param breakId - The ID of the break to take
   */
  async function takeBreak(breakId: string) {
    if (!requireOnline('Taking breaks')) return
    const userBreak = breaks.value.find(b => b.id === breakId)
    if (!userBreak) {
      error.value = 'Break not found'
      return
    }

    // Set active break state
    activeBreak.value = userBreak
    breakStartedAt.value = Date.now()
    breakJustEnded.value = false

    // Update database and refresh break list
    await activateBreak(breakId)

    // Refresh activeBreak reference to match the updated breaks list
    const refreshed = breaks.value.find(b => b.id === breakId)
    if (refreshed) {
      activeBreak.value = refreshed
    }
  }

  /**
   * End the current break
   * Clears active break state and resets progress for recurring breaks
   */
  async function endBreak(currentBreakableSeconds: number = 0) {
    if (!requireOnline('Ending breaks')) return
    if (!activeBreak.value) return

    const userBreak = activeBreak.value
    const isRecurring = userBreak.isRecurring

    // Clear active break state
    activeBreak.value = null
    breakStartedAt.value = null
    breakJustEnded.value = true

    // For recurring breaks: reset progress to 0 with fresh baseline
    if (isRecurring) {
      await resetBreak(userBreak.id, currentBreakableSeconds)
    }
    // For non-recurring breaks: they remain with activated_today = true
    // and will be filtered out or hidden until next rollover
  }

  /**
   * Clear the "break just ended" flag
   * Called when user starts an activity to dismiss "Break over" status
   */
  function clearBreakEnded() {
    breakJustEnded.value = false
  }

  /**
   * Get progress for all breaks
   */
  const breakProgress = computed((): BreakProgress[] => {
    return breaks.value.map(userBreak => {
      const progressMinutes = Math.floor(userBreak.progressSeconds / 60)
      const progressPercent = Math.min(100, (progressMinutes / userBreak.goalMinutes) * 100)
      const isComplete = progressMinutes >= userBreak.goalMinutes
      
      return {
        break: userBreak,
        progressMinutes,
        goalMinutes: userBreak.goalMinutes,
        progressPercent,
        isComplete,
        earnedBreakMinutes: isComplete ? userBreak.breakDurationMinutes : 0
      }
    })
  })

  // Initialize
  if (import.meta.client) {
    // Use auth state change event - more reliable than watching user ref
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.id) {
        // Pass user ID from session to avoid timing issues with user ref
        await fetchBreaks(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        breaks.value = []
        currentUserId.value = null
      }
    })
    
    // Also check if user is already available (for hot reload scenarios)
    if (user.value?.id) {
      fetchBreaks(user.value.id)
    }
  }

  return {
    breaks: readonly(breaks),
    breakProgress,
    isLoading: readonly(isLoading),
    error: readonly(error),
    // Active break state
    activeBreak: readonly(activeBreak),
    breakStartedAt: readonly(breakStartedAt),
    breakJustEnded: readonly(breakJustEnded),
    // CRUD operations
    fetchBreaks,
    createBreak,
    updateBreak,
    updateBreakProgress,
    activateBreak,
    resetBreak,
    archiveBreak,
    // Break activation
    takeBreak,
    endBreak,
    clearBreakEnded
  }
}
