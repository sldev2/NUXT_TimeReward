/**
 * Composable for synchronizing client time with server time
 * Ensures accurate timer display across different devices/browsers
 */

// Sync interval: 5 minutes
const SYNC_INTERVAL_MS = 5 * 60 * 1000

const _clockSyncInitialized = { value: false }

export function useClockSync() {
  const supabase = useHealthySupabaseClient()
  
  // Shared state across all components using this composable
  // Must be inside the composable function to access Nuxt context
  const serverTimeOffset = useState<number>('clock-sync-offset', () => 0)
  const isSynced = useState<boolean>('clock-sync-synced', () => false)
  const lastSyncTime = useState<number>('clock-sync-last', () => 0)
  
  /**
   * Synchronize with server time
   * Calculates the offset between client and server clocks
   */
  async function syncClock(): Promise<void> {
    try {
      const clientSendTime = Date.now()
      
      const { data, error } = await supabase.rpc('get_server_time')
      
      if (error) {
        console.error('[ClockSync] Failed to get server time:', error)
        return
      }
      
      const clientReceiveTime = Date.now()
      const roundTripTime = clientReceiveTime - clientSendTime
      
      // Parse server time
      const serverTime = new Date(data).getTime()
      
      // Estimate server time at midpoint of request (accounts for network latency)
      const estimatedServerTime = serverTime - (roundTripTime / 2)
      
      // Calculate offset: positive means server is ahead, negative means server is behind
      serverTimeOffset.value = estimatedServerTime - clientSendTime
      
      isSynced.value = true
      lastSyncTime.value = Date.now()
      
      console.log(`[ClockSync] Synced. Offset: ${serverTimeOffset.value}ms, RTT: ${roundTripTime}ms`)
    } catch (e) {
      console.error('[ClockSync] Error syncing clock:', e)
    }
  }
  
  /**
   * Get the current server time (client time + offset)
   */
  function getServerTime(): number {
    return Date.now() + serverTimeOffset.value
  }
  
  /**
   * Get the current server time as a Date object
   */
  function getServerDate(): Date {
    return new Date(getServerTime())
  }
  
  /**
   * Check if clock needs re-sync (more than SYNC_INTERVAL_MS since last sync)
   */
  function needsSync(): boolean {
    if (!isSynced.value) return true
    return Date.now() - lastSyncTime.value > SYNC_INTERVAL_MS
  }
  
  /**
   * Initialize clock sync - call on app startup
   * Sets up periodic re-sync
   */
  function initClockSync(): void {
    if (!import.meta.client) return
    if (_clockSyncInitialized.value) return
    _clockSyncInitialized.value = true
    
    if (needsSync()) {
      syncClock()
    }
    
    const intervalId = setInterval(() => {
      if (needsSync()) {
        syncClock()
      }
    }, SYNC_INTERVAL_MS)
    
    if (getCurrentInstance()) {
      onUnmounted(() => {
        _clockSyncInitialized.value = false
        clearInterval(intervalId)
      })
    }
  }
  
  return {
    serverTimeOffset: readonly(serverTimeOffset),
    isSynced: readonly(isSynced),
    lastSyncTime: readonly(lastSyncTime),
    syncClock,
    getServerTime,
    getServerDate,
    needsSync,
    initClockSync
  }
}
