import type { QueuedCommand, CommandType } from '~/types/offline-queue'

const QUEUE_STORAGE_KEY = 'offline-command-queue'
const MAX_RETRIES = 3
const MAX_QUEUE_SIZE = 20
const STALE_THRESHOLD_MS = 60 * 60 * 1000 // 1 hour
const BACKOFF_BASE_MS = 2000

function commandDescription(cmd: QueuedCommand): string {
  switch (cmd.type) {
    case 'START_ACTIVITY': return 'Start activity'
    case 'STOP_ACTIVITY': return 'Stop activity'
    case 'AUTO_PAUSE_ACTIVITY': return 'Auto-pause activity'
    default: return cmd.type
  }
}

export function useOfflineQueue() {
  const queue = useLocalStorage<QueuedCommand[]>(QUEUE_STORAGE_KEY, [])
  const isProcessing = useState<boolean>('offline-queue-processing', () => false)
  const connectionState = useState<string>('connection-state')

  function enqueue(type: CommandType, payload: Record<string, unknown>): boolean {
    if (queue.value.length >= MAX_QUEUE_SIZE) {
      const toast = useState<string>('connection-toast')
      const toastType = useState<string>('connection-toast-type')
      toast.value = 'Too many queued actions. Please reconnect.'
      toastType.value = 'error'
      setTimeout(() => { toast.value = '' }, 5000)
      return false
    }

    const timerId = payload.timerId as string | undefined

    if (timerId) {
      // Deduplication: don't queue duplicate START for same timer
      if (type === 'START_ACTIVITY') {
        const existingStart = queue.value.find(
          c => c.type === 'START_ACTIVITY' && c.payload.timerId === timerId
        )
        if (existingStart) {
          console.log('[OfflineQueue] Duplicate START for same timer — skipping')
          return false
        }
      }

      // Deduplication: don't queue duplicate STOP for same timer
      if (type === 'STOP_ACTIVITY') {
        const existingStop = queue.value.find(
          c => c.type === 'STOP_ACTIVITY' && c.payload.timerId === timerId
        )
        if (existingStop) {
          console.log('[OfflineQueue] Duplicate STOP for same timer — skipping')
          return false
        }
      }

      // Deduplication: don't queue duplicate AUTO_PAUSE for same timer
      if (type === 'AUTO_PAUSE_ACTIVITY') {
        const existing = queue.value.find(
          c => c.type === 'AUTO_PAUSE_ACTIVITY' && c.payload.timerId === timerId
        )
        if (existing) {
          console.log('[OfflineQueue] Duplicate AUTO_PAUSE for same timer — skipping')
          return false
        }
      }
    }

    const command: QueuedCommand = {
      id: crypto.randomUUID(),
      type,
      payload,
      queuedAt: Date.now(),
      retryCount: 0
    }
    queue.value.push(command)
    console.log(`[OfflineQueue] Enqueued: ${type}`, payload)
    return true
  }

  function discardStaleCommands() {
    const now = Date.now()
    const before = queue.value.length
    queue.value = queue.value.filter(c => (now - c.queuedAt) < STALE_THRESHOLD_MS)
    const discarded = before - queue.value.length
    if (discarded > 0) {
      console.log(`[OfflineQueue] Discarded ${discarded} stale command(s)`)
    }
  }

  async function processQueue() {
    if (isProcessing.value || queue.value.length === 0 || connectionState.value !== 'online') {
      return
    }

    isProcessing.value = true
    discardStaleCommands()

    if (queue.value.length === 0) {
      isProcessing.value = false
      return
    }

    console.log(`[OfflineQueue] Processing ${queue.value.length} commands...`)

    const commandsToProcess = [...queue.value]
    let successCount = 0
    let failCount = 0

    for (const command of commandsToProcess) {
      let succeeded = false

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            const delay = BACKOFF_BASE_MS * Math.pow(2, attempt - 1)
            await new Promise(resolve => setTimeout(resolve, delay))
          }

          await executeCommand(command)
          queue.value = queue.value.filter(c => c.id !== command.id)
          successCount++
          succeeded = true
          break
        } catch (error) {
          console.error(`[OfflineQueue] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed for ${command.type}:`, error)
        }
      }

      if (!succeeded) {
        queue.value = queue.value.filter(c => c.id !== command.id)
        failCount++
        const toast = useState<string>('connection-toast')
        const toastType = useState<string>('connection-toast-type')
        toast.value = `Failed to sync: ${commandDescription(command)}`
        toastType.value = 'error'
        setTimeout(() => { toast.value = '' }, 5000)
      }
    }

    if (successCount > 0) {
      const toast = useState<string>('connection-toast')
      const toastType = useState<string>('connection-toast-type')
      toast.value = `${successCount} queued action(s) synced`
      toastType.value = 'success'
      setTimeout(() => { toast.value = '' }, 3000)
    }

    isProcessing.value = false
  }

  const EXECUTE_TIMEOUT_MS = 10_000

  async function rpcWithTimeout(
    supabase: ReturnType<typeof useHealthySupabaseClient>,
    rpcName: string,
    params: Record<string, unknown>
  ) {
    const result = await Promise.race([
      supabase.rpc(rpcName, params),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Offline queue RPC '${rpcName}' timed out`)), EXECUTE_TIMEOUT_MS)
      )
    ]) as { error: any }
    if (result.error) throw result.error
  }

  async function executeCommand(command: QueuedCommand) {
    const supabase = useHealthySupabaseClient()

    switch (command.type) {
      case 'START_ACTIVITY': {
        const startParams: Record<string, unknown> = {
          p_timer_id: command.payload.timerId as string
        }
        if (command.payload.startedAt) {
          startParams.p_started_at = command.payload.startedAt as string
        }
        await rpcWithTimeout(supabase, 'start_activity', startParams)
        break
      }

      case 'STOP_ACTIVITY': {
        const stopParams: Record<string, unknown> = {
          p_timer_id: command.payload.timerId as string
        }
        if (command.payload.stoppedAt) {
          stopParams.p_stopped_at = command.payload.stoppedAt as string
        }
        await rpcWithTimeout(supabase, 'stop_activity', stopParams)
        break
      }

      case 'AUTO_PAUSE_ACTIVITY': {
        const rpcParams: Record<string, unknown> = {
          p_timer_id: command.payload.timerId as string
        }
        if (command.payload.pausedAt) {
          rpcParams.p_paused_at = command.payload.pausedAt as string
        }
        await rpcWithTimeout(supabase, 'auto_pause_activity', rpcParams)
        break
      }

      default:
        console.warn(`[OfflineQueue] Unknown command type: ${command.type}`)
    }
  }

  function clearQueue() {
    queue.value = []
  }

  function getQueueSize() {
    return queue.value.length
  }

  // Queue processing is handled by refreshAllState() in useConnectionStatus.ts,
  // which is called on SUBSCRIBED (reconnection) and visibilitychange (tab foreground).
  // A standalone watcher here would race with refreshAllState's health-check/reset
  // cycle, causing the queue to process against the old hung client before the
  // wrapper can replace it with a fresh, authenticated instance.

  return {
    queue: readonly(queue),
    isProcessing: readonly(isProcessing),
    enqueue,
    processQueue,
    clearQueue,
    getQueueSize
  }
}
