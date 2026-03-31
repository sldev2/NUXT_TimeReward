import type { WrappedSupabaseClient } from '~/plugins/supabase-wrapper.client'

export type ConnectionState = 'online' | 'offline' | 'connecting'

// Singleton guard: only one channel + visibilitychange listener across all composable instances (PRD 6.8)
const _connectionChannelRegistered = { value: false }

export function useConnectionStatus() {
  const { isOnline } = useNetwork()
  const supabase = useHealthySupabaseClient()
  
  const connectionState = useState<ConnectionState>('connection-state', () => 'connecting')
  const isRealtimeConnected = ref(false)
  const confirmedOffline = ref(false)
  let probeTimeout: ReturnType<typeof setTimeout> | null = null
  let consecutiveProbeFailures = 0

  const toastMessage = useState<string>('connection-toast', () => '')
  const toastType = useState<'success' | 'error' | 'warning'>('connection-toast-type', () => 'success')
  let toastTimeout: ReturnType<typeof setTimeout> | null = null

  function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success', durationMs = 3000) {
    toastMessage.value = message
    toastType.value = type
    if (toastTimeout) clearTimeout(toastTimeout)
    toastTimeout = setTimeout(() => { toastMessage.value = '' }, durationMs)
  }

  function dismissToast() {
    toastMessage.value = ''
    if (toastTimeout) { clearTimeout(toastTimeout); toastTimeout = null }
  }

  async function probeNetwork(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 4000)
      await fetch(`${(supabase as any).supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        signal: controller.signal
      })
      clearTimeout(timer)
      consecutiveProbeFailures = 0
      return true
    } catch {
      consecutiveProbeFailures++
      return false
    }
  }

  function updateState() {
    const previousState = connectionState.value

    if (!isOnline.value) {
      connectionState.value = 'offline'
      confirmedOffline.value = true
    } else if (isRealtimeConnected.value) {
      connectionState.value = 'online'
      confirmedOffline.value = false
      consecutiveProbeFailures = 0
    } else if (confirmedOffline.value) {
      connectionState.value = 'offline'
    } else {
      connectionState.value = 'connecting'
    }

    if (previousState !== 'online' && connectionState.value === 'online') {
      showToast('Back online', 'success', 3000)
    }
  }

  watch(isOnline, () => updateState(), { immediate: true })

  /**
   * Full state refresh on reconnection or tab foreground.
   * Processes any offline-queued commands first (so auto-pause, stop, etc. reach the server),
   * then fetches fresh state from the server.
   */
  async function refreshAllState(options?: { checkHealth?: boolean }) {
    if (import.meta.server) return
    try {
      // Health-check the Supabase client only after offline→online recovery
      // (not on every tab switch — normal tab switches don't corrupt the client)
      if (options?.checkHealth) {
        const nuxtApp = useNuxtApp()
        const wrapper = (nuxtApp as any).$supabaseHealthy as WrappedSupabaseClient | undefined
        if (wrapper) {
          const ok = await wrapper.healthCheck()
          if (!ok) {
            console.warn('[ConnectionStatus] Supabase client hung — resetting')
            await wrapper.resetFromSession()
          }
        }
      }

      const { processQueue } = useOfflineQueue()
      await processQueue()

      const { fetchActivities } = useActivities()
      await fetchActivities()
    } catch (e) {
      console.warn('[ConnectionStatus] State refresh failed:', e)
    }
  }

  onMounted(() => {
    if (_connectionChannelRegistered.value) return
    _connectionChannelRegistered.value = true

    const channel = supabase.channel('connection-status')
    
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        const wasOffline = connectionState.value !== 'online'
        isRealtimeConnected.value = true
        confirmedOffline.value = false
        consecutiveProbeFailures = 0
        if (probeTimeout) { clearTimeout(probeTimeout); probeTimeout = null }
        updateState()
        if (wasOffline) {
          refreshAllState({ checkHealth: true })
        }
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        isRealtimeConnected.value = false
        updateState()

        if (connectionState.value === 'connecting' && !confirmedOffline.value) {
          if (probeTimeout) clearTimeout(probeTimeout)
          probeTimeout = setTimeout(async () => {
            const reachable = await probeNetwork()
            if (!reachable && !isRealtimeConnected.value) {
              if (consecutiveProbeFailures >= 2) {
                confirmedOffline.value = true
                connectionState.value = 'offline'
              } else {
                probeTimeout = setTimeout(async () => {
                  const reachable2 = await probeNetwork()
                  if (!reachable2 && !isRealtimeConnected.value) {
                    confirmedOffline.value = true
                    connectionState.value = 'offline'
                  }
                }, 2000)
              }
            }
          }, 2000)
        }
      }
    })

    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return

      probeNetwork().then(async (reachable) => {
        if (reachable) {
          if (connectionState.value !== 'online') {
            isRealtimeConnected.value = true
            confirmedOffline.value = false
            updateState()
          }
          await refreshAllState()
        } else {
          confirmedOffline.value = true
          connectionState.value = 'offline'
        }
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    onUnmounted(() => {
      _connectionChannelRegistered.value = false
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (probeTimeout) clearTimeout(probeTimeout)
      if (toastTimeout) clearTimeout(toastTimeout)
    })
  })

  const statusLabel = computed(() => {
    switch (connectionState.value) {
      case 'online':
        return 'Online'
      case 'offline':
        return 'Offline'
      case 'connecting':
        return 'Reconnecting...'
    }
  })

  const statusClass = computed(() => {
    switch (connectionState.value) {
      case 'online':
        return 'connection-online'
      case 'offline':
        return 'connection-offline'
      case 'connecting':
        return 'connection-connecting'
    }
  })

  return {
    connectionState: readonly(connectionState),
    isOnline,
    isRealtimeConnected: readonly(isRealtimeConnected),
    statusLabel,
    statusClass,
    toastMessage: readonly(toastMessage),
    toastType: readonly(toastType),
    dismissToast,
    showToast,
    refreshAllState
  }
}
