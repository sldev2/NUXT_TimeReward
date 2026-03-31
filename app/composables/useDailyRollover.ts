/**
 * Composable for handling daily timer reset at 3 AM
 * Detects when the 3 AM boundary is crossed and triggers reset
 */

// Rollover hour: 3 AM (matches original Blazor app)
const ROLLOVER_HOUR = 3

const _dailyRolloverInitialized = { value: false }

export function useDailyRollover() {
  const supabase = useHealthySupabaseClient()
  const user = useSupabaseUser()
  const { getServerTime, getServerDate } = useClockSync()
  
  // Shared state - must be inside composable function to access Nuxt context
  const lastResetDate = useState<string | null>('daily-rollover-last-reset', () => null)
  const isResetting = useState<boolean>('daily-rollover-resetting', () => false)
  
  /**
   * Get the "rollover date" for a given timestamp
   * The rollover date is the calendar date, but shifts at 3 AM instead of midnight
   * e.g., 2:59 AM on Jan 26 is still considered Jan 25's rollover date
   */
  function getRolloverDate(timestamp: number): string {
    const date = new Date(timestamp)
    
    // If before 3 AM, use previous day
    if (date.getHours() < ROLLOVER_HOUR) {
      date.setDate(date.getDate() - 1)
    }
    
    // Return YYYY-MM-DD format
    return date.toISOString().split('T')[0]
  }
  
  /**
   * Get the current rollover date based on server time
   */
  function getCurrentRolloverDate(): string {
    return getRolloverDate(getServerTime())
  }
  
  /**
   * Initialize last reset date from localStorage or server
   */
  function initLastResetDate(): void {
    if (!import.meta.client) return
    
    // Try to load from localStorage
    const stored = localStorage.getItem('timereward-last-reset-date')
    if (stored) {
      lastResetDate.value = stored
    }
  }
  
  /**
   * Save last reset date to localStorage
   */
  function saveLastResetDate(date: string): void {
    if (!import.meta.client) return
    
    lastResetDate.value = date
    localStorage.setItem('timereward-last-reset-date', date)
  }
  
  /**
   * Check if we need to perform a daily reset
   */
  function needsReset(): boolean {
    const currentDate = getCurrentRolloverDate()
    
    // If no last reset, we need to check
    if (!lastResetDate.value) {
      return true
    }
    
    // If current rollover date is different from last reset date
    return currentDate !== lastResetDate.value
  }
  
  /**
   * Perform the daily reset
   * Calls the reset_daily_timers RPC and updates local state
   */
  async function performReset(onResetComplete?: () => Promise<void>): Promise<boolean> {
    // Get user ID (handle both .id and .sub)
    const userId = user.value?.id || (user.value as any)?.sub
    if (!userId) {
      console.log('[DailyRollover] No user ID, skipping reset')
      return false
    }
    
    if (isResetting.value) {
      console.log('[DailyRollover] Reset already in progress')
      return false
    }
    
    isResetting.value = true
    
    try {
      const currentDate = getCurrentRolloverDate()
      console.log(`[DailyRollover] Performing reset for date: ${currentDate}`)
      
      const { error } = await supabase.rpc('reset_daily_timers', {
        p_user_id: userId
      })
      
      if (error) {
        console.error('[DailyRollover] Reset failed:', error)
        return false
      }
      
      // Update last reset date
      saveLastResetDate(currentDate)
      
      console.log('[DailyRollover] Reset complete')
      
      // Call the callback to refresh activities
      if (onResetComplete) {
        await onResetComplete()
      }
      
      return true
    } catch (e) {
      console.error('[DailyRollover] Error during reset:', e)
      return false
    } finally {
      isResetting.value = false
    }
  }
  
  /**
   * Check and perform reset if needed
   * Returns true if reset was performed
   */
  async function checkAndReset(onResetComplete?: () => Promise<void>): Promise<boolean> {
    if (!needsReset()) {
      return false
    }
    
    return await performReset(onResetComplete)
  }
  
  /**
   * Get time until next 3 AM rollover in milliseconds
   */
  function getTimeUntilNextRollover(): number {
    const now = getServerDate()
    const next3AM = new Date(now)
    
    // Set to 3 AM
    next3AM.setHours(ROLLOVER_HOUR, 0, 0, 0)
    
    // If we're past 3 AM today, next rollover is tomorrow
    if (now.getHours() >= ROLLOVER_HOUR) {
      next3AM.setDate(next3AM.getDate() + 1)
    }
    
    return next3AM.getTime() - now.getTime()
  }
  
  /**
   * Initialize the rollover system
   * Sets up periodic checks and schedules next rollover
   */
  function initDailyRollover(onResetComplete?: () => Promise<void>): void {
    if (!import.meta.client) return
    if (_dailyRolloverInitialized.value) return
    _dailyRolloverInitialized.value = true
    
    initLastResetDate()
    
    checkAndReset(onResetComplete)
    
    const timeUntilNext = getTimeUntilNextRollover()
    console.log(`[DailyRollover] Next rollover in ${Math.round(timeUntilNext / 1000 / 60)} minutes`)
    
    const timeoutId = setTimeout(() => {
      checkAndReset(onResetComplete)
    }, timeUntilNext + 1000)
    
    const intervalId = setInterval(() => {
      checkAndReset(onResetComplete)
    }, 60 * 1000)
    
    if (getCurrentInstance()) {
      onUnmounted(() => {
        _dailyRolloverInitialized.value = false
        clearTimeout(timeoutId)
        clearInterval(intervalId)
      })
    }
  }
  
  return {
    lastResetDate: readonly(lastResetDate),
    isResetting: readonly(isResetting),
    ROLLOVER_HOUR,
    getRolloverDate,
    getCurrentRolloverDate,
    needsReset,
    checkAndReset,
    performReset,
    getTimeUntilNextRollover,
    initDailyRollover
  }
}
